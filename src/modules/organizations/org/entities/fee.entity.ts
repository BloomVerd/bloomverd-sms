import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import {
  CurrencyType,
  FeeType,
  LevelType,
  StudentType,
} from '../../../../shared/enums';
import { Faculty } from './faculty.entity';

@ObjectType('Fee')
@Entity('fees')
export class Fee {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  fee_amount: number;

  @Field(() => CurrencyType)
  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.GHS,
  })
  currency: CurrencyType;

  @Field()
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: StudentType,
    default: StudentType.REGULAR,
  })
  student_type: StudentType;

  @Field(() => FeeType)
  @Column({
    type: 'enum',
    enum: FeeType,
    default: FeeType.OTHER,
  })
  fee_type: FeeType;

  @Field()
  @Column()
  description: string;

  @Field()
  @Column()
  year_group: number;

  @Field(() => LevelType)
  @Column({
    type: 'enum',
    enum: LevelType,
    default: LevelType.L100,
  })
  level: LevelType;

  @Field(() => Faculty, { nullable: true })
  @ManyToOne(() => Faculty, (faculty) => faculty.fees)
  faculty: Faculty;
}
