import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateLecturereInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  facultyId: string;

  @Field()
  gender: string;

  @Field()
  phoneNumber: string;

  @Field()
  address: string;

  @Field()
  dateOfBirth: string;

  @Field()
  fieldOfExpertise: string;
}
