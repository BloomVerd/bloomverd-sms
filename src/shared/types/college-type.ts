import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class College {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name: string;
}

@ObjectType()
export class CollegeType {
  @Field(() => [College])
  colleges: College[];
}
