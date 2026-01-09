import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddDepartmentInput {
  @Field()
  email: string;

  @Field()
  name: string;
}
