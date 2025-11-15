import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('iecs')
export class Iec {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
