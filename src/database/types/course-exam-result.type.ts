import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CourseExamTypeClass } from './course-exam.type';

@ObjectType('CourseExamResult')
export class CourseExamResultTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  student_email: string;

  @Field()
  score: number;

  @Field(() => CourseExamTypeClass)
  exam: CourseExamTypeClass;
}
