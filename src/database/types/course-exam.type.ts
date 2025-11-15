import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('CourseExam')
export class CourseExamTypeClass {
  @Field(() => ID)
  id: string;
}
