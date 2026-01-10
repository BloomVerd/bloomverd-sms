import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { College } from './college.entity';
import { Iec } from './iec.entity';
import { OrganizationSetting } from './organization_setting.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  profile_url: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => College, (college) => college.organization)
  colleges: College[];

  @ManyToOne(() => Iec, (iec) => iec.organizations)
  iec: Iec;

  @OneToOne(() => OrganizationSetting, (setting) => setting.organization)
  @JoinColumn()
  setting: OrganizationSetting;
}
