import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { Fee } from 'src/database/entities/fee.entity';
import { UploadToAwsProvider } from 'src/modules/uploads/upload-to-aws.provider';
import { SemesterStatus } from 'src/shared/enums';
import { MetricsService } from 'src/shared/services/metrics.service';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Fee)
    private readonly feeRepository: Repository<Fee>,
    private readonly uploadToAwsProvider: UploadToAwsProvider,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
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

  async getStudentFees({ email }: { email: string }) {
    const student = await this.studentRepository.findOne({
      where: {
        email,
      },
    });
    if (!student) {
      throw new BadRequestException('student not found');
    }

    const fees = await this.feeRepository.find({
      where: {
        faculty: {
          departments: {
            classes: {
              students: {
                id: student.id,
              },
            },
          },
        },
        year_group: student.year_group,
      },
    });

    return fees;
  }

  async updateStudentProfileUrl({
    email,
    file,
  }: {
    email: string;
    file: FileUpload;
  }) {
    const student = await this.studentRepository.findOne({
      where: { email },
    });

    if (!student) {
      this.logger.error('Student not found!');
      throw new BadRequestException('Student not found!');
    }

    // Read the file stream and convert to buffer
    const { createReadStream, filename, mimetype } = await file;
    const stream = createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Create file object for AWS upload
    const fileForUpload = {
      buffer,
      originalname: filename,
      mimetype,
      size: buffer.length,
    } as Express.Multer.File;

    // Upload to AWS
    const path = await this.uploadToAwsProvider.fileupload(fileForUpload);

    // Create CloudFront URL
    const cloudfront_url = `https://${this.configService.get<string>('AWS_CLOUDFRONT_URL')}/${path}`;

    // Update the student's profile_url
    student.profile_url = cloudfront_url;
    await this.studentRepository.save(student);

    // Track file upload metrics
    this.metricsService.trackFileUpload(mimetype, Boolean(buffer?.length));

    this.logger.log(`Updated profile URL for student: ${student.id}`);

    return student;
  }
}
