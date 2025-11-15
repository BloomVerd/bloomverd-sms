import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Student')
export class StudentTypeClass {
  @Field(() => ID)
  id: string;
}
