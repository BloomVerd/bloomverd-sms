import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Iec } from '../../../iecs/iec/entities/iec.entity';
import { College } from './college.entity';
import { OrganizationSetting } from './organization_setting.entity';

@ObjectType('Organization')
@Entity('organizations')
export class Organization {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  profile_url?: string;

  @Field()
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
