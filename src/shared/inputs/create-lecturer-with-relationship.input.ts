import { Field, InputType } from '@nestjs/graphql';
import { CreateLecturerInput } from './create-lecturer.input';

@InputType()
export class CreateLecturerWithRelationshipInput extends CreateLecturerInput {
  @Field()
  departmentEmail: string;
}
