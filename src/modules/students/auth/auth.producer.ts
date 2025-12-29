import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class AuthProducer {
  constructor(
    @InjectQueue('student-queue')
    private readonly studentQueue: Queue,
  ) {}

  async sendPasswordResetEmail({ email }: { email: string }) {
    await this.studentQueue.add('send-password-reset-email', {
      email,
    });
  }
}
