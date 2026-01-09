import { Field, InputType } from '@nestjs/graphql';
import { Gender } from '../enums';

@InputType()
export class AddLecturerInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  gender: Gender;

  @Field()
  phoneNumber: string;

  @Field()
  address: string;

  @Field()
  dateOfBirth: Date;
}
