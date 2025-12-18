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
import { CourseTest } from './course-test.entity';
import { Semester } from './semester.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  course_code: string;

  @Column()
  credits: number;

  @Column()
  name: string;

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

  @OneToMany(() => CourseTest, (course_test) => course_test.course)
  tests: CourseTest[];

  @OneToMany(() => CourseExam, (course_exam) => course_exam.course)
  exams: CourseExam[];

  @OneToMany(() => CourseMaterial, (course_material) => course_material.course)
  materials: CourseMaterial[];
}
