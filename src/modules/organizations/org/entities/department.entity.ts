import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@ObjectType('Department')
@Entity('departments')
export class Department {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  name: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Field(() => Faculty, { nullable: true })
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
