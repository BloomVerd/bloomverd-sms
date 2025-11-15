import { Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { College } from './college.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => College, (college) => college.organization)
  colleges: College[];
}
