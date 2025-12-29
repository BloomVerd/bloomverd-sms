import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from '../../../database/entities';
import { HashHelper } from '../../../shared/helpers';
import { StudentLoginResponse } from '../../../shared/types';
import { Repository } from 'typeorm';
import { AuthProducer } from './auth.producer';

@Injectable()
export class AuthService {
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
          student.password,
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

  async requestPasswordReset({ email }: { email: string }) {
    await this.authProducer.sendPasswordResetEmail({ email });

    return { message: 'Password reset email has been sent' };
  }

  async resetPassword({
    resetToken,
    password,
    email,
  }: {
    resetToken: string;
    password: string;
    email: string;
  }) {
    // Placeholder logic for resetting password
    // In a real implementation, you would verify the resetToken and update the password in the database

    await this.resetPassword({ resetToken, password, email });

    return { message: 'Password has been successfully reset' };
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
