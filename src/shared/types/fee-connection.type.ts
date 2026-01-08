import { ObjectType } from '@nestjs/graphql';
import { FeeTypeClass } from 'src/database/types';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('FeeConnection')
export class FeeConnection extends PageBasedPaginationResponse(FeeTypeClass) {}
