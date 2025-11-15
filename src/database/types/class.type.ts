import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Class')
export class ClassTypeClass {
  @Field(() => ID)
  id: string;
}
