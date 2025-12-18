import { Field, InputType } from '@nestjs/graphql';
import { CreateFacultyInput } from './create-faculty.input';

@InputType()
export class CreateFacultyWithRelationshipInput extends CreateFacultyInput {
  @Field()
  collegeEmail: string;
}
