import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCourseInput {
  @Field()
  courseId: string;

  @Field()
  classId: string;

  @Field()
  lecturerId: string;

  @Field()
  credits: number;

  @Field()
  name: string;
}
