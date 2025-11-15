import { Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';

@Entity('lecturers')
export class Lecturer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Department, (department) => department.lecturers)
  @JoinTable({
    name: 'lecturer_department',
    joinColumn: {
      name: 'lecture_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'department_id',
      referencedColumnName: 'id',
    },
  })
  departments: Department[];
}
