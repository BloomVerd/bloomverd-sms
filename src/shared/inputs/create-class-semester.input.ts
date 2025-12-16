import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateClassSemesterInput {
  @Field()
  name: string;

  @Field()
  classId: string;
}
