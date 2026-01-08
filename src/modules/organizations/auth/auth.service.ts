import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { HashHelper } from 'src/shared/helpers';
import { OrganizationLoginResponse } from 'src/shared/types';
import { Repository } from 'typeorm';
import { Organization } from '../../../database/entities';
import { OrganizationSetting } from 'src/database/entities/organization_setting.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
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

        const payload: {
          id: string;
          name: string;
          email: string;
          role: 'ORGANIZATION';
        } = {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          role: 'ORGANIZATION',
        };

        const access_token = this.jwtService.sign(payload);

        return {
          ...organization,
          token: access_token,
        };
      },
    );
  }
}
