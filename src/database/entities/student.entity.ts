import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Class } from './class.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Class, (cls) => cls.students)
  class: Class;
}
