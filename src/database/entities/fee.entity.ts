import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import {
  CurrencyType,
  FeeType,
  LevelType,
  StudentType,
} from '../../shared/enums';
import { Faculty } from './faculty.entity';

@Entity('fees')
export class Fee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fee_amount: number;

  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.GHS,
  })
  currency: CurrencyType;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: StudentType,
    default: StudentType.REGULAR,
  })
  student_type: StudentType;

  @Column({
    type: 'enum',
    enum: FeeType,
    default: FeeType.OTHER,
  })
  fee_type: FeeType;

  @Column()
  description: string;

  @Column()
  year_group: number;

  @Column({
    type: 'enum',
    enum: LevelType,
    default: LevelType.L100,
  })
  level: LevelType;

  @ManyToOne(() => Faculty, (faculty) => faculty.fees)
  faculty: Faculty;
}
