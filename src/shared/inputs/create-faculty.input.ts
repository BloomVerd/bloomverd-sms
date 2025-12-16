import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateFacultyInput {
  @Field()
  email: string;

  @Field()
  name: string;

  @Field()
  password: string;
}
