import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCourseInput {
  @Field()
  credits: number;

  @Field()
  name: string;

  @Field()
  code: string;
}
