import { Field, ID, ObjectType } from '@nestjs/graphql';
@ObjectType('Faculty')
export class FacultyTypeClass {
  @Field(() => ID)
  id: string;
}
