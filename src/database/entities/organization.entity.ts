import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { College } from './college.entity';
import { Iec } from './iec.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => College, (college) => college.organization)
  colleges: College[];

  @ManyToOne(() => Iec, (iec) => iec.organizations)
  iec: Iec;
}
