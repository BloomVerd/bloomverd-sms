import { Field, InputType } from '@nestjs/graphql';
import { CreateCourseInput } from './create-course.input';

@InputType()
export class CreateCourseWithRelationshipInput extends CreateCourseInput {
  @Field()
  className: string;
}
