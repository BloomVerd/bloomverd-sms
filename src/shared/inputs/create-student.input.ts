import { Field, InputType } from '@nestjs/graphql';
import { Gender, StudentType } from '../enums';

@InputType()
export class CreateStudentInput {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  dateOfBirth: Date;

  @Field()
  yearGroup: number;

  @Field()
  gender: Gender;

  @Field()
  address: string;

  @Field()
  phoneNumber: string;

  @Field()
  studentType: StudentType;
}
