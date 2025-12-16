import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
class Department {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;
}

@ObjectType()
export class DepartmentType {
  @Field(() => [Department])
  departments: Department[];
}
