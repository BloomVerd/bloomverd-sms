import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FileType } from '../../shared/enums';
import { Course } from './course.entity';

@Entity('course_materials')
export class CourseMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.IMAGE,
  })
  type: FileType;

  @Column()
  mime: string;

  @Column()
  size: number;

  @Column()
  url: string;

  @ManyToOne(() => Course, (course) => course.materials)
  course: Course;
}
