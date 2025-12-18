import { Field, InputType } from '@nestjs/graphql';
import { CreateClassInput } from './create-class.input';

@InputType()
export class CreateClassWithRelationshipInput extends CreateClassInput {
  @Field()
  departmentEmail: string;
}
