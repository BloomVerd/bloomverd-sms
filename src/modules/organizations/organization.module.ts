import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from 'src/database/entities';
import { JwtStrategy } from 'src/shared/strategies';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { OrgResolver } from './org/org.resolver';
import { OrgService } from './org/org.service';
import { OrgProducer } from './org/org.producer';
import { OrgConsumer } from './org/org.consumer';

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
    JwtStrategy,
    AuthService,
    OrgResolver,
    OrgService,
    OrgProducer,
    OrgConsumer,
  ],
})
export class OrganizationModule {}
