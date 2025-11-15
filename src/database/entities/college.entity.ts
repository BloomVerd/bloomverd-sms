import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';
import { Organization } from './organization.entity';

@Entity('colleges')
export class College {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (organization) => organization.colleges)
  organization: Organization;

  @OneToMany(() => Department, (department) => department.college)
  departments: Department[];
}
