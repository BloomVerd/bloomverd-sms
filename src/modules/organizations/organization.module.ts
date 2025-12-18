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
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [],
  providers: [AuthResolver, JwtStrategy, AuthService, OrgResolver, OrgService],
})
export class OrganizationModule {}
