import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { College } from './college.entity';
import { Department } from './department.entity';

@Entity('faculties')
export class Faculty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => College, (college) => college.faculties)
  college: College;

  @OneToMany(() => Department, (department) => department.faculty)
  departments: Department[];
}
