import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollegeInput {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;
}
