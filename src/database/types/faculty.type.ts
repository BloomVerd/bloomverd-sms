import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CollegeTypeClass } from './college.type';
import { FeeTypeClass } from './fee.type';
@ObjectType('Faculty')
export class FacultyTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => CollegeTypeClass, { nullable: true })
  college: CollegeTypeClass;

  @Field(() => [FeeTypeClass], { nullable: true })
  fees: FeeTypeClass[];
}
