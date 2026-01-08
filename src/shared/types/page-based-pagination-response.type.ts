import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';
import { PageInfo } from './page-info.type';

export function PageBasedPaginationResponse<T>(classRef: Type<T>): Type<any> {
  @ObjectType(`${classRef.name}Edge`)
  class EdgeType {
    @Field(() => classRef)
    node: T;
  }

  @ObjectType({ isAbstract: true })
  class PaginatedType {
    @Field(() => [EdgeType])
    edges: EdgeType[];

    @Field()
    meta: PageInfo;
  }

  return PaginatedType;
}
