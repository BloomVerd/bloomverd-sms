import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTestCompletionTimeInput {
  @Field()
  testId: string;

  @Field()
  additional_minutes: number;

  @Field({ nullable: true })
  classId?: string;

  @Field(() => [String], { nullable: true })
  testAttemptIds?: string[];
}
