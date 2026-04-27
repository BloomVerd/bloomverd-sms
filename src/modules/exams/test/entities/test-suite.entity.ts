import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Preamble } from './preamble.entity';
import { Question } from './question.entity';
import { Test } from './test.entity';

@ObjectType('TestSuite')
@Entity('test_suites')
export class TestSuite {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => [Question], { nullable: true })
  @ManyToMany(() => Question)
  @JoinTable({
    name: 'test_suite_questions',
    joinColumn: { name: 'suite_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'question_id', referencedColumnName: 'id' },
  })
  questions: Question[];

  @Field(() => [Preamble], { nullable: true })
  @ManyToMany(() => Preamble)
  @JoinTable({
    name: 'test_suite_preambles',
    joinColumn: { name: 'suite_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'preamble_id', referencedColumnName: 'id' },
  })
  preambles: Preamble[];

  @ManyToOne(() => Test, (test) => test.suites, { onDelete: 'CASCADE' })
  test: Test;
}
