import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Faculty {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;
}

@ObjectType()
export class FacultyType {
  @Field(() => [Faculty])
  faculties: Faculty[];
}
