import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { HashHelper } from 'src/shared/helpers';
import { AppLoggerService } from 'src/shared/services/logger.service';
import { MetricsService } from 'src/shared/services/metrics.service';
import { IecLoginResponse } from 'src/shared/types';
import { Repository } from 'typeorm';
import { Iec } from '../../../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Iec)
    private iecRepository: Repository<Iec>,
    private jwtService: JwtService,
    private metricsService: MetricsService,
    private logger: AppLoggerService,
  ) {}

  async registerIEC({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    this.logger.log(`IEC registration attempt for: ${email}`, 'IECAuth');

    return await this.iecRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const existingIEC = await transactionalEntityManager.findOne(Iec, {
          where: { email },
        });

        if (existingIEC) {
          this.logger.warn(
            `IEC registration failed: Email ${email} already exists`,
            'IECAuth',
          );
          throw new Error('IEC with this email already exists');
        }

        const iec = new Iec();
        iec.name = name;
        iec.email = email;
        iec.password = await HashHelper.encrypt(password);

        await transactionalEntityManager.save(Iec, iec);

        this.logger.log(`IEC registered successfully: ${email}`, 'IECAuth');

        return { message: 'IEC registered successfully' };
      },
    );
  }

  async loginIEC({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<IecLoginResponse> {
    this.logger.log(`Login attempt for IEC: ${email}`, 'IECAuth');
    this.metricsService.trackAuthenticationAttempt('login', 'iec');

    return this.iecRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const iec = await transactionalEntityManager.findOne(Iec, {
          where: { email },
        });

        if (!iec) {
          this.logger.warn(
            `Login failed: IEC not found for email ${email}`,
            'IECAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_email',
            'iec',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const isPasswordValid = await HashHelper.compare(
          password,
          iec.password,
        );

        if (!isPasswordValid) {
          this.logger.warn(
            `Login failed: Invalid password for IEC ${email}`,
            'IECAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_password',
            'iec',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const payload: {
          id: string;
          name: string;
          email: string;
          role: 'IEC';
        } = {
          id: iec.id,
          name: iec.name,
          email: iec.email,
          role: 'IEC',
        };

        const access_token = this.jwtService.sign(payload);

        this.metricsService.trackAuthenticationSuccess('login', 'iec');
        this.metricsService.incrementActiveSessions();

        this.logger.log(
          `Login successful for IEC: ${email} (ID: ${iec.id})`,
          'IECAuth',
        );

        return {
          ...iec,
          token: access_token,
        };
      },
    );
  }
}
