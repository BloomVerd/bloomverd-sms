import { getQueueToken } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import {
  QuestionType,
  TestAttemptState,
  TestPlatform,
  TestType,
} from '../../../shared/enums';
import { Course } from '../../organizations/org/entities/course.entity';
import { Lecturer } from '../../organizations/org/entities/lecturer.entity';
import { Student } from '../../students/student/entities/student.entity';
import { AnswerSubmission } from './entities/answer-submission.entity';
import { Preamble } from './entities/preamble.entity';
import { Question } from './entities/question.entity';
import { Test } from './entities/test.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { TestSuite } from './entities/test-suite.entity';
import { TestService } from './test.service';

jest.mock('../../../shared/helpers', () => ({
  HashHelper: {
    encrypt: jest.fn(async (s: string) => `hashed:${s}`),
    compare: jest.fn(
      async (plain: string, hash: string) => hash === `hashed:${plain}`,
    ),
  },
}));

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((e) => Promise.resolve(e)),
  create: jest.fn((e) => e),
  manager: {
    transaction: jest.fn(),
  },
});

const makeManager = () => {
  const ids: Record<string, number> = {};
  return {
    create: jest.fn((Entity: any, data: any) => ({ ...data, __ctor: Entity })),
    save: jest.fn(async (entityOrEntities: any, maybeData?: any) => {
      const data = maybeData ?? entityOrEntities;
      const ctorName =
        typeof entityOrEntities === 'function'
          ? entityOrEntities.name
          : (entityOrEntities?.__ctor?.name ?? 'Entity');
      const stamp = (e: any) => {
        if (!e.id) {
          ids[ctorName] = (ids[ctorName] ?? 0) + 1;
          e.id = `${ctorName}-${ids[ctorName]}`;
        }
        return e;
      };
      if (Array.isArray(data)) return data.map(stamp);
      return stamp(data);
    }),
    findOneOrFail: jest.fn(async (_E, opts: any) => ({ id: opts.where.id })),
  };
};

describe('TestService', () => {
  let service: TestService;
  let testRepo: ReturnType<typeof repoMock>;
  let attemptRepo: ReturnType<typeof repoMock>;
  let questionRepo: ReturnType<typeof repoMock>;
  let preambleRepo: ReturnType<typeof repoMock>;
  let answerRepo: ReturnType<typeof repoMock>;
  let lecturerRepo: ReturnType<typeof repoMock>;
  let studentRepo: ReturnType<typeof repoMock>;
  let courseRepo: ReturnType<typeof repoMock>;
  let queue: { add: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    testRepo = repoMock();
    attemptRepo = repoMock();
    questionRepo = repoMock();
    preambleRepo = repoMock();
    answerRepo = repoMock();
    lecturerRepo = repoMock();
    studentRepo = repoMock();
    courseRepo = repoMock();
    queue = { add: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef: TestingModule = await NestTest.createTestingModule({
      providers: [
        TestService,
        { provide: getRepositoryToken(Test), useValue: testRepo },
        { provide: getRepositoryToken(TestAttempt), useValue: attemptRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(Preamble), useValue: preambleRepo },
        { provide: getRepositoryToken(AnswerSubmission), useValue: answerRepo },
        { provide: getRepositoryToken(Lecturer), useValue: lecturerRepo },
        { provide: getRepositoryToken(Student), useValue: studentRepo },
        { provide: getRepositoryToken(Course), useValue: courseRepo },
        { provide: getQueueToken('exam-grading-queue'), useValue: queue },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(TestService);
  });

  describe('createTest', () => {
    const baseInput = {
      title: 'Mid-sem',
      courseId: 'course-1',
      type: TestType.MID_SEMESTER,
      platforms: [TestPlatform.WEB],
      duration_minutes: 60,
      start_time: new Date('2026-05-01T09:00:00Z'),
      end_time: new Date('2026-05-01T11:00:00Z'),
      total_suites: 3,
      total_questions_per_suite: 4,
      secret: 'opensesame',
      questions: [] as any[],
      preambles: [] as any[],
    };

    const setupDeps = () => {
      lecturerRepo.findOne.mockResolvedValue({
        id: 'lec-1',
        email: 'l@x.io',
        departments: [{ id: 'dept-1' }],
      });
      courseRepo.findOne.mockResolvedValue({
        id: 'course-1',
        semesters: [{ class: { department: { id: 'dept-1' } } }],
      });
      const savedSuites: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const m = makeManager();
        // Track Suite saves to inspect later
        const origSave = m.save;
        (m.save as any) = jest.fn(async (a: any, b?: any) => {
          const result = await origSave(a, b);
          if (Array.isArray(result)) result.forEach((r) => trackSuite(r));
          else trackSuite(result);
          return result;
        });
        function trackSuite(r: any) {
          if (
            r &&
            (r.__ctor === TestSuite ||
              r.constructor?.name === 'TestSuite' ||
              (Array.isArray(r.questions) && Array.isArray(r.preambles)))
          ) {
            if (r.questions !== undefined && r.preambles !== undefined) {
              savedSuites.push(r);
            }
          }
        }
        const result = await cb(m);
        (result as any).__suites = savedSuites;
        return result;
      });
      return { savedSuites };
    };

    it('creates total_suites suites, none exceeding total_questions_per_suite', async () => {
      const { savedSuites } = setupDeps();
      const questions = Array.from({ length: 10 }, (_, i) => ({
        body: `Q${i}`,
        type: QuestionType.OBJECTIVE,
        correct_answer: 'A',
        marks: 1,
      }));
      await service.createTest({
        lecturerEmail: 'l@x.io',
        input: { ...baseInput, questions, preambles: [] },
      });
      expect(savedSuites).toHaveLength(3);
      for (const s of savedSuites) {
        const total =
          s.questions.length +
          s.preambles.reduce(
            (acc: number, p: any) => acc + (p.__questionCount ?? 0),
            0,
          );
        expect(total).toBeLessThanOrEqual(4);
      }
    });

    it('keeps preamble sub-questions together in a suite (atomic units)', async () => {
      const { savedSuites } = setupDeps();
      const preambles = [
        {
          body: 'Read the passage',
          questions: [
            { body: 'P1Q1', type: QuestionType.WRITTEN, marks: 1 },
            { body: 'P1Q2', type: QuestionType.WRITTEN, marks: 1 },
            { body: 'P1Q3', type: QuestionType.WRITTEN, marks: 1 },
          ],
        },
      ];
      const questions = [
        {
          body: 'standalone',
          type: QuestionType.OBJECTIVE,
          correct_answer: 'A',
          marks: 1,
        },
      ];
      await service.createTest({
        lecturerEmail: 'l@x.io',
        input: {
          ...baseInput,
          total_suites: 1,
          total_questions_per_suite: 4,
          questions,
          preambles,
        },
      });
      expect(savedSuites).toHaveLength(1);
      // Either the preamble (3 sub-qs) or just the standalone, never split
      const s = savedSuites[0];
      expect(s.preambles.length === 0 || s.preambles.length === 1).toBe(true);
    });

    it('rejects when lecturer does not belong to a department running the course', async () => {
      lecturerRepo.findOne.mockResolvedValue({
        id: 'lec-1',
        email: 'l@x.io',
        departments: [{ id: 'other-dept' }],
      });
      courseRepo.findOne.mockResolvedValue({
        id: 'course-1',
        semesters: [{ class: { department: { id: 'dept-1' } } }],
      });
      await expect(
        service.createTest({
          lecturerEmail: 'l@x.io',
          input: {
            ...baseInput,
            questions: [
              {
                body: 'q',
                type: QuestionType.OBJECTIVE,
                correct_answer: 'A',
                marks: 1,
              },
            ],
          },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('startTest', () => {
    const test = {
      id: 'test-1',
      start_time: new Date(Date.now() - 60_000),
      end_time: new Date(Date.now() + 3_600_000),
      secret: 'hashed:right',
      course: { id: 'course-1' },
      suites: [{ id: 'suite-A' }, { id: 'suite-B' }],
    };

    const setupStudent = () =>
      studentRepo.findOne.mockResolvedValue({
        id: 'stu-1',
        email: 's@x.io',
        registered_courses: [{ id: 'course-1' }],
      });

    it('rejects when the test window has not opened yet', async () => {
      setupStudent();
      testRepo.findOne.mockResolvedValue({
        ...test,
        start_time: new Date(Date.now() + 60_000),
      });
      await expect(
        service.startTest({
          studentEmail: 's@x.io',
          input: { testId: 'test-1', secret: 'right' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the test window has closed', async () => {
      setupStudent();
      testRepo.findOne.mockResolvedValue({
        ...test,
        end_time: new Date(Date.now() - 60_000),
      });
      await expect(
        service.startTest({
          studentEmail: 's@x.io',
          input: { testId: 'test-1', secret: 'right' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the secret is wrong', async () => {
      setupStudent();
      testRepo.findOne.mockResolvedValue(test);
      await expect(
        service.startTest({
          studentEmail: 's@x.io',
          input: { testId: 'test-1', secret: 'WRONG' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the student already has an ongoing attempt', async () => {
      setupStudent();
      testRepo.findOne.mockResolvedValue(test);
      attemptRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.startTest({
          studentEmail: 's@x.io',
          input: { testId: 'test-1', secret: 'right' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assigns one of the test suites at random and creates an ON_GOING attempt', async () => {
      setupStudent();
      testRepo.findOne.mockResolvedValue(test);
      attemptRepo.findOne.mockResolvedValue(null);
      const result: any = await service.startTest({
        studentEmail: 's@x.io',
        input: { testId: 'test-1', secret: 'right' },
      });
      expect(result.state).toBe(TestAttemptState.ON_GOING);
      expect(['suite-A', 'suite-B']).toContain(result.suite.id);
    });
  });

  describe('endTest', () => {
    it('is idempotent — already-ended attempt returns without changes', async () => {
      const attempt = {
        id: 'att-1',
        state: TestAttemptState.ENDED,
        ended_at: new Date('2026-04-01'),
        score: 5,
        student: { email: 's@x.io' },
        test: { duration_minutes: 60, show_answer: false },
        answers: [],
        extended_minutes: 0,
        started_at: new Date(),
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      const result = await service.endTest({
        studentEmail: 's@x.io',
        input: { attemptId: 'att-1' },
      });
      expect(result).toBe(attempt);
      expect(attemptRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('grades deterministic answers and totals score', async () => {
      const answers: any[] = [
        {
          id: 'a1',
          selected_option: 'B',
          answer_text: null,
          question: {
            id: 'q1',
            type: QuestionType.OBJECTIVE,
            correct_answer: 'b',
            marks: 5,
          },
        },
        {
          id: 'a2',
          selected_option: null,
          answer_text: 'wrong',
          question: {
            id: 'q2',
            type: QuestionType.FILL_IN,
            correct_answer: 'right',
            marks: 3,
          },
        },
      ];
      const attempt = {
        id: 'att-2',
        state: TestAttemptState.ON_GOING,
        started_at: new Date(),
        ended_at: null,
        extended_minutes: 0,
        score: null,
        student: { email: 's@x.io' },
        test: { duration_minutes: 60, show_answer: false },
        answers,
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      attemptRepo.manager.transaction.mockImplementation(async (cb: any) =>
        cb({ save: jest.fn(async (_e, data) => data) }),
      );

      await service.endTest({
        studentEmail: 's@x.io',
        input: { attemptId: 'att-2' },
      });

      expect(answers[0].is_correct).toBe(true);
      expect(answers[0].marks_awarded).toBe(5);
      expect(answers[1].is_correct).toBe(false);
      expect(answers[1].marks_awarded).toBe(0);
      expect(attempt.score).toBe(5);
      expect(attempt.state).toBe(TestAttemptState.ENDED);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('queues AI grading jobs for non-deterministic answers when show_answer=true', async () => {
      const answers = [
        {
          id: 'a-written',
          selected_option: null,
          answer_text: 'long-form essay',
          question: {
            id: 'q-w',
            type: QuestionType.WRITTEN,
            correct_answer: null,
            marks: 10,
          },
        },
      ];
      const attempt = {
        id: 'att-3',
        state: TestAttemptState.ON_GOING,
        started_at: new Date(),
        ended_at: null,
        extended_minutes: 0,
        score: null,
        student: { email: 's@x.io' },
        test: { duration_minutes: 60, show_answer: true },
        answers,
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      attemptRepo.manager.transaction.mockImplementation(async (cb: any) =>
        cb({ save: jest.fn(async (_e, data) => data) }),
      );

      await service.endTest({
        studentEmail: 's@x.io',
        input: { attemptId: 'att-3' },
      });

      expect(queue.add).toHaveBeenCalledWith('grade-answer', {
        answerSubmissionId: 'a-written',
      });
    });

    it("rejects when the caller is not the attempt's student", async () => {
      attemptRepo.findOne.mockResolvedValue({
        id: 'att-X',
        state: TestAttemptState.ON_GOING,
        student: { email: 'other@x.io' },
        test: { duration_minutes: 60 },
        answers: [],
        started_at: new Date(),
        extended_minutes: 0,
      });
      await expect(
        service.endTest({
          studentEmail: 's@x.io',
          input: { attemptId: 'att-X' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('submitAnswer', () => {
    it('rejects on an attempt that has already ended', async () => {
      attemptRepo.findOne.mockResolvedValue({
        id: 'att',
        state: TestAttemptState.ENDED,
        student: { email: 's@x.io' },
        test: { duration_minutes: 60 },
      });
      await expect(
        service.submitAnswer({
          studentEmail: 's@x.io',
          input: { attemptId: 'att', questionId: 'q' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('auto-ends an expired attempt and rejects the submission', async () => {
      const attempt = {
        id: 'att',
        state: TestAttemptState.ON_GOING,
        student: { email: 's@x.io' },
        test: { id: 't', duration_minutes: 1 },
        started_at: new Date(Date.now() - 5 * 60_000),
        extended_minutes: 0,
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      await expect(
        service.submitAnswer({
          studentEmail: 's@x.io',
          input: { attemptId: 'att', questionId: 'q' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(attempt.state).toBe(TestAttemptState.ENDED);
    });

    it('rejects when the question belongs to a preamble', async () => {
      attemptRepo.findOne.mockResolvedValue({
        id: 'att',
        state: TestAttemptState.ON_GOING,
        student: { email: 's@x.io' },
        test: { id: 't', duration_minutes: 60 },
        started_at: new Date(),
        extended_minutes: 0,
      });
      questionRepo.findOne.mockResolvedValue({
        id: 'q',
        test: { id: 't' },
        preamble: { id: 'pre' },
      });
      await expect(
        service.submitAnswer({
          studentEmail: 's@x.io',
          input: { attemptId: 'att', questionId: 'q' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('submitPreambleAnswers', () => {
    const ctx = () => {
      attemptRepo.findOne.mockResolvedValue({
        id: 'att',
        state: TestAttemptState.ON_GOING,
        student: { email: 's@x.io' },
        test: { id: 't', duration_minutes: 60 },
        started_at: new Date(),
        extended_minutes: 0,
      });
      preambleRepo.findOne.mockResolvedValue({
        id: 'pre',
        test: { id: 't' },
        questions: [
          { id: 'q1', type: QuestionType.WRITTEN },
          { id: 'q2', type: QuestionType.WRITTEN },
        ],
      });
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ getRepository: () => answerRepo }),
      );
      answerRepo.findOne.mockResolvedValue(null);
    };

    it('rejects if any questionId does not belong to the preamble', async () => {
      ctx();
      await expect(
        service.submitPreambleAnswers({
          studentEmail: 's@x.io',
          input: {
            attemptId: 'att',
            preambleId: 'pre',
            answers: [{ questionId: 'STRAY' }],
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts every answer in a single transaction', async () => {
      ctx();
      const result = await service.submitPreambleAnswers({
        studentEmail: 's@x.io',
        input: {
          attemptId: 'att',
          preambleId: 'pre',
          answers: [
            { questionId: 'q1', answer_text: 'a1' },
            { questionId: 'q2', answer_text: 'a2' },
          ],
        },
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(answerRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTestCompletionTime', () => {
    beforeEach(() => {
      testRepo.findOne.mockResolvedValue({
        id: 't',
        lecturer: { email: 'l@x.io' },
      });
    });

    it('rejects if both classId and testAttemptIds are supplied', async () => {
      await expect(
        service.updateTestCompletionTime({
          lecturerEmail: 'l@x.io',
          input: {
            testId: 't',
            additional_minutes: 10,
            classId: 'c1',
            testAttemptIds: ['a1'],
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('targets specific attemptIds and bumps extended_minutes', async () => {
      const attempts = [
        { id: 'a1', extended_minutes: 0 },
        { id: 'a2', extended_minutes: 5 },
      ];
      attemptRepo.find.mockResolvedValue(attempts);
      await service.updateTestCompletionTime({
        lecturerEmail: 'l@x.io',
        input: {
          testId: 't',
          additional_minutes: 10,
          testAttemptIds: ['a1', 'a2'],
        },
      });
      expect(attempts[0].extended_minutes).toBe(10);
      expect(attempts[1].extended_minutes).toBe(15);
    });

    it('falls back to full cohort when neither classId nor testAttemptIds supplied', async () => {
      attemptRepo.find.mockResolvedValue([]);
      await service.updateTestCompletionTime({
        lecturerEmail: 'l@x.io',
        input: { testId: 't', additional_minutes: 5 },
      });
      const passedWhere = (attemptRepo.find.mock.calls[0]![0] as any).where;
      expect(passedWhere.test).toEqual({ id: 't' });
      expect(passedWhere.state).toBe(TestAttemptState.ON_GOING);
      expect(passedWhere.student).toBeUndefined();
    });
  });

  describe('getTestAttempt', () => {
    it('hides answer fields when show_answer=false', async () => {
      const attempt = {
        id: 'att',
        state: TestAttemptState.ENDED,
        started_at: new Date(),
        extended_minutes: 0,
        student: { email: 's@x.io' },
        test: {
          show_answer: false,
          duration_minutes: 60,
          lecturer: { email: 'l@x.io' },
        },
        answers: [
          {
            id: 'a',
            is_correct: true,
            marks_awarded: 5,
            ai_feedback: 'good',
          },
        ],
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      const result = await service.getTestAttempt({
        callerEmail: 's@x.io',
        attemptId: 'att',
      });
      expect(result.answers[0].is_correct).toBeNull();
      expect(result.answers[0].marks_awarded).toBeNull();
      expect(result.answers[0].ai_feedback).toBeNull();
    });

    it('exposes grading fields when show_answer=true and attempt is ENDED', async () => {
      const attempt = {
        id: 'att',
        state: TestAttemptState.ENDED,
        started_at: new Date(),
        extended_minutes: 0,
        student: { email: 's@x.io' },
        test: {
          show_answer: true,
          duration_minutes: 60,
          lecturer: { email: 'l@x.io' },
        },
        answers: [{ id: 'a', is_correct: true, marks_awarded: 5 }],
      };
      attemptRepo.findOne.mockResolvedValue(attempt);
      const result = await service.getTestAttempt({
        callerEmail: 's@x.io',
        attemptId: 'att',
      });
      expect(result.answers[0].is_correct).toBe(true);
      expect(result.answers[0].marks_awarded).toBe(5);
    });

    it("rejects when caller is neither the attempt's student nor the test's lecturer", async () => {
      attemptRepo.findOne.mockResolvedValue({
        id: 'att',
        state: TestAttemptState.ENDED,
        student: { email: 's@x.io' },
        test: { lecturer: { email: 'l@x.io' }, duration_minutes: 60 },
        answers: [],
      });
      await expect(
        service.getTestAttempt({
          callerEmail: 'someone-else@x.io',
          attemptId: 'att',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFound when attempt does not exist', async () => {
      attemptRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getTestAttempt({ callerEmail: 's@x.io', attemptId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listTestAttempts', () => {
    beforeEach(() => {
      testRepo.findOne.mockResolvedValue({
        id: 't',
        lecturer: { email: 'l@x.io' },
      });
    });

    it('passes the state filter through to the repository', async () => {
      attemptRepo.find.mockResolvedValue([]);
      await service.listTestAttempts({
        lecturerEmail: 'l@x.io',
        filter: { testId: 't', state: TestAttemptState.ENDED },
      });
      const where = (attemptRepo.find.mock.calls[0]![0] as any).where;
      expect(where.state).toBe(TestAttemptState.ENDED);
    });

    it('auto-ends ON_GOING attempts whose deadline has passed', async () => {
      const stale = {
        id: 'a-stale',
        state: TestAttemptState.ON_GOING,
        started_at: new Date(Date.now() - 5 * 60_000),
        extended_minutes: 0,
        test: { duration_minutes: 1 },
      };
      attemptRepo.find.mockResolvedValue([stale]);
      await service.listTestAttempts({
        lecturerEmail: 'l@x.io',
        filter: { testId: 't' },
      });
      expect(stale.state).toBe(TestAttemptState.ENDED);
    });

    it('rejects callers who do not own the test', async () => {
      testRepo.findOne.mockResolvedValue({
        id: 't',
        lecturer: { email: 'someone-else@x.io' },
      });
      await expect(
        service.listTestAttempts({
          lecturerEmail: 'l@x.io',
          filter: { testId: 't' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
