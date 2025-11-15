import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Course } from './course.entity';
import { CourseTestResult } from './course-test-result.entity';

@Entity('course_tests')
export class CourseTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, (course) => course.tests)
  course: Course;

  @OneToMany(() => CourseTestResult, (result) => result.test)
  results: CourseTestResult[];
}
