import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { QuestionType } from '../../../../shared/enums';
import { Preamble } from './preamble.entity';
import { QuestionOption } from './question-option.type';
import { Test } from './test.entity';

@ObjectType('Question')
@Entity('questions')
export class Question {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @Field(() => QuestionType)
  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Field(() => [QuestionOption], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  options: QuestionOption[] | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  correct_answer: string | null;

  @Field(() => Int)
  @Column({ type: 'int' })
  marks: number;

  @Field(() => Preamble, { nullable: true })
  @ManyToOne(() => Preamble, (preamble) => preamble.questions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  preamble: Preamble | null;

  @ManyToOne(() => Test, (test) => test.questions, { onDelete: 'CASCADE' })
  test: Test;
}
