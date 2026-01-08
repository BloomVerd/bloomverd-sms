import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PageInfo {
  @Field()
  total: number;

  @Field()
  page: number;

  @Field()
  lastPage: number;

  @Field()
  limit: number;
}
