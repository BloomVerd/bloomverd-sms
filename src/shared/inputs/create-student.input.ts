import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class createStudentInput {
  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  dateOfBirth: string;

  @Field()
  gender: string;

  @Field()
  address: string;

  @Field()
  phoneNumber: string;
}
