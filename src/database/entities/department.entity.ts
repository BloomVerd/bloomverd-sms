import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { Faculty } from './faculty.entity';
import { Lecturer } from './lecturer.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @ManyToOne(() => Faculty, (faculty) => faculty.departments)
  faculty: Faculty;

  @ManyToMany(() => Lecturer, (lecturer) => lecturer.departments)
  lecturers: Lecturer[];

  @OneToMany(() => Class, (cls) => cls.department)
  classes: Class[];

  @CreateDateColumn()
  inserted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
