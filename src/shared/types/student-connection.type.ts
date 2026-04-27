import { ObjectType } from '@nestjs/graphql';
import { Student } from 'src/modules/students/student/entities/student.entity';
import { PageBasedPaginationResponse } from './page-based-pagination-response.type';

@ObjectType('StudentConnection')
export class StudentConnection extends PageBasedPaginationResponse(Student) {}
