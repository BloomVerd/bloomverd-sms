import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CourseExam } from './course-exam.entity';

@ObjectType('CourseExamResult')
@Entity('course_exam_results')
export class CourseExamResult {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  student_email: string;

  @Field()
  @Column()
  score: number;

  @Field(() => CourseExam)
  @ManyToOne(() => CourseExam, (exam) => exam.results)
  exam: CourseExam;
}
