import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseExam } from './course-exam.entity';
import { CourseMaterial } from './course-material.entity';
import { Semester } from './semester.entity';

@ObjectType('Course')
@Entity('courses')
export class Course {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  course_code: string;

  @Field()
  @Column()
  credits: number;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ default: false })
  is_required: boolean;

  @ManyToMany(() => Semester, (semester) => semester.courses)
  @JoinTable({
    name: 'course_semester',
    joinColumn: {
      name: 'course_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'semester_id',
      referencedColumnName: 'id',
    },
  })
  semesters: Semester[];

  @OneToMany('Test', (test: any) => test.course)
  tests: Promise<any[]>;

  @Field(() => [CourseExam], { nullable: true })
  @OneToMany(() => CourseExam, (course_exam) => course_exam.course)
  exams: CourseExam[];

  @Field(() => [CourseMaterial], { nullable: true })
  @OneToMany(() => CourseMaterial, (course_material) => course_material.course)
  materials: CourseMaterial[];
}
