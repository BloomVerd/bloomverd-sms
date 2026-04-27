import { Field, InputType } from '@nestjs/graphql';
import { TestAttemptState } from '../enums';

@InputType()
export class ListTestAttemptsFilterInput {
  @Field()
  testId: string;

  @Field({ nullable: true })
  suiteId?: string;

  @Field(() => TestAttemptState, { nullable: true })
  state?: TestAttemptState;
}
