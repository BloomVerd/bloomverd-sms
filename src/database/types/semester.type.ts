import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Semester')
export class SemesterTypeClass {
  @Field(() => ID)
  id: string;
}
