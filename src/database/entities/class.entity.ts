import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Semester } from './semester.entity';
import { Student } from './student.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Department, (department) => department.classes)
  department: Department;

  @OneToMany(() => Semester, (semester) => semester.class)
  semesters: Semester[];

  @OneToMany(() => Student, (student) => student.class)
  students: Student[];
}
