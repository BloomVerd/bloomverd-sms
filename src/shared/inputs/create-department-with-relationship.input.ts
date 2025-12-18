import { Field, InputType } from '@nestjs/graphql';
import { CreateDepartmentInput } from './create-department.input';

@InputType()
export class CreateDepartmentWithRelationshipInput extends CreateDepartmentInput {
  @Field()
  facultyEmail: string;
}
