import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Course } from './course.entity';
import { CourseExamResult } from './course-exam-result.entity';

@ObjectType('CourseExam')
@Entity('course_exams')
export class CourseExam {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.exams)
  course: Course;

  @OneToMany(() => CourseExamResult, (result) => result.exam)
  results: CourseExamResult[];
}
