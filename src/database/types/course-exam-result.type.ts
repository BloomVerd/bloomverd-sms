import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('CourseExamResult')
export class CourseExamResultTypeClass {
  @Field(() => ID)
  id: string;
}
