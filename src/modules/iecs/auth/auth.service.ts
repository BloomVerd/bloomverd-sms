import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { HashHelper } from 'src/shared/helpers';
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
    return await this.iecRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const existingIEC = await transactionalEntityManager.findOne(Iec, {
          where: { email },
        });

        if (existingIEC) {
          throw new Error('IEC with this email already exists');
        }

        const iec = new Iec();
        iec.name = name;
        iec.email = email;
        iec.password = await HashHelper.encrypt(password);

        await transactionalEntityManager.save(Iec, iec);

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
    this.metricsService.trackAuthenticationAttempt('login', 'iec');

    return this.iecRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const iec = await transactionalEntityManager.findOne(Iec, {
          where: { email },
        });

        if (!iec) {
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

        return {
          ...iec,
          token: access_token,
        };
      },
    );
  }
}
