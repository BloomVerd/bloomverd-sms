import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TestAttemptState } from '../../../../shared/enums';
import { Student } from '../../../students/student/entities/student.entity';
import { AnswerSubmission } from './answer-submission.entity';
import { Test } from './test.entity';
import { TestSuite } from './test-suite.entity';

@ObjectType('TestAttempt')
@Entity('test_attempts')
export class TestAttempt {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => TestAttemptState)
  @Column({
    type: 'enum',
    enum: TestAttemptState,
    default: TestAttemptState.NOT_STARTED,
  })
  state: TestAttemptState;

  @Field(() => TestSuite, { nullable: true })
  @ManyToOne(() => TestSuite)
  suite: TestSuite;

  @Field(() => Test, { nullable: true })
  @ManyToOne(() => Test, (test) => test.attempts, { onDelete: 'CASCADE' })
  test: Test;

  @Field(() => Student, { nullable: true })
  @ManyToOne(() => Student)
  student: Student;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  ended_at: Date | null;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  extended_minutes: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Field(() => [AnswerSubmission], { nullable: true })
  @OneToMany(() => AnswerSubmission, (answer) => answer.attempt, {
    cascade: true,
  })
  answers: AnswerSubmission[];

  @Field()
  @CreateDateColumn()
  inserted_at: Date;

  @Field()
  @UpdateDateColumn()
  updated_at: Date;
}
