import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDepartmentInput {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;
}
