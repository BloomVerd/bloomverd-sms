import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Gender, StudentType } from '../../shared/enums';
import { Class } from './class.entity';
import { Course } from './course.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  profile_url?: string;

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

  @Column({ nullable: true })
  reset_token: string;

  @Column()
  year_group: number;

  @Column({ type: 'timestamp', nullable: true })
  reset_token_expires_at: Date;

  @ManyToOne(() => Class, (cls) => cls.students)
  class: Class;

  @Column({
    type: 'enum',
    enum: StudentType,
    default: StudentType.REGULAR,
  })
  student_type: StudentType;

  @ManyToMany(() => Course)
  @JoinTable({
    name: 'student_courses',
    joinColumn: {
      name: 'student_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'course_id',
      referencedColumnName: 'id',
    },
  })
  registered_courses: Course[];
}
