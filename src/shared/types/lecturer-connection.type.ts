import { ObjectType } from '@nestjs/graphql';
import { LecturerTypeClass } from 'src/database/types';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('LecturerConnection')
export class LecturerConnection extends PageBasedPaginationResponse(
  LecturerTypeClass,
) {}
