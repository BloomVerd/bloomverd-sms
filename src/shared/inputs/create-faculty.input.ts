import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateFacultyInput {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;
}
