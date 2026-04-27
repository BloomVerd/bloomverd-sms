import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { HashHelper } from '../../../shared/helpers';
import { DataSource, Repository } from 'typeorm';
import { Course } from '../../organizations/org/entities/course.entity';
import { Lecturer } from '../../organizations/org/entities/lecturer.entity';
import { Student } from '../../students/student/entities/student.entity';
import {
  CreatePreambleInput,
  CreateQuestionInput,
  CreateTestInput,
  EndTestInput,
  ListTestAttemptsFilterInput,
  StartTestInput,
  SubmitAnswerInput,
  SubmitPreambleAnswersInput,
  UpdateTestCompletionTimeInput,
} from '../../../shared/inputs';
import { In } from 'typeorm';
import { QuestionType, TestAttemptState } from '../../../shared/enums';
import { AnswerSubmission } from './entities/answer-submission.entity';
import { Preamble } from './entities/preamble.entity';
import { Question } from './entities/question.entity';
import { Test } from './entities/test.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { TestSuite } from './entities/test-suite.entity';

type TestItem =
  | { kind: 'question'; ref: CreateQuestionInput; count: 1 }
  | { kind: 'preamble'; ref: CreatePreambleInput; count: number };

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  constructor(
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(TestAttempt)
    private readonly testAttemptRepository: Repository<TestAttempt>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Preamble)
    private readonly preambleRepository: Repository<Preamble>,
    @InjectRepository(AnswerSubmission)
    private readonly answerSubmissionRepository: Repository<AnswerSubmission>,
    @InjectRepository(Lecturer)
    private readonly lecturerRepository: Repository<Lecturer>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectQueue('exam-grading-queue')
    private readonly examGradingQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  async createTest({
    lecturerEmail,
    input,
  }: {
    lecturerEmail: string;
    input: CreateTestInput;
  }): Promise<Test> {
    const lecturer = await this.lecturerRepository.findOne({
      where: { email: lecturerEmail },
      relations: ['departments'],
    });
    if (!lecturer) {
      throw new ForbiddenException('Lecturer not found');
    }

    const course = await this.courseRepository.findOne({
      where: { id: input.courseId },
      relations: ['semesters', 'semesters.class', 'semesters.class.department'],
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lecturerDeptIds = new Set(lecturer.departments.map((d) => d.id));
    const courseDeptIds = (course.semesters ?? [])
      .map((s) => s.class?.department?.id)
      .filter((id): id is string => !!id);
    if (!courseDeptIds.some((id) => lecturerDeptIds.has(id))) {
      throw new ForbiddenException(
        'Lecturer is not assigned to any department running this course',
      );
    }

    if (input.start_time >= input.end_time) {
      throw new BadRequestException('start_time must be before end_time');
    }
    if (input.total_suites < 1) {
      throw new BadRequestException('total_suites must be at least 1');
    }
    if (input.total_questions_per_suite < 1) {
      throw new BadRequestException(
        'total_questions_per_suite must be at least 1',
      );
    }
    if (
      (input.questions?.length ?? 0) === 0 &&
      (input.preambles?.length ?? 0) === 0
    ) {
      throw new BadRequestException(
        'Test must have at least one question or preamble',
      );
    }

    const hashedSecret = await HashHelper.encrypt(input.secret);

    return this.dataSource.transaction(async (manager) => {
      const test = manager.create(Test, {
        title: input.title,
        type: input.type,
        platforms: input.platforms,
        duration_minutes: input.duration_minutes,
        start_time: input.start_time,
        end_time: input.end_time,
        total_suites: input.total_suites,
        total_questions_per_suite: input.total_questions_per_suite,
        show_answer: input.show_answer ?? false,
        secret: hashedSecret,
        course,
        lecturer,
      });
      const savedTest = await manager.save(test);

      const standaloneQuestions: Question[] = [];
      for (const q of input.questions ?? []) {
        const question = manager.create(Question, {
          body: q.body,
          type: q.type,
          options: q.options ?? null,
          correct_answer: q.correct_answer ?? null,
          marks: q.marks,
          test: savedTest,
          preamble: null,
        });
        standaloneQuestions.push(await manager.save(question));
      }

      const preambles: Array<{ entity: Preamble; questions: Question[] }> = [];
      for (const p of input.preambles ?? []) {
        if ((p.questions?.length ?? 0) < 1) {
          throw new BadRequestException(
            'Each preamble must have at least one question',
          );
        }
        const preamble = manager.create(Preamble, {
          body: p.body,
          test: savedTest,
        });
        const savedPreamble = await manager.save(preamble);
        const subQuestions: Question[] = [];
        for (const q of p.questions) {
          const question = manager.create(Question, {
            body: q.body,
            type: q.type,
            options: q.options ?? null,
            correct_answer: q.correct_answer ?? null,
            marks: q.marks,
            test: savedTest,
            preamble: savedPreamble,
          });
          subQuestions.push(await manager.save(question));
        }
        preambles.push({ entity: savedPreamble, questions: subQuestions });
      }

      const items: Array<
        | { kind: 'question'; entity: Question; count: 1 }
        | {
            kind: 'preamble';
            entity: Preamble;
            questions: Question[];
            count: number;
          }
      > = [
        ...standaloneQuestions.map((q) => ({
          kind: 'question' as const,
          entity: q,
          count: 1 as const,
        })),
        ...preambles.map((p) => ({
          kind: 'preamble' as const,
          entity: p.entity,
          questions: p.questions,
          count: p.questions.length,
        })),
      ];

      for (let i = 0; i < input.total_suites; i++) {
        const shuffled = this.fisherYatesShuffle([...items]);
        const selectedQuestions: Question[] = [];
        const selectedPreambles: Preamble[] = [];
        let total = 0;
        for (const item of shuffled) {
          if (total + item.count > input.total_questions_per_suite) continue;
          if (item.kind === 'question') {
            selectedQuestions.push(item.entity);
          } else {
            selectedPreambles.push(item.entity);
          }
          total += item.count;
          if (total === input.total_questions_per_suite) break;
        }

        const suite = manager.create(TestSuite, {
          test: savedTest,
          questions: selectedQuestions,
          preambles: selectedPreambles,
        });
        await manager.save(suite);
      }

      return manager.findOneOrFail(Test, {
        where: { id: savedTest.id },
        relations: ['course', 'lecturer', 'questions', 'preambles', 'suites'],
      });
    });
  }

  async startTest({
    studentEmail,
    input,
  }: {
    studentEmail: string;
    input: StartTestInput;
  }): Promise<TestAttempt> {
    const student = await this.studentRepository.findOne({
      where: { email: studentEmail },
      relations: ['registered_courses'],
    });
    if (!student) {
      throw new ForbiddenException('Student not found');
    }

    const test = await this.testRepository.findOne({
      where: { id: input.testId },
      relations: ['suites', 'course'],
    });
    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const enrolled = student.registered_courses?.some(
      (c) => c.id === test.course?.id,
    );
    if (!enrolled) {
      throw new ForbiddenException('Student is not enrolled in this course');
    }

    const now = new Date();
    if (now < test.start_time) {
      throw new BadRequestException('Test has not started yet');
    }
    if (now > test.end_time) {
      throw new BadRequestException('Test window has closed');
    }

    const secretMatches = await HashHelper.compare(input.secret, test.secret);
    if (!secretMatches) {
      throw new ForbiddenException('Invalid test secret');
    }

    const existingAttempt = await this.testAttemptRepository.findOne({
      where: {
        test: { id: test.id },
        student: { id: student.id },
        state: TestAttemptState.ON_GOING,
      },
    });
    if (existingAttempt) {
      throw new BadRequestException(
        'Student already has an ongoing attempt for this test',
      );
    }

    if (!test.suites || test.suites.length === 0) {
      throw new BadRequestException('Test has no suites');
    }
    const suite = test.suites[Math.floor(Math.random() * test.suites.length)];

    const attempt = this.testAttemptRepository.create({
      state: TestAttemptState.ON_GOING,
      started_at: now,
      extended_minutes: 0,
      test,
      student,
      suite,
    });
    return this.testAttemptRepository.save(attempt);
  }

  async endTest({
    studentEmail,
    input,
  }: {
    studentEmail: string;
    input: EndTestInput;
  }): Promise<TestAttempt> {
    const attempt = await this.testAttemptRepository.findOne({
      where: { id: input.attemptId },
      relations: ['test', 'student', 'answers', 'answers.question'],
    });
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.student.email !== studentEmail) {
      throw new ForbiddenException('You do not own this attempt');
    }

    await this.maybeAutoEnd(attempt);
    if (attempt.state === TestAttemptState.ENDED) {
      return attempt;
    }

    attempt.state = TestAttemptState.ENDED;
    attempt.ended_at = new Date();

    let totalScore = 0;
    const nonDeterministicAnswerIds: string[] = [];
    for (const answer of attempt.answers ?? []) {
      const question = answer.question;
      const isDeterministic =
        question.type === QuestionType.OBJECTIVE ||
        (question.type === QuestionType.FILL_IN &&
          question.correct_answer !== null &&
          question.correct_answer !== undefined);

      if (isDeterministic) {
        const submitted = (answer.selected_option ?? answer.answer_text ?? '')
          .trim()
          .toLowerCase();
        const expected = (question.correct_answer ?? '').trim().toLowerCase();
        const correct = submitted.length > 0 && submitted === expected;
        answer.is_correct = correct;
        answer.marks_awarded = correct ? question.marks : 0;
        totalScore += answer.marks_awarded ?? 0;
      } else {
        nonDeterministicAnswerIds.push(answer.id);
      }
    }
    attempt.score = totalScore;

    await this.testAttemptRepository.manager.transaction(async (manager) => {
      if (attempt.answers?.length) {
        await manager.save(AnswerSubmission, attempt.answers);
      }
      await manager.save(TestAttempt, attempt);
    });

    if (attempt.test.show_answer && nonDeterministicAnswerIds.length > 0) {
      for (const id of nonDeterministicAnswerIds) {
        await this.examGradingQueue.add('grade-answer', {
          answerSubmissionId: id,
        });
      }
    }

    return attempt;
  }

  async submitAnswer({
    studentEmail,
    input,
  }: {
    studentEmail: string;
    input: SubmitAnswerInput;
  }): Promise<AnswerSubmission> {
    const attempt = await this.loadAttemptForStudent(
      input.attemptId,
      studentEmail,
    );
    await this.maybeAutoEnd(attempt);
    if (attempt.state === TestAttemptState.ENDED) {
      throw new BadRequestException('Attempt has ended');
    }

    const question = await this.questionRepository.findOne({
      where: { id: input.questionId },
      relations: ['preamble', 'test'],
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.test.id !== attempt.test.id) {
      throw new BadRequestException('Question does not belong to this attempt');
    }
    if (question.preamble) {
      throw new BadRequestException(
        'Question belongs to a preamble — use submitPreambleAnswers',
      );
    }

    return this.upsertAnswer(attempt, question, {
      selected_option: input.selected_option,
      answer_text: input.answer_text,
    });
  }

  async submitPreambleAnswers({
    studentEmail,
    input,
  }: {
    studentEmail: string;
    input: SubmitPreambleAnswersInput;
  }): Promise<AnswerSubmission[]> {
    const attempt = await this.loadAttemptForStudent(
      input.attemptId,
      studentEmail,
    );
    await this.maybeAutoEnd(attempt);
    if (attempt.state === TestAttemptState.ENDED) {
      throw new BadRequestException('Attempt has ended');
    }

    const preamble = await this.preambleRepository.findOne({
      where: { id: input.preambleId },
      relations: ['questions', 'test'],
    });
    if (!preamble) {
      throw new NotFoundException('Preamble not found');
    }
    if (preamble.test.id !== attempt.test.id) {
      throw new BadRequestException('Preamble does not belong to this attempt');
    }

    const preambleQuestionIds = new Set(preamble.questions.map((q) => q.id));
    for (const a of input.answers) {
      if (!preambleQuestionIds.has(a.questionId)) {
        throw new BadRequestException(
          `Question ${a.questionId} does not belong to preamble ${input.preambleId}`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const results: AnswerSubmission[] = [];
      for (const a of input.answers) {
        const question = preamble.questions.find((q) => q.id === a.questionId)!;
        const saved = await this.upsertAnswer(
          attempt,
          question,
          {
            selected_option: a.selected_option,
            answer_text: a.answer_text,
          },
          manager.getRepository(AnswerSubmission),
        );
        results.push(saved);
      }
      return results;
    });
  }

  async updateTestCompletionTime({
    lecturerEmail,
    input,
  }: {
    lecturerEmail: string;
    input: UpdateTestCompletionTimeInput;
  }): Promise<TestAttempt[]> {
    if (
      input.classId &&
      input.testAttemptIds &&
      input.testAttemptIds.length > 0
    ) {
      throw new BadRequestException(
        'Provide only one of classId or testAttemptIds, not both',
      );
    }
    if (input.additional_minutes <= 0) {
      throw new BadRequestException('additional_minutes must be positive');
    }

    await this.assertLecturerOwnsTest(lecturerEmail, input.testId);

    let attempts: TestAttempt[];
    if (input.testAttemptIds && input.testAttemptIds.length > 0) {
      attempts = await this.testAttemptRepository.find({
        where: {
          id: In(input.testAttemptIds),
          test: { id: input.testId },
          state: TestAttemptState.ON_GOING,
        },
      });
      if (attempts.length !== input.testAttemptIds.length) {
        throw new BadRequestException(
          'One or more attempt IDs do not match an ongoing attempt for this test',
        );
      }
    } else if (input.classId) {
      attempts = await this.testAttemptRepository.find({
        where: {
          test: { id: input.testId },
          state: TestAttemptState.ON_GOING,
          student: { class: { id: input.classId } },
        },
      });
    } else {
      attempts = await this.testAttemptRepository.find({
        where: {
          test: { id: input.testId },
          state: TestAttemptState.ON_GOING,
        },
      });
    }

    for (const a of attempts) {
      a.extended_minutes = (a.extended_minutes ?? 0) + input.additional_minutes;
    }
    await this.testAttemptRepository.save(attempts);
    return attempts;
  }

  async getTestAttempt({
    callerEmail,
    attemptId,
  }: {
    callerEmail: string;
    attemptId: string;
  }): Promise<TestAttempt> {
    const attempt = await this.testAttemptRepository.findOne({
      where: { id: attemptId },
      relations: [
        'test',
        'test.lecturer',
        'student',
        'suite',
        'answers',
        'answers.question',
      ],
    });
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const isOwner = attempt.student?.email === callerEmail;
    const isTestLecturer = attempt.test?.lecturer?.email === callerEmail;
    if (!isOwner && !isTestLecturer) {
      throw new ForbiddenException('Not authorized to view this attempt');
    }

    await this.maybeAutoEnd(attempt);
    return this.applyShowAnswerVisibility(attempt);
  }

  async listTestAttempts({
    lecturerEmail,
    filter,
  }: {
    lecturerEmail: string;
    filter: ListTestAttemptsFilterInput;
  }): Promise<TestAttempt[]> {
    await this.assertLecturerOwnsTest(lecturerEmail, filter.testId);

    const where: any = { test: { id: filter.testId } };
    if (filter.suiteId) where.suite = { id: filter.suiteId };
    if (filter.state) where.state = filter.state;

    const attempts = await this.testAttemptRepository.find({
      where,
      relations: ['test', 'student', 'suite'],
    });

    for (const a of attempts) {
      if (a.state === TestAttemptState.ON_GOING) {
        await this.maybeAutoEnd(a);
      }
    }
    return attempts;
  }

  private async assertLecturerOwnsTest(
    lecturerEmail: string,
    testId: string,
  ): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['lecturer'],
    });
    if (!test) {
      throw new NotFoundException('Test not found');
    }
    if (test.lecturer?.email !== lecturerEmail) {
      throw new ForbiddenException('You do not own this test');
    }
    return test;
  }

  private applyShowAnswerVisibility(attempt: TestAttempt): TestAttempt {
    const expose =
      attempt.test?.show_answer === true &&
      attempt.state === TestAttemptState.ENDED;
    if (expose || !attempt.answers) return attempt;

    for (const a of attempt.answers) {
      a.is_correct = null;
      a.marks_awarded = null;
      a.ai_feedback = null;
    }
    return attempt;
  }

  private async loadAttemptForStudent(
    attemptId: string,
    studentEmail: string,
  ): Promise<TestAttempt> {
    const attempt = await this.testAttemptRepository.findOne({
      where: { id: attemptId },
      relations: ['test', 'student'],
    });
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.student.email !== studentEmail) {
      throw new ForbiddenException('You do not own this attempt');
    }
    return attempt;
  }

  private async upsertAnswer(
    attempt: TestAttempt,
    question: Question,
    payload: { selected_option?: string; answer_text?: string },
    repo: Repository<AnswerSubmission> = this.answerSubmissionRepository,
  ): Promise<AnswerSubmission> {
    const existing = await repo.findOne({
      where: {
        attempt: { id: attempt.id },
        question: { id: question.id },
      },
    });
    const submission =
      existing ??
      repo.create({
        attempt,
        question,
      });
    submission.selected_option = payload.selected_option ?? null;
    submission.answer_text = payload.answer_text ?? null;
    return repo.save(submission);
  }

  /**
   * Auto-end an attempt whose deadline has passed. Mutates the passed entity
   * and persists to the repo, so callers can rely on attempt.state being
   * up-to-date after this returns.
   */
  private async maybeAutoEnd(attempt: TestAttempt): Promise<void> {
    if (
      attempt.state !== TestAttemptState.ON_GOING ||
      !attempt.started_at ||
      !attempt.test
    ) {
      return;
    }
    const deadlineMs =
      attempt.started_at.getTime() +
      (attempt.test.duration_minutes + (attempt.extended_minutes ?? 0)) *
        60_000;
    if (Date.now() <= deadlineMs) return;

    attempt.state = TestAttemptState.ENDED;
    attempt.ended_at = new Date();
    await this.testAttemptRepository.save(attempt);
  }

  private fisherYatesShuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
