import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Organization } from './organization.entity';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Entity('lecturers')
export class Lecturer {
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

  @Column()
  password: string;

  @ManyToMany(() => Department, (department) => department.lecturers)
  @JoinTable({
    name: 'lecturer_department',
    joinColumn: {
      name: 'lecture_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'department_id',
      referencedColumnName: 'id',
    },
  })
  departments: Department[];

  @ManyToOne(() => Organization, (organization) => organization.colleges)
  organization: Organization;

  @CreateDateColumn()
  inserted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
