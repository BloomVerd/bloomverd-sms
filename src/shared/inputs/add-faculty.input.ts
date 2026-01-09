import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddFacultyInput {
  @Field()
  email: string;

  @Field()
  name: string;
}
