import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCourseInput {
  @Field()
  id: string;

  @Field()
  credits: number;

  @Field()
  name: string;

  @Field()
  code: string;
}
