import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ClassTypeClass } from './class.type';
import { CourseTypeClass } from './course.type';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum StudentType {
  REGULAR = 'REGULAR',
  FEE_PAYING = 'FEE_PAYING',
  INTERNATIONAL = 'INTERNATIONAL',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: 'Gender of entity',
});

registerEnumType(StudentType, {
  name: 'StudentType',
  description: 'Type of student',
});

@ObjectType('Student')
export class StudentTypeClass {
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

  @Field(() => [CourseTypeClass], { nullable: true })
  registered_courses: CourseTypeClass[];

  @Field(() => StudentType)
  student_type: StudentType;

  @Field(() => ClassTypeClass, { nullable: true })
  class: ClassTypeClass;
}
