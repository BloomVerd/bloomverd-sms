import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('QuestionOption')
export class QuestionOption {
  @Field()
  label: string;

  @Field()
  value: string;
}
