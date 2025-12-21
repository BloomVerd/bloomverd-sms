import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  CreateClassWithRelationshipInput,
  CreateCollegeInput,
  CreateCourseWithRelationshipInput,
  CreateDepartmentWithRelationshipInput,
  CreateFacultyWithRelationshipInput,
  CreateLecturerWithRelationshipInput,
  CreateStudentWithRelationshipInput,
} from 'src/shared/inputs';

@Injectable()
export class OrgProducer {
  constructor(
    @InjectQueue('organization-queue')
    private readonly organizationQueue: Queue,
  ) {}

  async setupAction(data: {
    organizationEmail: string;
    colleges: CreateCollegeInput[];
    faculties: CreateFacultyWithRelationshipInput[];
    departments: CreateDepartmentWithRelationshipInput[];
    lecturers: CreateLecturerWithRelationshipInput[];
    classes: CreateClassWithRelationshipInput[];
    students: CreateStudentWithRelationshipInput[];
    courses: CreateCourseWithRelationshipInput[];
  }) {
    await this.organizationQueue.add('setup-action', data);
  }
}
