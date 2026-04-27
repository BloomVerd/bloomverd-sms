import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Student } from '../student/entities/student.entity';
import { HashHelper } from '../../../shared/helpers';
import { AppLoggerService } from '../../../shared/services/logger.service';
import { MetricsService } from '../../../shared/services/metrics.service';
import { StudentLoginResponse } from '../../../shared/types';
import { AuthProducer } from './auth.producer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private jwtService: JwtService,
    private readonly authProducer: AuthProducer,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly logger: AppLoggerService,
  ) {}

  async loginStudent({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<StudentLoginResponse> {
    this.logger.log(`Login attempt for student: ${email}`, 'StudentAuth');
    this.metricsService.trackAuthenticationAttempt('login', 'student');

    return await this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: {
            email,
          },
        });

        if (!student) {
          this.logger.warn(
            `Login failed: Student not found for email ${email}`,
            'StudentAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_email',
            'student',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const isPasswordValid = await HashHelper.compare(
          password,
          student.password || '',
        );

        if (!isPasswordValid) {
          this.logger.warn(
            `Login failed: Invalid password for student ${email}`,
            'StudentAuth',
          );
          this.metricsService.trackAuthenticationFailure(
            'login',
            'invalid_password',
            'student',
          );
          throw new BadRequestException('Email or password is incorrect');
        }

        const access_token_payload: {
          id: string;
          name: string;
          email: string;
          type: 'access_token' | 'refresh_token';
          role: 'STUDENT';
        } = {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          type: 'access_token',
          role: 'STUDENT',
        };

        const refresh_token_payload: {
          id: string;
          type: 'access_token' | 'refresh_token';
          role: 'STUDENT';
        } = {
          id: student.id,
          type: 'refresh_token',
          role: 'STUDENT',
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

        this.metricsService.trackAuthenticationSuccess('login', 'student');
        this.metricsService.incrementActiveSessions();

        this.logger.log(
          `Login successful for student: ${email} (ID: ${student.id})`,
          'StudentAuth',
        );

        return {
          ...student,
          token: access_token,
          refresh_token: refresh_token,
          profile_url: student.profile_url || '',
        };
      },
    );
  }

  async verifyRefreshToken({ refresh_token }: { refresh_token: string }) {
    this.logger.log('Refresh token verification attempt', 'StudentAuth');
    this.metricsService.trackAuthenticationAttempt('refresh_token', 'student');

    try {
      const payload = await this.jwtService.verifyAsync(refresh_token);

      if (payload.type !== 'refresh_token') {
        this.logger.warn(
          'Refresh token verification failed: Invalid token type',
          'StudentAuth',
        );
        this.metricsService.trackAuthenticationFailure(
          'refresh_token',
          'invalid_token_type',
          'student',
        );
        throw new UnauthorizedException('Invalid token');
      }

      const student = await this.studentRepository.findOne({
        where: { id: payload.id },
      });

      if (!student) {
        this.logger.warn(
          `Refresh token verification failed: Student not found (ID: ${payload.id})`,
          'StudentAuth',
        );
        this.metricsService.trackAuthenticationFailure(
          'refresh_token',
          'student_not_found',
          'student',
        );
        throw new NotFoundException('Student not found');
      }

      const access_token_payload: {
        id: string;
        name: string;
        email: string;
        type: 'access_token' | 'refresh_token';
        role: 'STUDENT';
      } = {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        type: 'access_token',
        role: 'STUDENT',
      };

      const refresh_token_payload: {
        id: string;
        type: 'access_token' | 'refresh_token';
        role: 'STUDENT';
      } = {
        id: student.id,
        type: 'refresh_token',
        role: 'STUDENT',
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
        'student',
      );

      this.logger.log(
        `Refresh token verified successfully for student: ${student.email}`,
        'StudentAuth',
      );

      return {
        ...student,
        token: access_token,
        refresh_token: refresh_token_generated,
      };
    } catch (error) {
      this.metricsService.trackAuthenticationFailure(
        'refresh_token',
        'invalid_token',
        'student',
      );
      this.logger.error(
        `Refresh token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'StudentAuth',
      );
      throw new BadRequestException('Invalid refresh token', error);
    }
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ message: string; resetToken: string }> {
    this.logger.log(`Password reset requested for: ${email}`, 'StudentAuth');

    return this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: { email },
        });

        if (!student) {
          this.logger.warn(
            `Password reset failed: Student not found for email ${email}`,
            'StudentAuth',
          );
          throw new NotFoundException('Student with this email does not exist');
        }

        // Generate a unique token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await HashHelper.encrypt(resetToken);

        // Set token expiration to 1 hour from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Save the token in the student entity
        student.reset_token = hashedToken;
        student.reset_token_expires_at = expiresAt;
        await this.studentRepository.save(student);

        // Send email with the token
        await this.authProducer.sendPasswordResetEmail({ email, resetToken });

        this.logger.log(
          `Password reset email sent successfully for: ${email}`,
          'StudentAuth',
        );

        return {
          message: 'Password reset email sent successfully',
          resetToken,
        };
      },
    );
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Password reset attempt for: ${email}`, 'StudentAuth');

    return this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: {
            email,
          },
        });

        if (!student) {
          this.logger.warn(
            `Password reset failed: Student not found for email ${email}`,
            'StudentAuth',
          );
          throw new BadRequestException('No student found');
        }

        if (
          student.reset_token === null ||
          student.reset_token_expires_at === null
        ) {
          this.logger.warn(
            `Password reset failed: No reset token for ${email}`,
            'StudentAuth',
          );
          throw new BadRequestException('No reset token provided');
        }

        if (student.reset_token_expires_at.valueOf() < new Date().valueOf()) {
          this.logger.warn(
            `Password reset failed: Token expired for ${email}`,
            'StudentAuth',
          );
          throw new BadRequestException('Reset token expired');
        }

        const hashedResetToken = await HashHelper.compare(
          token,
          student.reset_token,
        );

        if (!hashedResetToken) {
          this.logger.warn(
            `Password reset failed: Invalid token for ${email}`,
            'StudentAuth',
          );
          throw new BadRequestException('Invalid or expired reset token');
        }

        // Update the student's password
        student.password = await HashHelper.encrypt(newPassword);

        // Invalidate the token
        student.reset_token = '';
        student.reset_token_expires_at = new Date();
        await this.studentRepository.save(student);

        this.logger.log(
          `Password reset successful for: ${email}`,
          'StudentAuth',
        );

        return { message: 'Password reset successfully' };
      },
    );
  }

  async sendEmail({
    email,
    resetToken,
  }: {
    email: string;
    resetToken: string;
  }) {
    // Placeholder logic for sending email
    // In a real implementation, you would integrate with an email service to send the email

    console.log(
      `Sending password reset email to ${email} with token: ${resetToken}`,
    );
  }
}
