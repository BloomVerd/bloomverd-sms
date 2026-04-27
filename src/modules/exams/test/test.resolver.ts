import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import {
  CreateTestInput,
  EndTestInput,
  ListTestAttemptsFilterInput,
  StartTestInput,
  SubmitAnswerInput,
  SubmitPreambleAnswersInput,
  UpdateTestCompletionTimeInput,
} from '../../../shared/inputs';
import { AnswerSubmission } from './entities/answer-submission.entity';
import { Test } from './entities/test.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { TestService } from './test.service';

@Resolver()
export class TestResolver {
  constructor(private readonly testService: TestService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Test)
  createTest(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => CreateTestInput }) input: CreateTestInput,
  ) {
    return this.testService.createTest({
      lecturerEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => TestAttempt)
  startTest(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => StartTestInput }) input: StartTestInput,
  ) {
    return this.testService.startTest({
      studentEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => TestAttempt)
  endTest(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => EndTestInput }) input: EndTestInput,
  ) {
    return this.testService.endTest({
      studentEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => AnswerSubmission)
  submitAnswer(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => SubmitAnswerInput }) input: SubmitAnswerInput,
  ) {
    return this.testService.submitAnswer({
      studentEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [AnswerSubmission])
  submitPreambleAnswers(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => SubmitPreambleAnswersInput })
    input: SubmitPreambleAnswersInput,
  ) {
    return this.testService.submitPreambleAnswers({
      studentEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [TestAttempt])
  updateTestCompletionTime(
    @Context() context: { req: { user: { email: string } } },
    @Args('input', { type: () => UpdateTestCompletionTimeInput })
    input: UpdateTestCompletionTimeInput,
  ) {
    return this.testService.updateTestCompletionTime({
      lecturerEmail: context.req.user.email,
      input,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => TestAttempt)
  getTestAttempt(
    @Context() context: { req: { user: { email: string } } },
    @Args('attemptId', { type: () => String }) attemptId: string,
  ) {
    return this.testService.getTestAttempt({
      callerEmail: context.req.user.email,
      attemptId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [TestAttempt])
  listTestAttempts(
    @Context() context: { req: { user: { email: string } } },
    @Args('filter', { type: () => ListTestAttemptsFilterInput })
    filter: ListTestAttemptsFilterInput,
  ) {
    return this.testService.listTestAttempts({
      lecturerEmail: context.req.user.email,
      filter,
    });
  }
}
