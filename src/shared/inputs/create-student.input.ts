import { Field, InputType } from '@nestjs/graphql';
import { Gender } from '../enums';

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
  gender: Gender;

  @Field()
  address: string;

  @Field()
  phoneNumber: string;
}
