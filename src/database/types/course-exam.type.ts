import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CourseTypeClass } from './course.type';

@ObjectType('CourseExam')
export class CourseExamTypeClass {
  @Field(() => ID)
  id: string;

  @Field(() => CourseTypeClass)
  course: CourseTypeClass;
}
