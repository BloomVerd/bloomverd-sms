import { Field, InputType } from '@nestjs/graphql';
import { CreateQuestionInput } from './create-question.input';

@InputType()
export class CreatePreambleInput {
  @Field()
  body: string;

  @Field(() => [CreateQuestionInput])
  questions: CreateQuestionInput[];
}
