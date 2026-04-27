import { Field, InputType } from '@nestjs/graphql';
import { QuestionType } from '../enums';

@InputType()
export class QuestionOptionInput {
  @Field()
  label: string;

  @Field()
  value: string;
}

@InputType()
export class CreateQuestionInput {
  @Field()
  body: string;

  @Field(() => QuestionType)
  type: QuestionType;

  @Field(() => [QuestionOptionInput], { nullable: true })
  options?: QuestionOptionInput[];

  @Field({ nullable: true })
  correct_answer?: string;

  @Field()
  marks: number;
}
