import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationSetting } from 'src/database/entities/organization_setting.entity';
import { HashHelper } from 'src/shared/helpers';
import { OrganizationLoginResponse } from 'src/shared/types';
import { Repository } from 'typeorm';
import { Organization } from '../../../database/entities';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
    private configService: ConfigService,
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
    return await this.organizationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: { email },
          },
        );

        if (!organization) {
          throw new BadRequestException('Email or password is incorrect');
        }

        const isPasswordValid = await HashHelper.compare(
          password,
          organization.password,
        );

        if (!isPasswordValid) {
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

        return {
          ...organization,
          token: access_token,
          refresh_token: refresh_token,
        };
      },
    );
  }

  async verifyRefreshToken({ refresh_token }: { refresh_token: string }) {
    try {
      const payload = await this.jwtService.verifyAsync(refresh_token);

      if (payload.type !== 'refresh_token') {
        throw new UnauthorizedException('Invalid token type');
      }

      const organization = await this.organizationRepository.findOne({
        where: { id: payload.id },
      });

      if (!organization) {
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

      return {
        ...organization,
        token: access_token,
        refresh_token: refresh_token_generated,
      };
    } catch (error) {
      this.logger.error('Invalid refresh token', JSON.stringify(error));
      throw new BadRequestException('Invalid refresh token', error);
    }
  }
}
