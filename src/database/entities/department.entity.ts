import {
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { College } from './college.entity';
import { Lecturer } from './lecturer.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => College, (college) => college.departments)
  college: College;

  @ManyToMany(() => Lecturer, (lecturer) => lecturer.departments)
  lecturers: Lecturer[];

  @OneToMany(() => Class, (cls) => cls.department)
  classes: Class[];
}
