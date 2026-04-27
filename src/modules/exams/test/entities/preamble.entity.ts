import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { Test } from './test.entity';

@ObjectType('Preamble')
@Entity('preambles')
export class Preamble {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => Test, (test) => test.preambles, { onDelete: 'CASCADE' })
  test: Test;

  @Field(() => [Question], { nullable: true })
  @OneToMany(() => Question, (question) => question.preamble, { cascade: true })
  questions: Question[];
}
