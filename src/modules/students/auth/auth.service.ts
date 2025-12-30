import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities';
import { HashHelper } from '../../../shared/helpers';
import { StudentLoginResponse } from '../../../shared/types';
import { AuthProducer } from './auth.producer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private jwtService: JwtService,
    private readonly authProducer: AuthProducer,
  ) {}

  async loginStudent({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<StudentLoginResponse> {
    return await this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: {
            email,
          },
        });

        if (!student) {
          throw new BadRequestException('Email or password is incorrect');
        }

        const isPasswordValid = await HashHelper.compare(
          password,
          student.password || '',
        );

        if (!isPasswordValid)
          throw new BadRequestException('Email or password is incorrect');

        const payload: {
          id: string;
          name: string;
          email: string;
          role: 'STUDENT';
        } = {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          role: 'STUDENT',
        };

        const access_token = this.jwtService.sign(payload);

        return {
          ...student,
          token: access_token,
        };
      },
    );
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ message: string; resetToken: string }> {
    return this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: { email },
        });

        if (!student) {
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
          `Password reset email sent successfully: ${resetToken}`,
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
    return this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: {
            email,
          },
        });

        if (!student) {
          throw new BadRequestException('No student found');
        }

        if (
          student.reset_token === null ||
          student.reset_token_expires_at === null
        ) {
          throw new BadRequestException('No reset token provided');
        }

        if (student.reset_token_expires_at.valueOf() < new Date().valueOf()) {
          throw new BadRequestException('Reset token expired');
        }

        const hashedResetToken = await HashHelper.compare(
          token,
          student.reset_token,
        );

        if (!hashedResetToken) {
          throw new BadRequestException('Invalid or expired reset token');
        }

        // Update the student's password
        student.password = await HashHelper.encrypt(newPassword);

        // Invalidate the token
        student.reset_token = '';
        student.reset_token_expires_at = new Date();
        await this.studentRepository.save(student);

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
