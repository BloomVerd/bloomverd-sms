import { Field, InputType } from '@nestjs/graphql';
import { Gender } from 'src/database/entities/lecturer.entity';

@InputType()
export class CreateLecturerInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  password: string;

  @Field()
  gender: Gender;

  @Field()
  phoneNumber: string;

  @Field()
  address: string;

  @Field()
  dateOfBirth: Date;
}
