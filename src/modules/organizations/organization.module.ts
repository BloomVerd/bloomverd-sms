import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from 'src/database/entities';
import { JwtStrategy } from 'src/shared/strategies';
import { UploadModule } from '../uploads/upload.module';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
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
    TypeOrmModule.forFeature(entities),
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
