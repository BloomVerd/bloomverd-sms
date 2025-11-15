import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CourseExam } from './course-exam.entity';

@Entity('course_exam_results')
export class CourseExamResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourseExam, (exam) => exam.results)
  exam: CourseExam;
}
