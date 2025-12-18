import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { College } from './college.entity';

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
}
