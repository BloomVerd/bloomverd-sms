import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Faculty } from './faculty.entity';
import { Organization } from './organization.entity';

@Entity('colleges')
export class College {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (organization) => organization.colleges)
  organization: Organization;

  @OneToMany(() => Faculty, (faculty) => faculty.college)
  faculties: Faculty[];
}
