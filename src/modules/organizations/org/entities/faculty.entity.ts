import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@ObjectType('Faculty')
@Entity('faculties')
export class Faculty {
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

  @Field(() => College, { nullable: true })
  @ManyToOne(() => College, (college) => college.faculties)
  college: College;

  @OneToMany(() => Department, (department) => department.faculty)
  departments: Department[];

  @CreateDateColumn()
  inserted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Field(() => [Fee], { nullable: true })
  @OneToMany(() => Fee, (fee) => fee.faculty)
  fees: Fee[];
}
