import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/shared/strategies';
import { Course } from '../organizations/org/entities/course.entity';
import { Lecturer } from '../organizations/org/entities/lecturer.entity';
import { Student } from '../students/student/entities/student.entity';
import { AnswerSubmission } from './test/entities/answer-submission.entity';
import { Preamble } from './test/entities/preamble.entity';
import { Question } from './test/entities/question.entity';
import { Test } from './test/entities/test.entity';
import { TestAttempt } from './test/entities/test-attempt.entity';
import { TestSuite } from './test/entities/test-suite.entity';
import { TestConsumer } from './test/test.consumer';
import { TestResolver } from './test/test.resolver';
import { TestService } from './test/test.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([
      Test,
      TestSuite,
      Preamble,
      Question,
      TestAttempt,
      AnswerSubmission,
      Lecturer,
      Student,
      Course,
    ]),
    BullModule.registerQueue({ name: 'exam-grading-queue' }),
  ],
  providers: [TestResolver, TestService, TestConsumer, JwtStrategy],
})
export class ExamsModule {}
