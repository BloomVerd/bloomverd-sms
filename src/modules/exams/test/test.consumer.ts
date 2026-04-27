import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('exam-grading-queue')
export class TestConsumer extends WorkerHost {
  private readonly logger = new Logger(TestConsumer.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'grade-answer': {
        const { answerSubmissionId } = job.data as {
          answerSubmissionId: string;
        };
        this.logger.log(
          `Stub AI grading for AnswerSubmission ${answerSubmissionId} — no-op`,
        );
        break;
      }
      default:
        this.logger.warn(`Unknown job ${job.name} on exam-grading-queue`);
    }
  }
}
