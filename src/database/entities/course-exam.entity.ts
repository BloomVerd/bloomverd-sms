import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Course } from './course.entity';
import { CourseExamResult } from './course-exam-result.entity';

@Entity('course_exams')
export class CourseExam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, (course) => course.exams)
  course: Course;

  @OneToMany(() => CourseExamResult, (result) => result.exam)
  results: CourseExamResult[];
}
