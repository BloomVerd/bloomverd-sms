import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class EndTestInput {
  @Field()
  attemptId: string;
}
