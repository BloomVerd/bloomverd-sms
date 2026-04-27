import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SemesterStatus } from '../../../../shared/enums';
import { Class } from './class.entity';
import { Course } from './course.entity';

@ObjectType('Semester')
@Entity('semesters')
export class Semester {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
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
