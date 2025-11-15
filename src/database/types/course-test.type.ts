import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('CourseTest')
export class CourseTestTypeClass {
  @Field(() => ID)
  id: string;
}
