import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('iecs')
export class Iec {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Organization, (organization) => organization.iec)
  organizations: Organization[];
}
