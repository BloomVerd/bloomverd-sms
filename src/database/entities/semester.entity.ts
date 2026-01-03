import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { Course } from './course.entity';
import { SemesterStatus } from 'src/shared/enums';

@Entity('semesters')
export class Semester {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  semester_number: number;

  @Column({
    type: 'enum',
    default: SemesterStatus.PENDING,
    enum: SemesterStatus,
  })
  status: SemesterStatus;

  @ManyToOne(() => Class, (cls) => cls.semesters)
  class: Class;

  @ManyToMany(() => Course, (course) => course.semesters)
  courses: Course[];
}
