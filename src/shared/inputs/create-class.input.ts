import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateClassInput {
  @Field()
  id: string;

  @Field()
  name: string;
}
