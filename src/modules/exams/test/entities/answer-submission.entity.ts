import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Question } from './question.entity';
import { TestAttempt } from './test-attempt.entity';

@ObjectType('AnswerSubmission')
@Entity('answer_submissions')
export class AnswerSubmission {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Question, { nullable: true })
  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  question: Question;

  @ManyToOne('TestAttempt', (attempt: TestAttempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  attempt: TestAttempt;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  answer_text: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  selected_option: string | null;

  @Field(() => Boolean, { nullable: true })
  @Column({ type: 'boolean', nullable: true })
  is_correct: boolean | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  ai_feedback: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  marks_awarded: number | null;
}
