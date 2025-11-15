import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('College')
export class CollegeTypeClass {
  @Field(() => ID)
  id: string;
}
