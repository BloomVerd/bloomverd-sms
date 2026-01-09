import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddCollegeInput {
  @Field()
  email: string;

  @Field()
  name: string;
}
