import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async getStudentSemesters(email: string) {
    const student = await this.studentRepository.findOne({
      where: { email },
      relations: ['class.semesters'],
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }
    return student?.class?.semesters || [];
  }

  async getStudentSemesterCourses({
    email,
    semesterId,
  }: {
    email: string;
    semesterId: string;
  }) {
    const student = await this.studentRepository.findOne({
      where: {
        email,
        class: {
          semesters: {
            id: semesterId,
          },
        },
      },

      relations: ['class.semesters.courses.materials'],
    });

    if (!student) {
      throw new BadRequestException('student not found');
    }

    return student?.class.semesters[0].courses;
  }

  async getStudentCourseMaterials({
    email,
    courseId,
  }: {
    email: string;
    courseId: string;
  }) {
    const student = await this.studentRepository.findOne({
      where: {
        email,
        class: {
          semesters: {
            courses: {
              id: courseId,
            },
          },
        },
      },

      relations: ['class.semesters.courses.materials'],
    });

    if (!student) {
      throw new BadRequestException('student not found');
    }

    return student?.class.semesters[0].courses[0].materials;
  }
}
