import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class StartTestInput {
  @Field()
  testId: string;

  @Field()
  secret: string;
}
