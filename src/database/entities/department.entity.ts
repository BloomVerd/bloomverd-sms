import {
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { Faculty } from './faculty.entity';
import { Lecturer } from './lecturer.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Faculty, (faculty) => faculty.departments)
  faculty: Faculty;

  @ManyToMany(() => Lecturer, (lecturer) => lecturer.departments)
  lecturers: Lecturer[];

  @OneToMany(() => Class, (cls) => cls.department)
  classes: Class[];
}
