import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Semester } from './semester.entity';

@ObjectType('Class')
@Entity('classes')
export class Class {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  name: string;

  @Field(() => Department, { nullable: true })
  @ManyToOne(() => Department, (department) => department.classes)
  department: Department;

  @OneToMany(() => Semester, (semester) => semester.class)
  semesters: Semester[];

  @OneToMany('Student', (student: any) => student.class)
  students: Promise<any[]>;
}
