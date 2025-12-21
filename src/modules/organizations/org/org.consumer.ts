import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  CreateClassWithRelationshipInput,
  CreateCollegeInput,
  CreateCourseWithRelationshipInput,
  CreateDepartmentWithRelationshipInput,
  CreateFacultyWithRelationshipInput,
  CreateLecturerWithRelationshipInput,
  CreateStudentWithRelationshipInput,
} from 'src/shared/inputs';
import { OrgService } from './org.service';

@Processor('organization-queue')
export class OrgConsumer extends WorkerHost {
  constructor(private readonly orgService: OrgService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'setup-action': {
        const data: {
          organizationEmail: string;
          colleges: CreateCollegeInput[];
          faculties: CreateFacultyWithRelationshipInput[];
          departments: CreateDepartmentWithRelationshipInput[];
          lecturers: CreateLecturerWithRelationshipInput[];
          classes: CreateClassWithRelationshipInput[];
          students: CreateStudentWithRelationshipInput[];
          courses: CreateCourseWithRelationshipInput[];
        } = job.data;

        await this.orgService.setupActionProcessing(data);

        break;
      }
    }
  }
}
