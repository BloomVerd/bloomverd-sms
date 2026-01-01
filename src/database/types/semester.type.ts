import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Course } from '../entities';

@ObjectType('Semester')
export class SemesterTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  semester_number: number;

  @Field()
  courses: string;
}
