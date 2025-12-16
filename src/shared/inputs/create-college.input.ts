import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollegeInput {
  @Field()
  email: string;

  @Field()
  name: string;

  @Field()
  organizationId: string;
}
