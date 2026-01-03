import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CourseMaterialTypeClass } from './course-material.type';

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

  @Field(() => [CourseMaterialTypeClass])
  materials: CourseMaterialTypeClass[];

  @Field()
  is_required: boolean;
}
