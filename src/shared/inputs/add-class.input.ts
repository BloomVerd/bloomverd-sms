import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddClassInput {
  @Field()
  name: string;

  @Field()
  numberOfSemesters: number;
}
