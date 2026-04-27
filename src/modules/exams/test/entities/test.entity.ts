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
import { TestPlatform, TestType } from '../../../../shared/enums';
import { Course } from '../../../organizations/org/entities/course.entity';
import { Lecturer } from '../../../organizations/org/entities/lecturer.entity';
import { Preamble } from './preamble.entity';
import { Question } from './question.entity';
import { TestAttempt } from './test-attempt.entity';
import { TestSuite } from './test-suite.entity';

@ObjectType('Test')
@Entity('tests')
export class Test {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field(() => TestType)
  @Column({ type: 'enum', enum: TestType })
  type: TestType;

  @Field(() => [TestPlatform])
  @Column({ type: 'enum', enum: TestPlatform, array: true, default: [] })
  platforms: TestPlatform[];

  @Field(() => Int)
  @Column({ type: 'int' })
  duration_minutes: number;

  @Field()
  @Column({ type: 'timestamp' })
  start_time: Date;

  @Field()
  @Column({ type: 'timestamp' })
  end_time: Date;

  @Field(() => Int)
  @Column({ type: 'int' })
  total_suites: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  total_questions_per_suite: number;

  @Field()
  @Column({ default: false })
  show_answer: boolean;

  @Column()
  secret: string;

  @Field(() => Course, { nullable: true })
  @ManyToOne(() => Course)
  course: Course;

  @Field(() => Lecturer, { nullable: true })
  @ManyToOne(() => Lecturer)
  lecturer: Lecturer;

  @Field(() => [Question], { nullable: true })
  @OneToMany(() => Question, (question) => question.test, { cascade: true })
  questions: Question[];

  @Field(() => [Preamble], { nullable: true })
  @OneToMany(() => Preamble, (preamble) => preamble.test, { cascade: true })
  preambles: Preamble[];

  @Field(() => [TestSuite], { nullable: true })
  @OneToMany(() => TestSuite, (suite) => suite.test, { cascade: true })
  suites: TestSuite[];

  @OneToMany('TestAttempt', (attempt: TestAttempt) => attempt.test)
  attempts: TestAttempt[];

  @Field()
  @CreateDateColumn()
  inserted_at: Date;

  @Field()
  @UpdateDateColumn()
  updated_at: Date;
}
