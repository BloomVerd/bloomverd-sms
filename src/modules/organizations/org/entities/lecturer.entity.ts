import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { Gender } from '../../../../shared/enums';
import { Department } from './department.entity';
import { Organization } from './organization.entity';

@ObjectType('Lecturer')
@Entity('lecturers')
export class Lecturer {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  profile_url: string;

  @Field(() => String)
  @Column()
  first_name: string;

  @Field(() => String)
  @Column()
  last_name: string;

  @Field(() => Gender)
  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Field(() => String)
  @Column({ unique: true })
  email: string;

  @Field(() => String)
  @Column({ unique: true })
  phone_number: string;

  @Field(() => String)
  @Column()
  address: string;

  @Field(() => Date)
  @Column()
  date_of_birth: Date;

  @Column({ nullable: true })
  password: string;

  @Field(() => [Department], { nullable: true })
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
