import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/shared/strategies';
import { CourseExam } from '../organizations/org/entities/course-exam.entity';
import { CourseExamResult } from '../organizations/org/entities/course-exam-result.entity';
import { Organization } from '../organizations/org/entities/organization.entity';
import { Student } from '../students/student/entities/student.entity';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { Iec } from './iec/entities/iec.entity';
import { IecResolver } from './iec/iec.resolver';
import { IecService } from './iec/iec.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: 86400,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      Iec,
      Organization,
      Student,
      CourseExam,
      CourseExamResult,
    ]),
  ],
  controllers: [],
  providers: [AuthResolver, JwtStrategy, AuthService, IecResolver, IecService],
})
export class IecModule {}
