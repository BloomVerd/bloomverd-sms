import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/shared/strategies';
import { Fee } from '../organizations/org/entities/fee.entity';
import { UploadModule } from '../uploads/upload.module';
import { Student } from './student/entities/student.entity';
import { AuthConsumer } from './auth/auth.consumer';
import { AuthProducer } from './auth/auth.producer';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { StudentResolver } from './student/student.resolver';
import { StudentService } from './student/student.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'student-queue',
    }),
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
    TypeOrmModule.forFeature([Student, Fee]),
    UploadModule,
  ],
  controllers: [],
  providers: [
    AuthResolver,
    AuthProducer,
    JwtStrategy,
    AuthService,
    AuthConsumer,
    StudentService,
    StudentResolver,
  ],
})
export class StudentModule {}
