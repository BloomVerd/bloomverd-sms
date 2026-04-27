import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { AcademicStructure } from 'src/shared/enums';

@Entity('organization_settings')
export class OrganizationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    default: 0,
  })
  credit_base_fee: number;

  @Column({
    type: 'enum',
    enum: AcademicStructure,
    default: AcademicStructure.ANNUAL,
  })
  academic_structure: AcademicStructure;

  @OneToOne(() => Organization, (organization) => organization.setting)
  organization: Organization;
}
