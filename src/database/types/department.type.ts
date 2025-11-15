import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Department')
export class DepartmentTypeClass {
  @Field(() => ID)
  id: string;
}
