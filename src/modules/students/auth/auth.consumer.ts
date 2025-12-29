import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AuthService } from './auth.service';

@Processor('student-queue')
export class AuthConsumer extends WorkerHost {
  constructor(private readonly studentAuthService: AuthService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-password-reset-email': {
        const data: {
          email: string;
          resetToken: string;
        } = job.data;

        await this.studentAuthService.sendEmail({
          email: data.email,
          resetToken: data.resetToken,
        });

        break;
      }
    }
  }
}
