import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DepartmentTypeClass } from './department.type';

@ObjectType('Class')
export class ClassTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => DepartmentTypeClass, { nullable: true })
  department: DepartmentTypeClass;
}
