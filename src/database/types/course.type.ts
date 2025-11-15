import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Course')
export class CourseTypeClass {
  @Field(() => ID)
  id: string;
}
