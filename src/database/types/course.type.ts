import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CourseMaterialTypeClass } from './course-material.type';
import { CourseExam } from '../entities';
import { CourseExamTypeClass } from './course-exam.type';

@ObjectType('Course')
export class CourseTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  course_code: string;

  @Field()
  name: string;

  @Field()
  credits: number;

  @Field(() => [CourseMaterialTypeClass], { nullable: true })
  materials?: CourseMaterialTypeClass[];

  @Field()
  is_required: boolean;

  @Field(() => [CourseExamTypeClass], { nullable: true })
  exams?: CourseExamTypeClass[];
}
