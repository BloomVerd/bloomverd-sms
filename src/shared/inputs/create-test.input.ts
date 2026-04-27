import { Field, InputType } from '@nestjs/graphql';
import { TestPlatform, TestType } from '../enums';
import { CreatePreambleInput } from './create-preamble.input';
import { CreateQuestionInput } from './create-question.input';

@InputType()
export class CreateTestInput {
  @Field()
  title: string;

  @Field()
  courseId: string;

  @Field(() => TestType)
  type: TestType;

  @Field(() => [TestPlatform])
  platforms: TestPlatform[];

  @Field()
  duration_minutes: number;

  @Field()
  start_time: Date;

  @Field()
  end_time: Date;

  @Field()
  total_suites: number;

  @Field()
  total_questions_per_suite: number;

  @Field({ nullable: true })
  show_answer?: boolean;

  @Field()
  secret: string;

  @Field(() => [CreateQuestionInput])
  questions: CreateQuestionInput[];

  @Field(() => [CreatePreambleInput], { nullable: true })
  preambles?: CreatePreambleInput[];
}
