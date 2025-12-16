import { Field, InputType } from '@nestjs/graphql';
import { Gender } from 'src/database/entities/lecturer.entity';

@InputType()
export class CreateStudentInput {
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
