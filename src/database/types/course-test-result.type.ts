import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('CourseTestResult')
export class CourseTestResultTypeClass {
  @Field(() => ID)
  id: string;
}
