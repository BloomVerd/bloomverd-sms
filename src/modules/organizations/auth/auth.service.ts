import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationSetting } from 'src/database/entities/organization_setting.entity';
import { HashHelper } from 'src/shared/helpers';
import { AppLoggerService } from 'src/shared/services/logger.service';
import { MetricsService } from 'src/shared/services/metrics.service';
import { OrganizationLoginResponse } from 'src/shared/types';
import { Repository } from 'typeorm';
import { Organization } from '../../../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private metricsService: MetricsService,
    private logger: AppLoggerService,
  ) {}

  async registerOrganization({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    return await this.organizationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const existingOrganization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: { email },
          },
        );

        if (existingOrganization) {
          this.logger.warn(
            `Registration failed: Organization with email ${email} already exists`,
            'OrganizationAuth',
          );
          throw new Error('Organization with this email already exists');
        }

        const setting = new OrganizationSetting();
        await transactionalEntityManager.save(OrganizationSetting, setting);

        const organization = new Organization();
        organization.name = name;
        organization.email = email;
        organization.setting = setting;
        organization.password = await HashHelper.encrypt(password);

        await transactionalEntityManager.save(Organization, organization);

        // Track organization creation
        this.metricsService.trackOrganizationCreated('standard');

        this.logger.log(
          `Organization registered successfully: ${email}`,
          'OrganizationAuth',
        );

        return { message: 'Organization registered successfully' };
      },
    );
  }

  async loginOrganization({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<OrganizationLoginResponse> {
    this.logger.log(
      `Login attempt for organization: ${email}`,
      'OrganizationAuth',
    );
    this.metricsService.trackAuthenticationAttempt('login', 'organization');

    return await this.organizationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: { email },
          },
        );

        if (!organization) {
          this.logger.warn(
            `Login failed: Organization not found for email ${email}`,
            'OrganizationAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_email',
            'organization',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const isPasswordValid = await HashHelper.compare(
          password,
          organization.password,
        );

        if (!isPasswordValid) {
          this.logger.warn(
            `Login failed: Invalid password for organization ${email}`,
            'OrganizationAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_password',
            'organization',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const access_token_payload: {
          id: string;
          name: string;
          email: string;
          type: 'access_token' | 'refresh_token';
          role: 'ORGANIZATION';
        } = {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          type: 'access_token',
          role: 'ORGANIZATION',
        };

        const refresh_token_payload: {
          id: string;
          type: 'access_token' | 'refresh_token';
          role: 'ORGANIZATION';
        } = {
          id: organization.id,
          type: 'refresh_token',
          role: 'ORGANIZATION',
        };

        const access_token = await this.jwtService.signAsync(
          access_token_payload,
          {
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_TTL'),
          },
        );

        const refresh_token = await this.jwtService.signAsync(
          refresh_token_payload,
          {
            expiresIn: this.configService.get('JWT_REFRESH_TOKEN_TTL'),
          },
        );

        this.metricsService.trackAuthenticationSuccess('login', 'organization');
        this.metricsService.incrementActiveSessions();

        this.logger.log(
          `Login successful for organization: ${email} (ID: ${organization.id})`,
          'OrganizationAuth',
        );

        return {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          profile_url: organization.profile_url || '',
          password: organization.password,
          colleges: organization.colleges,
          iec: organization.iec,
          setting: organization.setting,
          token: access_token,
          refresh_token: refresh_token,
        };
      },
    );
  }

  async verifyRefreshToken({ refresh_token }: { refresh_token: string }) {
    this.logger.log('Refresh token verification attempt', 'OrganizationAuth');
    this.metricsService.trackAuthenticationAttempt(
      'refresh_token',
      'organization',
    );
    try {
      const payload = await this.jwtService.verifyAsync(refresh_token);

      if (payload.type !== 'refresh_token') {
        this.logger.warn(
          'Refresh token verification failed: Invalid token type',
          'OrganizationAuth',
        );
        this.metricsService.trackAuthenticationFailure(
          'refresh_token',
          'invalid_token_type',
          'organization',
        );
        throw new UnauthorizedException('Invalid token type');
      }

      const organization = await this.organizationRepository.findOne({
        where: { id: payload.id },
      });

      if (!organization) {
        this.logger.warn(
          `Refresh token verification failed: Organization not found (ID: ${payload.id})`,
          'OrganizationAuth',
        );
        this.metricsService.trackAuthenticationFailure(
          'refresh_token',
          'organization_not_found',
          'organization',
        );
        throw new NotFoundException('Organization not found');
      }

      const access_token_payload: {
        id: string;
        name: string;
        email: string;
        type: 'access_token' | 'refresh_token';
        role: 'ORGANIZATION';
      } = {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        type: 'access_token',
        role: 'ORGANIZATION',
      };

      const refresh_token_payload: {
        id: string;
        type: 'access_token' | 'refresh_token';
        role: 'ORGANIZATION';
      } = {
        id: organization.id,
        type: 'refresh_token',
        role: 'ORGANIZATION',
      };

      const access_token = await this.jwtService.signAsync(
        access_token_payload,
        {
          expiresIn: this.configService.get('JWT_ACCESS_TOKEN_TTL'),
        },
      );

      const refresh_token_generated = await this.jwtService.signAsync(
        refresh_token_payload,
        {
          expiresIn: this.configService.get('JWT_REFRESH_TOKEN_TTL'),
        },
      );

      this.metricsService.trackAuthenticationSuccess(
        'refresh_token',
        'organization',
      );

      this.logger.log(
        `Refresh token verified successfully for organization: ${organization.email}`,
        'OrganizationAuth',
      );

      return {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        profile_url: organization.profile_url || '',
        password: organization.password,
        colleges: organization.colleges,
        iec: organization.iec,
        setting: organization.setting,
        token: access_token,
        refresh_token: refresh_token_generated,
      };
    } catch (error) {
      this.metricsService.trackAuthenticationFailure(
        'refresh_token',
        'invalid_token',
        'organization',
      );
      this.logger.error(
        `Refresh token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OrganizationAuth',
      );
      throw new BadRequestException('Invalid refresh token', error);
    }
  }
}
