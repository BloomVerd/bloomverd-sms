import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseExam } from '../../organizations/org/entities/course-exam.entity';
import { CourseExamResult } from '../../organizations/org/entities/course-exam-result.entity';
import { Organization } from '../../organizations/org/entities/organization.entity';
import { Student } from '../../students/student/entities/student.entity';
import { UploadExamResultsInput } from '../../../shared/inputs';

@Injectable()
export class IecService {
  private readonly logger = new Logger(IecService.name);

  constructor(
    /*
     * Inject organizationRepository
     *
     */
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    /*
     * Inject studentRepository
     *
     */
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    /*
     * Inject examRepository
     *
     */
    @InjectRepository(CourseExam)
    private courseExamRepository: Repository<CourseExam>,
    /*
     * Inject courseExamResultRepository
     *
     */
    @InjectRepository(CourseExamResult)
    private courseExamResultRepository: Repository<CourseExamResult>,
  ) {}

  async uploadExamResults({
    organizationEmail,
    iecEmail,
    results,
  }: {
    organizationEmail: string;
    iecEmail: string;
    results: UploadExamResultsInput[];
  }) {
    // Get the organization with which the IEC is associated
    const organization = await this.organizationRepository.findOne({
      where: { email: organizationEmail, iec: { email: iecEmail } },
    });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found or IEC not associated',
      );
    }

    // Loop through the results and upload each one
    // Add an errors array for students whose exam upload failed
    const errors: string[] = [];

    await Promise.all(
      results.map(async (result) => {
        try {
          // Find out if the student exist for that organization
          const student = await this.studentRepository.findOne({
            where: {
              email: result.student_email,
              class: {
                department: {
                  faculty: {
                    college: {
                      organization: {
                        email: organizationEmail,
                      },
                    },
                  },
                },
              },
            },
          });

          if (!student) {
            this.logger.error(
              `Student not found for email ${result.student_email}, result: ${JSON.stringify(result)}`,
            );
            errors.push(`Student not found for email ${result.student_email}`);
          }

          // Get the student's exam
          const exam = await this.courseExamRepository.findOne({
            where: {
              id: result.exam_id,
              course: {
                semesters: {
                  class: {
                    department: {
                      faculty: {
                        college: {
                          organization: {
                            email: organizationEmail,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            relations: ['results'],
          });

          if (!exam) {
            this.logger.error(
              `Exam not found for student ${result?.student_email}, result ${JSON.stringify(result)}`,
            );
            errors.push(
              `Exam not found for student ${result?.student_email}, result ${JSON.stringify(result)}`,
            );
          }

          // Update the exam result
          if (student && exam) {
            const existingResult = exam.results.find(
              (res) => res.student_email === result.student_email,
            );
            if (existingResult) {
              existingResult.student_email = result.student_email;
              existingResult.score = result.score;
              await this.courseExamResultRepository.save(existingResult);
            } else {
              const newResult = new CourseExamResult();
              newResult.exam = exam;
              newResult.student_email = result.student_email;
              newResult.score = result.score;
              await this.courseExamResultRepository.save(newResult);
            }
          }
        } catch (error) {
          errors.push(
            `Failed to upload exam result for student ${result.student_email}, error: ${error.message}`,
          );
        }
      }),
    );

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return { message: 'Exam results uploaded successfully' };
  }
}
