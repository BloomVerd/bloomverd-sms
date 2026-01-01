import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('CourseMaterial')
export class CourseMaterialTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  url: string;
}
