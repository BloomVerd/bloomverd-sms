import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Gender, StudentType } from '../../../../shared/enums';
import { Class } from '../../../organizations/org/entities/class.entity';
import { Course } from '../../../organizations/org/entities/course.entity';

@ObjectType('Student')
@Entity('students')
export class Student {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String)
  @Column()
  first_name: string;

  @Field(() => String)
  @Column()
  last_name: string;

  @Column()
  name: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  profile_url?: string;

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

  @Column({ nullable: true })
  reset_token: string;

  @Field(() => Number)
  @Column()
  year_group: number;

  @Column({ type: 'timestamp', nullable: true })
  reset_token_expires_at: Date;

  @Field(() => Class, { nullable: true })
  @ManyToOne(() => Class, (cls) => cls.students)
  class: Class;

  @Field(() => StudentType)
  @Column({
    type: 'enum',
    enum: StudentType,
    default: StudentType.REGULAR,
  })
  student_type: StudentType;

  @Field(() => [Course], { nullable: true })
  @ManyToMany(() => Course)
  @JoinTable({
    name: 'student_courses',
    joinColumn: {
      name: 'student_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'course_id',
      referencedColumnName: 'id',
    },
  })
  registered_courses: Course[];
}
