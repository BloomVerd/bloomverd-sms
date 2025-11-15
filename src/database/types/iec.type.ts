import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Iec')
export class IecTypeClass {
  @Field(() => ID)
  id: string;
}
