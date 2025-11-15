import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('course_materials')
export class CourseMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
