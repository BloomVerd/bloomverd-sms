import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CourseTest } from './course-test.entity';

@Entity('course_test_results')
export class CourseTestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourseTest, (course) => course.results)
  test: CourseTest;
}
