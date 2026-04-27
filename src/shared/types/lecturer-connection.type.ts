import { ObjectType } from '@nestjs/graphql';
import { Lecturer } from 'src/modules/organizations/org/entities/lecturer.entity';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('LecturerConnection')
export class LecturerConnection extends PageBasedPaginationResponse(Lecturer) {}
