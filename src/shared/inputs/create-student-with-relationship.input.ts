import { Field, InputType } from '@nestjs/graphql';
import { CreateStudentInput } from './create-student.input';

@InputType()
export class CreateStudentWithRelationshipInput extends CreateStudentInput {
  @Field()
  className: string;
}
