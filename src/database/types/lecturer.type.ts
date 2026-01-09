import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from './student.type';
import { DepartmentTypeClass } from './department.type';

@ObjectType('Lecturer')
export class LecturerTypeClass {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  first_name: string;

  @Field(() => String)
  last_name: string;

  @Field(() => Gender)
  gender: Gender;

  @Field(() => String)
  email: string;

  @Field(() => String)
  phone_number: string;

  @Field(() => String)
  address: string;

  @Field(() => Date)
  date_of_birth: Date;

  @Field(() => [DepartmentTypeClass], { nullable: true })
  departments: DepartmentTypeClass[];
}
