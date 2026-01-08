import { ObjectType } from '@nestjs/graphql';
import { StudentTypeClass } from 'src/database/types';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('StudentConnection')
export class StudentConnection extends PageBasedPaginationResponse(
  StudentTypeClass,
) {}
