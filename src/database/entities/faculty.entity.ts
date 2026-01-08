import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { College } from './college.entity';
import { Department } from './department.entity';
import { Fee } from './fee.entity';

@Entity('faculties')
export class Faculty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @ManyToOne(() => College, (college) => college.faculties)
  college: College;

  @OneToMany(() => Department, (department) => department.faculty)
  departments: Department[];

  @CreateDateColumn()
  inserted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Fee, (fee) => fee.faculty)
  fees: Fee[];
}
