import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ValidationResponseType {
  @Field()
  index: number;

  @Field()
  field: 'name' | 'email' | 'code' | 'phone_number';

  @Field()
  input: string;

  @Field()
  message: string;
}
