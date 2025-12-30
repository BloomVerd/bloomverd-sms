import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gender } from '../../shared/enums';
import { Class } from './class.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone_number: string;

  @Column()
  address: string;

  @Column()
  date_of_birth: Date;

  @Column({ nullable: true })
  password: string;

  @Column({ default: null })
  reset_token: string;

  @Column({ default: null })
  reset_token_expires_at: Date;

  @ManyToOne(() => Class, (cls) => cls.students)
  class: Class;
}
