import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from 'src/database/entities';
import { JwtStrategy } from 'src/shared/strategies';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { AuthProducer } from './auth/auth.producer';
import { AuthConsumer } from './auth/auth.consumer';
import { StudentService } from './student/student.service';
import { StudentResolver } from './student/student.resolver';

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
    TypeOrmModule.forFeature(entities),
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
