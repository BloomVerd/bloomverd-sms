import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities';
import { SemesterStatus } from 'src/shared/enums';

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

  async getStudentSemesterResults({
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
            courses: {
              exams: {
                results: {
                  student_email: email,
                },
              },
            },
          },
        },
      },

      relations: ['class.semesters.courses.exams.results.exam.course'],
    });

    if (!student) {
      throw new BadRequestException('student not found');
    }

    return student?.class.semesters[0].courses
      .map((course) => {
        const results = course.exams.map((exam) => exam.results).flat();

        return results;
      })
      .flat();
  }

  async registerSemesterCoursesForStudent({
    email,
    courseIds,
  }: {
    email: string;
    courseIds: string[];
  }) {
    return this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const student = await transactionalEntityManager.findOne(Student, {
          where: {
            email,
          },

          relations: ['class.semesters.courses', 'registered_courses'],
        });

        if (!student) {
          throw new BadRequestException('student not found');
        }

        const currentSemester = student.class.semesters.find(
          (sem) => sem.status === SemesterStatus.IN_PROGRESS,
        );

        if (!currentSemester?.courses) {
          throw new BadRequestException(
            'There are no courses found for this semester',
          );
        }

        courseIds.forEach((courseId) => {
          const course = currentSemester?.courses.find(
            (crs) => crs.id === courseId,
          );

          if (!course) {
            throw new BadRequestException('course not found');
          }

          if (course.is_required) {
            throw new BadRequestException(
              `This ${course.name} is a required course`,
            );
          }
        });
        const requiredCourses = currentSemester?.courses.filter(
          (course) => course.is_required === true,
        );

        const optionalCourses = currentSemester?.courses.filter(
          (course) =>
            course.is_required === false && courseIds.includes(course.id),
        );

        student.registered_courses.push(
          ...(optionalCourses || []),
          ...(requiredCourses || []),
        );

        await transactionalEntityManager.save(student);
        return [...(optionalCourses || []), ...(requiredCourses || [])];
      },
    );
  }
}
