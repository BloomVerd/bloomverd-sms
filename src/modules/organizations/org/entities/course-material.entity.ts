import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FileType } from '../../../../shared/enums';
import { Course } from './course.entity';

@ObjectType('CourseMaterial')
@Entity('course_materials')
export class CourseMaterial {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => FileType)
  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.IMAGE,
  })
  type: FileType;

  @Field()
  @Column()
  mime: string;

  @Field()
  @Column()
  size: number;

  @Field()
  @Column()
  url: string;

  @ManyToOne(() => Course, (course) => course.materials)
  course: Course;
}
