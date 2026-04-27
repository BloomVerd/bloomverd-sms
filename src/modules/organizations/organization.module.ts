import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/shared/strategies';
import { Student } from '../students/student/entities/student.entity';
import { UploadModule } from '../uploads/upload.module';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { Class } from './org/entities/class.entity';
import { College } from './org/entities/college.entity';
import { Course } from './org/entities/course.entity';
import { CourseExam } from './org/entities/course-exam.entity';
import { CourseExamResult } from './org/entities/course-exam-result.entity';
import { CourseMaterial } from './org/entities/course-material.entity';
import { Department } from './org/entities/department.entity';
import { Faculty } from './org/entities/faculty.entity';
import { Fee } from './org/entities/fee.entity';
import { Lecturer } from './org/entities/lecturer.entity';
import { Organization } from './org/entities/organization.entity';
import { OrganizationSetting } from './org/entities/organization_setting.entity';
import { Semester } from './org/entities/semester.entity';
import { FeeManagementResolver } from './fee-management/fee-management.resolver';
import { FeeManagementService } from './fee-management/fee-management.service';
import { OrgConsumer } from './org/org.consumer';
import { OrgProducer } from './org/org.producer';
import { OrgResolver } from './org/org.resolver';
import { OrgService } from './org/org.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'organization-queue',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([
      Organization,
      OrganizationSetting,
      College,
      Faculty,
      Department,
      Class,
      Semester,
      Course,
      CourseMaterial,
      Lecturer,
      Fee,
      CourseExam,
      CourseExamResult,
      Student,
    ]),
    UploadModule,
  ],
  controllers: [],
  providers: [
    AuthResolver,
    JwtStrategy,
    AuthService,
    OrgResolver,
    OrgService,
    OrgProducer,
    OrgConsumer,
    FeeManagementService,
    FeeManagementResolver,
  ],
})
export class OrganizationModule {}
