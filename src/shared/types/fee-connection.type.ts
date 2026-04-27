import { ObjectType } from '@nestjs/graphql';
import { Fee } from 'src/modules/organizations/org/entities/fee.entity';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('FeeConnection')
export class FeeConnection extends PageBasedPaginationResponse(Fee) {}
