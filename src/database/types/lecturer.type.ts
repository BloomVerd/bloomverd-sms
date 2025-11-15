import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Lecturer')
export class LecturerTypeClass {
  @Field(() => ID)
  id: string;
}
