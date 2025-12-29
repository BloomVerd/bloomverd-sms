import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ResetResponse {
  @Field()
  message: string;
}
