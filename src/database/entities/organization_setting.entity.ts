import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_settings')
export class OrganizationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    default: 0,
  })
  credit_base_fee: number;

  @OneToOne(() => Organization, (organization) => organization.setting)
  organization: Organization;
}
