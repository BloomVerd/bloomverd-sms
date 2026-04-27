import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class PreambleQuestionAnswerInput {
  @Field()
  questionId: string;

  @Field({ nullable: true })
  selected_option?: string;

  @Field({ nullable: true })
  answer_text?: string;
}

@InputType()
export class SubmitPreambleAnswersInput {
  @Field()
  attemptId: string;

  @Field()
  preambleId: string;

  @Field(() => [PreambleQuestionAnswerInput])
  answers: PreambleQuestionAnswerInput[];
}
