import { Field, ID, ObjectType } from '@nestjs/graphql';
import { FacultyTypeClass } from './faculty.type';

@ObjectType('Department')
export class DepartmentTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => FacultyTypeClass, { nullable: true })
  faculty: FacultyTypeClass;
}
