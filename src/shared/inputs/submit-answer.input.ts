import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SubmitAnswerInput {
  @Field()
  attemptId: string;

  @Field()
  questionId: string;

  @Field({ nullable: true })
  selected_option?: string;

  @Field({ nullable: true })
  answer_text?: string;
}
