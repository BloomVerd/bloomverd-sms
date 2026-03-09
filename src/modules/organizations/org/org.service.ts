import {
  BadRequestException,
  Injectable,
  // Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AppLoggerService } from 'src/shared/services/logger.service';
import { FileUpload } from 'graphql-upload';
import { UploadToAwsProvider } from 'src/modules/uploads/upload-to-aws.provider';
import { OrganizationFacultyFilterInput } from 'src/shared/inputs/organization-faculty-filter.input';
import { MetricsService } from 'src/shared/services/metrics.service';
import { ILike, Repository } from 'typeorm';
import {
  Class,
  College,
  Course,
  CourseExam,
  CourseExamResult,
  CourseMaterial,
  Department,
  Faculty,
  Fee,
  Iec,
  Lecturer,
  Organization,
  Semester,
  Student,
} from '../../../database/entities';
import {
  AcademicStructure,
  FileType,
  Gender,
  SemesterStatus,
} from '../../../shared/enums';
import {
  getDateValidationError,
  getEmailValidationError,
  getPhoneValidationError,
  validateEnum,
  validateRequiredString,
} from '../../../shared/helpers';
import {
  AddClassInput,
  AddCollegeInput,
  AddDepartmentInput,
  AddFacultyInput,
  AddLecturerInput,
  AddStudentInput,
  CreateClassInput,
  CreateClassWithRelationshipInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateCourseWithRelationshipInput,
  CreateDepartmentInput,
  CreateDepartmentWithRelationshipInput,
  CreateFacultyInput,
  CreateFacultyWithRelationshipInput,
  CreateLecturerInput,
  CreateLecturerWithRelationshipInput,
  CreateStudentInput,
  CreateStudentWithRelationshipInput,
  OrganizationClassFilterInput,
  OrganizationCourseFilterInput,
  OrganizationDepartmentFilterInput,
  OrganizationLecturerFilterInput,
  OrganizationStudentFilterInput,
  UploadExamResultsInput,
} from '../../../shared/inputs';
import {
  ValidationFieldType,
  ValidationResponseType,
} from '../../../shared/types';
import { OrgProducer } from './org.producer';

@Injectable()
export class OrgService {
  constructor(
    private logger: AppLoggerService,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    @InjectRepository(Faculty)
    private facultyRepository: Repository<Faculty>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Lecturer)
    private lecturerRepository: Repository<Lecturer>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private readonly orgProducer: OrgProducer,
    @InjectRepository(Semester)
    private semesterRepository: Repository<Semester>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Fee)
    private feeRepository: Repository<Fee>,
    @InjectRepository(CourseExam)
    private courseExamRepository: Repository<CourseExam>,
    @InjectRepository(CourseExamResult)
    private courseExamResultRepository: Repository<CourseExamResult>,
    private readonly uploadToAwsProvider: UploadToAwsProvider,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Check for duplicate values within the submitted data array
   * @param items Array of items to check
   * @param fieldsToCheck Fields to check for duplicates
   * @returns Map of field -> Map of value -> array of item IDs with that value
   */
  private findDuplicatesInData<T extends { id: string }>(
    items: T[],
    fieldsToCheck: (keyof T)[],
  ): Map<string, Map<string, string[]>> {
    const result = new Map<string, Map<string, string[]>>();

    fieldsToCheck.forEach((field) => {
      const fieldMap = new Map<string, string[]>();

      items.forEach((item) => {
        const value = item[field];
        const normalizedValue =
          typeof value === 'string'
            ? value.trim().toLowerCase()
            : String(value);

        if (!fieldMap.has(normalizedValue)) {
          fieldMap.set(normalizedValue, []);
        }
        // @ts-expect-error error
        fieldMap?.get(normalizedValue).push(item.id);
      });

      result.set(String(field), fieldMap);
    });

    return result;
  }

  async createColleges({
    organizationEmail,
    colleges,
  }: {
    organizationEmail: string;
    colleges: CreateCollegeInput[];
  }) {
    return await this.collegeRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const new_colleges: College[] = await Promise.all(
          colleges.map(async (college) => {
            const new_college = new College();
            new_college.name = `${organization.id}-${college.name}`;
            new_college.email = college.email;
            new_college.organization = organization;

            return new_college;
          }),
        );

        this.logger.log(
          `Created ${new_colleges.length} college(s) successfully`,
        );
        return transactionalEntityManager.save(new_colleges);
      },
    );
  }

  async addOrganizationColleges({
    organizationEmail,
    colleges,
  }: {
    organizationEmail: string;
    colleges: AddCollegeInput[];
  }) {
    return await this.collegeRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const new_colleges: College[] = await Promise.all(
          colleges.map(async (college) => {
            const new_college = new College();
            new_college.name = `${organization.id}-${college.name}`;
            new_college.email = college.email;
            new_college.organization = organization;

            return new_college;
          }),
        );

        this.logger.log(
          `Created ${new_colleges.length} college(s) successfully`,
        );
        return transactionalEntityManager.save(new_colleges);
      },
    );
  }

  async setSemestersToInProgress({
    organizationEmail,
  }: {
    organizationEmail: string;
  }) {
    return this.semesterRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
            relations: ['colleges.faculties.departments.classes.semesters'],
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const classes = organization.colleges
          .map((college) =>
            college.faculties.map((faculty) =>
              faculty.departments.map((department) => department.classes),
            ),
          )
          .flat(3);
        const updatedSemesters = await Promise.all(
          classes.map((cls) => {
            for (let i = 1; i < cls.semesters.length + 1; i++) {
              const currentSemester = cls.semesters.find(
                (sem) => sem.semester_number === i,
              );
              if (currentSemester?.status === SemesterStatus.IN_PROGRESS) {
                return currentSemester;
              }
              if (currentSemester?.status === SemesterStatus.PENDING) {
                currentSemester.status = SemesterStatus.IN_PROGRESS;
                return currentSemester;
              }
            }
          }),
        );
        const filteredSemesters = updatedSemesters.filter(
          (semester) => semester !== undefined,
        );
        if (filteredSemesters.length === 0) {
          return [];
        }
        return transactionalEntityManager.save(filteredSemesters);
      },
    );
  }

  async setSemestersToCompleted({
    organizationEmail,
  }: {
    organizationEmail: string;
  }) {
    return this.semesterRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
            relations: [
              'colleges.faculties.departments.classes.semesters',
              'setting',
            ],
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const classes = organization.colleges
          .map((college) =>
            college.faculties.map((faculty) =>
              faculty.departments.map((department) => department.classes),
            ),
          )
          .flat(3);
        const updatedSemesters = await Promise.all(
          classes.map((cls) => {
            for (let i = 1; i < cls.semesters.length + 1; i++) {
              const currentSemester = cls.semesters.find(
                (sem) => sem.semester_number === i,
              );

              if (
                currentSemester?.status === SemesterStatus.IN_PROGRESS &&
                organization.setting.academic_structure ===
                  AcademicStructure.SEMESTER
              ) {
                currentSemester.status = SemesterStatus.COMPLETED;

                return [currentSemester];
              }

              if (
                currentSemester?.status === SemesterStatus.IN_PROGRESS &&
                organization.setting.academic_structure ===
                  AcademicStructure.ANNUAL
              ) {
                currentSemester.status = SemesterStatus.COMPLETED;
                const nextSemester = cls.semesters.find(
                  (semester) =>
                    semester.semester_number ===
                    currentSemester.semester_number + 1,
                );
                nextSemester!.status = SemesterStatus.COMPLETED;

                return [currentSemester, nextSemester];
              }
            }
          }),
        );
        const filteredSemesters = updatedSemesters
          .flat(1)
          .filter((semester) => semester !== undefined);
        if (filteredSemesters.length === 0) {
          return [];
        }
        return transactionalEntityManager.save(filteredSemesters);
      },
    );
  }

  async createFaculties({
    organizationEmail,
    faculties,
  }: {
    organizationEmail: string;
    faculties: CreateFacultyWithRelationshipInput[];
  }) {
    return await this.facultyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_faculties: Faculty[] = await Promise.all(
          faculties.map(async (faculty) => {
            const college = await transactionalEntityManager.findOne(College, {
              where: {
                email: faculty.collegeEmail,
                organization: {
                  email: organizationEmail,
                },
              },
              relations: ['organization'],
            });

            if (!college) {
              this.logger.error('College not found!');
              throw new BadRequestException('College not found!');
            }

            const new_faculty = new Faculty();
            new_faculty.email = faculty.email;
            new_faculty.name = `${college.organization.id}-${faculty.name}`;
            new_faculty.college = college;

            return new_faculty;
          }),
        );

        this.logger.log(
          `Created ${new_faculties.length} faculties(s) successfully`,
        );
        return transactionalEntityManager.save(new_faculties);
      },
    );
  }

  async addOrganizationFaculties({
    organizationEmail,
    faculties,
    collegeId,
  }: {
    organizationEmail: string;
    faculties: AddFacultyInput[];
    collegeId: string;
  }) {
    return await this.facultyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const college = await transactionalEntityManager.findOne(College, {
          where: {
            id: collegeId,
            organization: {
              email: organizationEmail,
            },
          },
          relations: ['organization'],
        });

        if (!college) {
          this.logger.error('College not found!');
          throw new BadRequestException('College not found!');
        }
        const new_faculties: Faculty[] = await Promise.all(
          faculties.map(async (faculty) => {
            const new_faculty = new Faculty();
            new_faculty.email = faculty.email;
            new_faculty.name = `${college.organization.id}-${faculty.name}`;
            new_faculty.college = college;

            return new_faculty;
          }),
        );

        this.logger.log(
          `Created ${new_faculties.length} faculties(s) successfully`,
        );
        return transactionalEntityManager.save(new_faculties);
      },
    );
  }

  async validateCollegeData({
    organizationEmail,
    colleges,
  }: {
    organizationEmail: string;
    colleges: CreateCollegeInput[];
  }) {
    return await this.collegeRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(colleges, [
          'email',
          'name',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              // This value appears multiple times in submitted data
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field: fieldName as ValidationFieldType,
                  input: value,
                  message: `This ${fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          colleges.map(async (college) => {
            // ✅ Validate email format
            const emailError = getEmailValidationError(college.email);
            if (emailError) {
              errors.push({
                id: college.id,
                field: 'email',
                input: college.email,
                message: emailError,
              });
            }

            // ✅ Validate name is required and not empty
            const nameError = validateRequiredString(
              college.name,
              'College name',
              1,
              255,
            );
            if (nameError) {
              errors.push({
                id: college.id,
                field: 'name',
                input: college.name,
                message: nameError,
              });
            }

            // ✅ Check for duplicate name in database
            const existing_college_by_name =
              await transactionalEntityManager.findOne(College, {
                where: {
                  name: `${organization.id}-${college.name}`,
                },
              });

            if (existing_college_by_name) {
              errors.push({
                id: college.id,
                field: 'name',
                input: college.name,
                message: 'Name already taken',
              });
            }

            // ✅ Check for duplicate email in database
            const existing_college_by_email =
              await transactionalEntityManager.findOne(College, {
                where: {
                  email: college.email,
                  organization: {
                    email: organizationEmail,
                  },
                },
              });

            if (existing_college_by_email) {
              errors.push({
                id: college.id,
                field: 'email',
                input: college.email,
                message: 'Email already taken',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  /**
   * FACULTY VALIDATION
   * Validates: email format, name required, duplicates (in data and database)
   */
  async validateFacultyData({
    organizationEmail,
    faculties,
  }: {
    organizationEmail: string;
    faculties: CreateFacultyInput[];
  }) {
    return await this.facultyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data

        const duplicatesInData = this.findDuplicatesInData(faculties, [
          'email',
          'name',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field: fieldName as ValidationFieldType,
                  input: value,
                  message: `This ${fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          faculties.map(async (faculty) => {
            // ✅ Validate email format
            const emailError = getEmailValidationError(faculty.email);
            if (emailError) {
              errors.push({
                id: faculty.id,
                field: 'email',
                input: faculty.email,
                message: emailError,
              });
            }

            // ✅ Validate name is required and not empty
            const nameError = validateRequiredString(
              faculty.name,
              'Faculty name',
              1,
              255,
            );
            if (nameError) {
              errors.push({
                id: faculty.id,
                field: 'name',
                input: faculty.name,
                message: nameError,
              });
            }

            // ✅ Check for duplicate name in database
            const existing_faculty_by_name =
              await transactionalEntityManager.findOne(Faculty, {
                where: {
                  name: `${organization.id}-${faculty.name}`,
                },
              });

            if (existing_faculty_by_name) {
              errors.push({
                id: faculty.id,
                field: 'name',
                input: faculty.name,
                message: 'Faculty with this name already exists in database',
              });
            }

            // ✅ Check for duplicate email in database
            const existing_faculty_by_email =
              await transactionalEntityManager.findOne(Faculty, {
                where: {
                  email: faculty.email,
                  college: {
                    organization: {
                      email: organizationEmail,
                    },
                  },
                },
              });

            if (existing_faculty_by_email) {
              errors.push({
                id: faculty.id,
                field: 'email',
                input: faculty.email,
                message: 'Faculty with this email already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async createDepartments({
    organizationEmail,
    departments,
  }: {
    organizationEmail: string;
    departments: CreateDepartmentWithRelationshipInput[];
  }) {
    return await this.departmentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_departments: Department[] = await Promise.all(
          departments.map(async (department) => {
            const faculty = await transactionalEntityManager.findOne(Faculty, {
              where: {
                email: department.facultyEmail,
                college: {
                  organization: { email: organizationEmail },
                },
              },
              relations: ['college.organization'],
            });

            if (!faculty) {
              this.logger.error('Faculty not found!');
              throw new BadRequestException('Faculty not found!');
            }

            const new_department = new Department();
            new_department.email = department.email;
            new_department.name = `${faculty.college.organization.id}-${department.name}`;
            new_department.faculty = faculty;

            return new_department;
          }),
        );

        this.logger.log(
          `Created ${new_departments.length} department(s) successfully`,
        );
        return transactionalEntityManager.save(new_departments);
      },
    );
  }

  async addOrganizationDepartments({
    organizationEmail,
    departments,
    facultyId,
  }: {
    organizationEmail: string;
    departments: AddDepartmentInput[];
    facultyId: string;
  }) {
    return await this.departmentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const faculty = await transactionalEntityManager.findOne(Faculty, {
          where: {
            id: facultyId,
            college: {
              organization: { email: organizationEmail },
            },
          },
          relations: ['college.organization'],
        });

        if (!faculty) {
          this.logger.error('Faculty not found!');
          throw new BadRequestException('Faculty not found!');
        }
        const new_departments: Department[] = await Promise.all(
          departments.map(async (department) => {
            const new_department = new Department();
            new_department.email = department.email;
            new_department.name = `${faculty.college.organization.id}-${department.name}`;
            new_department.faculty = faculty;

            return new_department;
          }),
        );

        this.logger.log(
          `Created ${new_departments.length} department(s) successfully`,
        );
        return transactionalEntityManager.save(new_departments);
      },
    );
  }

  /**
   * DEPARTMENT VALIDATION
   * Validates: email format, name required, duplicates (in data and database)
   */
  async validateDepartmentData({
    organizationEmail,
    departments,
  }: {
    organizationEmail: string;
    departments: CreateDepartmentInput[];
  }) {
    return await this.departmentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(departments, [
          'email',
          'name',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field: fieldName as ValidationFieldType,
                  input: value,
                  message: `This ${fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          departments.map(async (department) => {
            // ✅ Validate email format
            const emailError = getEmailValidationError(department.email);
            if (emailError) {
              errors.push({
                id: department.id,
                field: 'email',
                input: department.email,
                message: emailError,
              });
            }

            // ✅ Validate name is required and not empty
            const nameError = validateRequiredString(
              department.name,
              'Department name',
              1,
              255,
            );
            if (nameError) {
              errors.push({
                id: department.id,
                field: 'name',
                input: department.name,
                message: nameError,
              });
            }

            // ✅ Check for duplicate name in database
            const existing_department_by_name =
              await transactionalEntityManager.findOne(Department, {
                where: {
                  name: `${organization.id}-${department.name}`,
                },
              });

            if (existing_department_by_name) {
              errors.push({
                id: department.id,
                field: 'name',
                input: department.name,
                message: 'Department with this name already exists in database',
              });
            }

            // ✅ Check for duplicate email in database
            const existing_department_by_email =
              await transactionalEntityManager.findOne(Department, {
                where: {
                  email: department.email,
                  faculty: {
                    college: {
                      organization: {
                        email: organizationEmail,
                      },
                    },
                  },
                },
              });

            if (existing_department_by_email) {
              errors.push({
                id: department.id,
                field: 'email',
                input: department.email,
                message:
                  'Department with this email already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async createLecturers({
    organizationEmail,
    lecturers,
  }: {
    organizationEmail: string;
    lecturers: CreateLecturerWithRelationshipInput[];
  }) {
    return await this.lecturerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_lecturers: Lecturer[] = await Promise.all(
          lecturers.map(async (lecturer) => {
            const department = await transactionalEntityManager.findOne(
              Department,
              {
                where: {
                  email: lecturer.departmentEmail,
                  faculty: {
                    college: {
                      organization: {
                        email: organizationEmail,
                      },
                    },
                  },
                },
                relations: ['faculty.college.organization'],
              },
            );

            if (!department) {
              this.logger.error('Department not found!');
              throw new BadRequestException('Department not found!');
            }

            const new_lecturer = new Lecturer();
            new_lecturer.email = lecturer.email;
            new_lecturer.first_name = lecturer.firstName;
            new_lecturer.last_name = lecturer.lastName;
            new_lecturer.name = `${lecturer.firstName} ${lecturer.lastName}`;
            new_lecturer.gender = lecturer.gender;
            new_lecturer.phone_number = lecturer.phoneNumber;
            new_lecturer.address = lecturer.address;
            new_lecturer.date_of_birth = lecturer.dateOfBirth;
            new_lecturer.organization = department.faculty.college.organization;
            new_lecturer.departments = [department];

            return new_lecturer;
          }),
        );

        this.logger.log(
          `Created ${new_lecturers.length} lecturer(s) successfully`,
        );
        return transactionalEntityManager.save(new_lecturers);
      },
    );
  }

  async addOrganizationLecturers({
    organizationEmail,
    lecturers,
    departmentId,
  }: {
    organizationEmail: string;
    lecturers: AddLecturerInput[];
    departmentId: string;
  }) {
    return await this.lecturerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const department = await transactionalEntityManager.findOne(
          Department,
          {
            where: {
              id: departmentId,
              faculty: {
                college: {
                  organization: {
                    email: organizationEmail,
                  },
                },
              },
            },
            relations: ['faculty.college.organization'],
          },
        );

        if (!department) {
          this.logger.error('Department not found!');
          throw new BadRequestException('Department not found!');
        }

        const new_lecturers: Lecturer[] = await Promise.all(
          lecturers.map(async (lecturer) => {
            const new_lecturer = new Lecturer();
            new_lecturer.email = lecturer.email;
            new_lecturer.first_name = lecturer.firstName;
            new_lecturer.last_name = lecturer.lastName;
            new_lecturer.gender = lecturer.gender;
            new_lecturer.phone_number = lecturer.phoneNumber;
            new_lecturer.address = lecturer.address;
            new_lecturer.date_of_birth = lecturer.dateOfBirth;
            new_lecturer.organization = department.faculty.college.organization;
            new_lecturer.departments = [department];

            return new_lecturer;
          }),
        );

        this.logger.log(
          `Created ${new_lecturers.length} lecturer(s) successfully`,
        );
        return transactionalEntityManager.save(new_lecturers);
      },
    );
  }

  /**
   * LECTURER VALIDATION
   * Validates: email format, phone format, firstName required, lastName required,
   * gender enum, dateOfBirth, address, duplicates (in data and database)
   */
  async validateLecturerData({
    organizationEmail,
    lecturers,
  }: {
    organizationEmail: string;
    lecturers: CreateLecturerInput[];
  }) {
    return await this.lecturerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(lecturers, [
          'email',
          'phoneNumber',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field:
                    fieldName === 'phoneNumber'
                      ? 'phone_number'
                      : (fieldName as ValidationFieldType),
                  input: value,
                  message: `This ${fieldName === 'phoneNumber' ? 'phone number' : fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          lecturers.map(async (lecturer) => {
            // ✅ Validate email format
            const emailError = getEmailValidationError(lecturer.email);
            if (emailError) {
              errors.push({
                id: lecturer.id,
                field: 'email',
                input: lecturer.email,
                message: emailError,
              });
            }

            // ✅ Validate firstName
            const firstNameError = validateRequiredString(
              lecturer.firstName,
              'First name',
              1,
              100,
            );
            if (firstNameError) {
              errors.push({
                id: lecturer.id,
                field: 'first_name',
                input: lecturer.firstName,
                message: firstNameError,
              });
            }

            // ✅ Validate lastName
            const lastNameError = validateRequiredString(
              lecturer.lastName,
              'Last name',
              1,
              100,
            );
            if (lastNameError) {
              errors.push({
                id: lecturer.id,
                field: 'last_name',
                input: lecturer.lastName,
                message: lastNameError,
              });
            }

            // ✅ Validate gender enum
            const genderError = validateEnum(
              lecturer.gender,
              [Gender.MALE, Gender.FEMALE],
              'Gender',
            );
            if (genderError) {
              errors.push({
                id: lecturer.id,
                field: 'gender',
                input: lecturer.gender,
                message: genderError,
              });
            }

            // ✅ Validate dateOfBirth
            const dateError = getDateValidationError(
              lecturer.dateOfBirth,
              'Date of birth',
            );
            if (dateError) {
              errors.push({
                id: lecturer.id,
                field: 'date_of_birth',
                input: new Date(lecturer.dateOfBirth).toISOString(),
                message: dateError,
              });
            }

            // ✅ Validate address
            const addressError = validateRequiredString(
              lecturer.address,
              'Address',
              1,
              500,
            );
            if (addressError) {
              errors.push({
                id: lecturer.id,
                field: 'address',
                input: lecturer.address,
                message: addressError,
              });
            }

            // ✅ Validate phone number
            const phoneError = getPhoneValidationError(lecturer.phoneNumber);
            if (phoneError) {
              errors.push({
                id: lecturer.id,
                field: 'phone_number',
                input: lecturer.phoneNumber,
                message: phoneError,
              });
            }

            // ✅ Check for duplicate email in database
            const existing_lecturer_by_email =
              await transactionalEntityManager.findOne(Lecturer, {
                where: {
                  email: lecturer.email,
                },
              });

            if (existing_lecturer_by_email) {
              errors.push({
                id: lecturer.id,
                field: 'email',
                input: lecturer.email,
                message: 'Lecturer with this email already exists in database',
              });
            }

            // ✅ Check for duplicate phone number in database
            const existing_lecturer_by_phone_number =
              await transactionalEntityManager.findOne(Lecturer, {
                where: {
                  phone_number: lecturer.phoneNumber,
                },
              });

            if (existing_lecturer_by_phone_number) {
              errors.push({
                id: lecturer.id,
                field: 'phone_number',
                input: lecturer.phoneNumber,
                message:
                  'Lecturer with this phone number already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async createClasses({
    organizationEmail,
    classes,
  }: {
    organizationEmail: string;
    classes: CreateClassWithRelationshipInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_classes: Class[] = await Promise.all(
          classes.map(async (dep_class) => {
            const department = await transactionalEntityManager.findOne(
              Department,
              {
                where: {
                  email: dep_class.departmentEmail,
                  faculty: {
                    college: {
                      organization: {
                        email: organizationEmail,
                      },
                    },
                  },
                },
                relations: ['faculty.college.organization'],
              },
            );

            if (!department) {
              this.logger.error('Department not found!');
              throw new BadRequestException('Department not found!');
            }

            const new_class = new Class();
            new_class.name = `${department.faculty.college.organization.id}-${dep_class.name}`;
            new_class.department = department;

            return new_class;
          }),
        );

        this.logger.log(
          `Created ${new_classes.length} department class(es) successfully`,
        );

        await transactionalEntityManager.save(new_classes);

        new_classes.forEach(async (new_class) => {
          const semesters = [];
          const numOfSemesters =
            classes.find((cls) => new_class.name.includes(cls.name))
              ?.numberOfSemesters || 0;

          for (let i = 1; i < numOfSemesters + 1; i++) {
            semesters.push(i);
          }

          const new_semesters: Semester[] = await Promise.all(
            semesters.map(async (sem_num) => {
              const new_semester = new Semester();
              new_semester.semester_number = sem_num;
              new_semester.class = new_class;
              return new_semester;
            }),
          );

          await transactionalEntityManager.save(new_semesters);
        });

        return new_classes;
      },
    );
  }

  async addOrganizationClasses({
    organizationEmail,
    classes,
    departmentId,
  }: {
    organizationEmail: string;
    classes: AddClassInput[];
    departmentId: string;
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const department = await transactionalEntityManager.findOne(
          Department,
          {
            where: {
              id: departmentId,
              faculty: {
                college: {
                  organization: {
                    email: organizationEmail,
                  },
                },
              },
            },
            relations: ['faculty.college.organization'],
          },
        );

        if (!department) {
          this.logger.error('Department not found!');
          throw new BadRequestException('Department not found!');
        }
        const new_classes: Class[] = await Promise.all(
          classes.map(async (dep_class) => {
            const new_class = new Class();
            new_class.name = `${department.faculty.college.organization.id}-${dep_class.name}`;
            new_class.department = department;

            return new_class;
          }),
        );

        this.logger.log(
          `Created ${new_classes.length} department class(es) successfully`,
        );

        await transactionalEntityManager.save(new_classes);

        new_classes.forEach(async (new_class) => {
          const semesters = [];
          const numOfSemesters =
            classes.find((cls) => new_class.name.includes(cls.name))
              ?.numberOfSemesters || 0;

          for (let i = 1; i < numOfSemesters + 1; i++) {
            semesters.push(i);
          }

          const new_semesters: Semester[] = await Promise.all(
            semesters.map(async (sem_num) => {
              const new_semester = new Semester();
              new_semester.semester_number = sem_num;
              new_semester.class = new_class;
              return new_semester;
            }),
          );

          await transactionalEntityManager.save(new_semesters);
        });

        return new_classes;
      },
    );
  }

  /**
   * CLASS VALIDATION
   * Validates: name required, duplicates (in data and database)
   */
  async validateClassData({
    organizationEmail,
    classes,
  }: {
    organizationEmail: string;
    classes: CreateClassInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(classes, [
          'name',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field: fieldName as ValidationFieldType,
                  input: value,
                  message: `This ${fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          classes.map(async (depClass) => {
            // ✅ Validate name is required and not empty
            const nameError = validateRequiredString(
              depClass.name,
              'Class name',
              1,
              255,
            );
            if (nameError) {
              errors.push({
                id: depClass.id,
                field: 'name',
                input: depClass.name,
                message: nameError,
              });
            }

            // ✅ Check for duplicate name in database
            const existing_class_by_name =
              await transactionalEntityManager.findOne(Class, {
                where: {
                  name: `${organization.id}-${depClass.name}`,
                },
              });

            if (existing_class_by_name) {
              errors.push({
                id: depClass.id,
                field: 'name',
                input: depClass.name,
                message: 'Class with this name already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async createStudents({
    organizationEmail,
    students,
  }: {
    organizationEmail: string;
    students: CreateStudentWithRelationshipInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_students: Student[] = await Promise.all(
          students.map(async (student) => {
            const organization = await transactionalEntityManager.findOne(
              Organization,
              {
                where: {
                  email: organizationEmail,
                },
              },
            );

            if (!organization) {
              this.logger.error('Organization not found!');
              throw new BadRequestException('Organization not found!');
            }

            const dep_class = await transactionalEntityManager.findOne(Class, {
              where: {
                name: `${organization.id}-${student.className}`,
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
            });

            if (!dep_class) {
              this.logger.error('Class not found!');
              throw new BadRequestException('Class not found!');
            }

            const new_student = new Student();
            new_student.first_name = student.firstName;
            new_student.last_name = student.lastName;
            new_student.name = `${student.firstName} ${student.lastName}`;
            new_student.email = student.email;
            new_student.date_of_birth = student.dateOfBirth;
            new_student.gender = student.gender;
            new_student.address = student.address;
            new_student.phone_number = student.phoneNumber;
            new_student.year_group = student.yearGroup;

            new_student.class = dep_class;

            return new_student;
          }),
        );

        this.logger.log(
          `Created ${new_students.length} student(s) successfully`,
        );

        const savedStudents =
          await transactionalEntityManager.save(new_students);

        // Track student creation metrics
        savedStudents.forEach(() => {
          this.metricsService.trackStudentCreated();
        });

        return savedStudents;
      },
    );
  }

  async addOrganizationStudents({
    organizationEmail,
    students,
    classId,
  }: {
    organizationEmail: string;
    students: AddStudentInput[];
    classId: string;
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organization not found!');
          throw new BadRequestException('Organization not found!');
        }

        const dep_class = await transactionalEntityManager.findOne(Class, {
          where: {
            id: classId,
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
        });

        if (!dep_class) {
          this.logger.error('Class not found!');
          throw new BadRequestException('Class not found!');
        }

        const new_students: Student[] = await Promise.all(
          students.map(async (student) => {
            const new_student = new Student();
            new_student.first_name = student.firstName;
            new_student.last_name = student.lastName;
            new_student.email = student.email;
            new_student.date_of_birth = student.dateOfBirth;
            new_student.gender = student.gender;
            new_student.address = student.address;
            new_student.phone_number = student.phoneNumber;
            new_student.year_group = student.yearGroup;

            new_student.class = dep_class;

            return new_student;
          }),
        );

        this.logger.log(
          `Created ${new_students.length} student(s) successfully`,
        );

        const savedStudents =
          await transactionalEntityManager.save(new_students);

        // Track student creation metrics
        savedStudents.forEach(() => {
          this.metricsService.trackStudentCreated();
        });

        return savedStudents;
      },
    );
  }

  /**
   * STUDENT VALIDATION
   * Validates: email format, phone format, firstName required, lastName required,
   * gender enum, dateOfBirth, address, duplicates (in data and database)
   */
  async validateStudentData({
    organizationEmail,
    students,
  }: {
    organizationEmail: string;
    students: CreateStudentInput[];
  }) {
    return await this.studentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(students, [
          'email',
          'phoneNumber',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field:
                    fieldName === 'phoneNumber'
                      ? 'phone_number'
                      : (fieldName as ValidationFieldType),
                  input: value,
                  message: `This ${fieldName === 'phoneNumber' ? 'phone number' : fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          students.map(async (student) => {
            // ✅ Validate email format
            const emailError = getEmailValidationError(student.email);
            if (emailError) {
              errors.push({
                id: student.id,
                field: 'email',
                input: student.email,
                message: emailError,
              });
            }

            // ✅ Validate firstName
            const firstNameError = validateRequiredString(
              student.firstName,
              'First name',
              1,
              100,
            );
            if (firstNameError) {
              errors.push({
                id: student.id,
                field: 'first_name',
                input: student.firstName,
                message: firstNameError,
              });
            }

            // ✅ Validate lastName
            const lastNameError = validateRequiredString(
              student.lastName,
              'Last name',
              1,
              100,
            );
            if (lastNameError) {
              errors.push({
                id: student.id,
                field: 'last_name',
                input: student.lastName,
                message: lastNameError,
              });
            }

            // ✅ Validate gender enum
            const genderError = validateEnum(
              student.gender,
              [Gender.MALE, Gender.FEMALE],
              'Gender',
            );
            if (genderError) {
              errors.push({
                id: student.id,
                field: 'gender',
                input: student.gender,
                message: genderError,
              });
            }

            // ✅ Validate dateOfBirth
            const dateError = getDateValidationError(
              student.dateOfBirth,
              'Date of birth',
            );
            if (dateError) {
              errors.push({
                id: student.id,
                field: 'date_of_birth',
                input: new Date(student.dateOfBirth).toISOString(),
                message: dateError,
              });
            }

            // ✅ Validate address
            const addressError = validateRequiredString(
              student.address,
              'Address',
              1,
              500,
            );
            if (addressError) {
              errors.push({
                id: student.id,
                field: 'address',
                input: student.address,
                message: addressError,
              });
            }

            // ✅ Validate phone number
            const phoneError = getPhoneValidationError(student.phoneNumber);
            if (phoneError) {
              errors.push({
                id: student.id,
                field: 'phone_number',
                input: student.phoneNumber,
                message: phoneError,
              });
            }

            // ✅ Check for duplicate email in database
            const existing_student_by_email =
              await transactionalEntityManager.findOne(Student, {
                where: {
                  email: student.email,
                },
              });

            if (existing_student_by_email) {
              errors.push({
                id: student.id,
                field: 'email',
                input: student.email,
                message: 'Student with this email already exists in database',
              });
            }

            // ✅ Check for duplicate phone number in database
            const existing_student_by_phone_number =
              await transactionalEntityManager.findOne(Student, {
                where: {
                  phone_number: student.phoneNumber,
                },
              });

            if (existing_student_by_phone_number) {
              errors.push({
                id: student.id,
                field: 'phone_number',
                input: student.phoneNumber,
                message:
                  'Student with this phone number already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async createCourses({
    organizationEmail,
    courses,
  }: {
    organizationEmail: string;
    courses: CreateCourseWithRelationshipInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const new_semester_courses: Course[] = await Promise.all(
          courses.map(async (course) => {
            const organization = await transactionalEntityManager.findOne(
              Organization,
              {
                where: {
                  email: organizationEmail,
                },
              },
            );

            if (!organization) {
              this.logger.error('Organization not found!');
              throw new BadRequestException('Organization not found!');
            }

            const semester = await transactionalEntityManager.findOne(
              Semester,
              {
                where: {
                  semester_number: course.semesterNumber,
                  class: {
                    name: `${organization.id}-${course.className}`,
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
                relations: ['class.department.faculty.college.organization'],
              },
            );

            if (!semester) {
              this.logger.error('Semester not found!');
              throw new BadRequestException('semester not found!');
            }

            const courseExam = new CourseExam();
            await transactionalEntityManager.save(courseExam);

            const new_semester_course = new Course();
            new_semester_course.course_code = `${semester.class.department.faculty.college.organization.id}-${course.code}`;
            new_semester_course.name = course.name;
            new_semester_course.credits = course.credits;
            new_semester_course.semesters = [semester];
            new_semester_course.exams = [courseExam];
            new_semester_course.is_required = course.isRequired;

            return new_semester_course;
          }),
        );

        this.logger.log(
          `Created ${new_semester_courses.length} course(s) successfully`,
        );

        return transactionalEntityManager.save(new_semester_courses);
      },
    );
  }

  /**
   * COURSE VALIDATION
   * Validates: name required, code required, credits validation, duplicates (in data and database)
   */
  async validateCourseData({
    organizationEmail,
    courses,
  }: {
    organizationEmail: string;
    courses: CreateCourseInput[];
  }) {
    return await this.courseRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        const errors: ValidationResponseType[] = [];

        // ✅ Check for duplicates within submitted data
        const duplicatesInData = this.findDuplicatesInData(courses, [
          'code',
        ] as const);

        // Process duplicates found in submitted data
        duplicatesInData.forEach((fieldMap, fieldName) => {
          fieldMap.forEach((ids, value) => {
            if (ids.length > 1) {
              ids.forEach((id) => {
                errors.push({
                  id: id,
                  field: fieldName as ValidationFieldType,
                  input: value,
                  message: `This ${fieldName} is duplicated within the submitted data`,
                });
              });
            }
          });
        });

        await Promise.all(
          courses.map(async (course) => {
            // ✅ Validate name is required
            const nameError = validateRequiredString(
              course.name,
              'Course name',
              1,
              255,
            );
            if (nameError) {
              errors.push({
                id: course.id,
                field: 'name',
                input: course.name,
                message: nameError,
              });
            }

            // ✅ Validate code is required
            const codeError = validateRequiredString(
              course.code,
              'Course code',
              1,
              50,
            );
            if (codeError) {
              errors.push({
                id: course.id,
                field: 'code',
                input: course.code,
                message: codeError,
              });
            }

            // ✅ Validate credits
            let creditsError = null;
            if (course.credits === null || course.credits === undefined) {
              creditsError = 'Credits is required';
            } else {
              const creditsNum = Number(course.credits);
              if (isNaN(creditsNum)) {
                creditsError = 'Credits must be a number';
              } else if (creditsNum < 1 || creditsNum > 10) {
                creditsError = 'Credits must be between 1 and 10';
              }
            }

            if (creditsError) {
              errors.push({
                id: course.id,
                field: 'credits',
                input: `${course.credits}`,
                message: creditsError,
              });
            }

            // ✅ Check for duplicate course code in database
            const existing_course_by_code =
              await transactionalEntityManager.findOne(Course, {
                where: {
                  course_code: `${organization.id}-${course.code}`,
                },
              });

            if (existing_course_by_code) {
              errors.push({
                id: course.id,
                field: 'code',
                input: course.code,
                message: 'Course with this code already exists in database',
              });
            }
          }),
        );

        return errors;
      },
    );
  }

  async uploadCourseMaterial({
    organizationEmail,
    courseId,
    files,
  }: {
    organizationEmail: string;
    courseId: string;
    files: FileUpload[];
  }) {
    return await this.courseRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const course = await transactionalEntityManager.findOne(Course, {
          where: {
            id: courseId,
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
        });

        if (!course) {
          this.logger.error('Course not found!');
          throw new BadRequestException('Course not found!');
        }

        const new_course_materials: CourseMaterial[] = await Promise.all(
          files.map(async (file) => {
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
            const path =
              await this.uploadToAwsProvider.fileupload(fileForUpload);

            // Create CloudFront URL
            const cloudfront_url = `https://${this.configService.get<string>('AWS_CLOUDFRONT_URL')}/${path}`;

            // Create the material entity
            const new_course_material = new CourseMaterial();
            new_course_material.name = path;
            new_course_material.url = cloudfront_url;
            new_course_material.mime = mimetype;
            new_course_material.size = buffer.length;
            new_course_material.type = this.getFileType(mimetype);
            new_course_material.course = course;

            return new_course_material;
          }),
        );

        this.logger.log(
          `Uploaded materials for course: ${course.id} successfully`,
        );

        return transactionalEntityManager.save(new_course_materials);
      },
    );
  }

  private getFileType(mimetype: string): FileType {
    if (mimetype.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimetype.startsWith('video/')) {
      return FileType.VIDEO;
    } else if (mimetype.startsWith('audio/')) {
      return FileType.AUDIO;
    } else if (mimetype.includes('pdf')) {
      return FileType.PDF;
    } else if (
      mimetype.includes(
        'vnd.openxmlformats-officedocument.presentationml.presentation',
      ) ||
      mimetype.includes('vnd.ms-powerpoint')
    ) {
      return FileType.PPT;
    } else {
      return FileType.DOCUMENT;
    }
  }

  async addOrganizationIEC({
    organizationEmail,
    iecEmail,
  }: {
    organizationEmail: string;
    iecEmail: string;
  }) {
    return await this.courseRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: { email: organizationEmail },
          },
        );

        if (!organization) {
          throw new BadRequestException('Organization not found');
        }

        const existingIEC = await transactionalEntityManager.findOne(Iec, {
          where: { email: iecEmail },
          relations: ['organizations'],
        });

        if (!existingIEC) {
          throw new BadRequestException('IEC not found');
        }

        if (
          existingIEC.organizations.find((org) => org.id === organization.id)
        ) {
          throw new BadRequestException(
            'Organization already associated with IEC',
          );
        }

        existingIEC.organizations.push(organization);
        return await transactionalEntityManager.save(existingIEC);
      },
    );
  }

  async listActiveSemesterFees({
    email,
    searchTerm,
    page = 1,
    limit = 10,
  }: {
    page?: number;
    limit?: number;
    email: string;
    searchTerm?: string;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });
    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const currentPage = Math.max(1, Number(page));

    const skip = Number((currentPage - 1) * limit);

    const [fees, total] = await this.feeRepository.findAndCount({
      skip,
      take: limit,
      order: { level: 'DESC' },
      where: {
        name: searchTerm ? ILike(`%${searchTerm.trim()}%`) : undefined,
        faculty: {
          departments: {
            classes: {
              semesters: {
                status: SemesterStatus.IN_PROGRESS || SemesterStatus.PENDING,
              },
            },
          },
          college: {
            organization: {
              email,
            },
          },
        },
      },
    });

    const lastPage = Math.ceil(total / limit);

    return {
      edges: fees.map((fee) => ({
        node: fee,
      })),
      meta: {
        total,
        page,
        lastPage,
        limit,
      },
    };
  }

  async getOrganizationFaculties({
    email,
    filter,
  }: {
    email: string;
    filter?: OrganizationFacultyFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const faculties = await this.facultyRepository.find({
      where: {
        college: {
          id: filter?.collegeId ? filter.collegeId : undefined,
          organization: {
            email,
          },
        },
      },
    });
    return faculties;
  }

  async getOrganizationColleges({ email }: { email: string }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const colleges = await this.collegeRepository.find({
      where: {
        organization: {
          email,
        },
      },
    });
    return colleges;
  }

  async getOrganizationDepartments({
    email,
    filter,
  }: {
    email: string;
    filter?: OrganizationDepartmentFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const departments = await this.departmentRepository.find({
      where: {
        faculty: {
          id: filter?.facultyId ? filter.facultyId : undefined,
          college: {
            organization: {
              email,
            },
          },
        },
      },
    });
    return departments;
  }

  async getOrganizationClasses({
    email,
    filter,
  }: {
    email: string;
    filter?: OrganizationClassFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const classes = await this.classRepository.find({
      where: {
        department: {
          id: filter?.departmentId ? filter.departmentId : undefined,
          faculty: {
            college: {
              id: filter?.collegeId ? filter.collegeId : undefined,
              organization: {
                email,
              },
            },
          },
        },
      },
    });
    return classes;
  }

  async getOrganizationClassCourses({
    email,
    filter,
  }: {
    email: string;
    filter?: OrganizationCourseFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const courses = await this.courseRepository.find({
      where: {
        semesters: {
          class: {
            id: filter?.classId ? filter.classId : undefined,
            department: {
              faculty: {
                college: {
                  organization: {
                    email,
                  },
                },
              },
            },
          },
        },
      },
      relations: ['materials', 'exams'],
    });
    return courses;
  }

  async listOrganizationStudents({
    email,
    searchTerm,
    page = 1,
    limit = 10,
    filter,
  }: {
    page?: number;
    limit?: number;
    email: string;
    searchTerm?: string;
    filter?: OrganizationStudentFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const currentPage = Math.max(1, Number(page));

    const skip = Number((currentPage - 1) * limit);

    const [students, total] = await this.studentRepository.findAndCount({
      skip,
      take: limit,
      order: { last_name: 'ASC', first_name: 'ASC' },
      where: {
        first_name: searchTerm ? ILike(`%${searchTerm.trim()}%`) : undefined,
        last_name: searchTerm ? ILike(`%${searchTerm.trim()}%`) : undefined,
        year_group: filter?.yearGroup ? filter.yearGroup : undefined,
        class: {
          id: filter?.classId ? filter.classId : undefined,
          department: {
            id: filter?.departmentId ? filter.departmentId : undefined,
            faculty: {
              id: filter?.facultyId ? filter.facultyId : undefined,
              college: {
                id: filter?.collegeId ? filter.collegeId : undefined,
                organization: {
                  email,
                },
              },
            },
          },
        },
      },
    });

    const lastPage = Math.ceil(total / limit);

    return {
      edges: students.map((student) => ({
        node: student,
      })),
      meta: {
        total,
        page,
        lastPage,
        limit,
      },
    };
  }

  async listOrganizationLecturers({
    email,
    searchTerm,
    page = 1,
    limit = 10,
    filter,
  }: {
    page?: number;
    limit?: number;
    email: string;
    searchTerm?: string;
    filter?: OrganizationLecturerFilterInput;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const currentPage = Math.max(1, Number(page));

    const skip = Number((currentPage - 1) * limit);

    const [lecturers, total] = await this.lecturerRepository.findAndCount({
      skip,
      take: limit,
      order: { last_name: 'ASC', first_name: 'ASC' },
      where: {
        first_name: searchTerm ? ILike(`%${searchTerm.trim()}%`) : undefined,
        last_name: searchTerm ? ILike(`%${searchTerm.trim()}%`) : undefined,
        departments: {
          id: filter?.departmentId ? filter.departmentId : undefined,
          faculty: {
            id: filter?.facultyId ? filter.facultyId : undefined,
            college: {
              id: filter?.collegeId ? filter.collegeId : undefined,
              organization: {
                email,
              },
            },
          },
        },
      },
    });

    const lastPage = Math.ceil(total / limit);

    return {
      edges: lecturers.map((lecturer) => ({
        node: lecturer,
      })),
      meta: {
        total,
        page,
        lastPage,
        limit,
      },
    };
  }

  async getOrganizationStudent({
    email,
    studentId,
  }: {
    email: string;
    studentId: string;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const student = await this.studentRepository.findOne({
      where: {
        id: studentId,
        class: {
          department: {
            faculty: {
              college: {
                organization: {
                  email,
                },
              },
            },
          },
        },
      },
      relations: [
        'class.department.faculty.college',
        'class.department.faculty.fees',
        'registered_courses',
      ],
    });
    return {
      ...student,

      class: {
        ...student?.class,
        department: {
          ...student?.class.department,
          faculty: {
            ...student?.class.department.faculty,
            fees: student?.class.department.faculty.fees.filter(
              (fee) =>
                fee.student_type === student.student_type &&
                fee.year_group === student.year_group,
            ),
          },
        },
      },
    };
  }

  async getOrganizationLecturer({
    email,
    lecturerId,
  }: {
    email: string;
    lecturerId: string;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const lecturer = await this.lecturerRepository.findOne({
      where: {
        id: lecturerId,
        departments: {
          faculty: {
            college: {
              organization: {
                email,
              },
            },
          },
        },
      },
      relations: ['departments.faculty.college'],
    });
    return lecturer;
  }

  async getOrganizationFee({ email, feeId }: { email: string; feeId: string }) {
    const organization = await this.organizationRepository.findOne({
      where: {
        email,
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const fee = await this.feeRepository.findOne({
      where: {
        id: feeId,
      },
      relations: ['faculty.college'],
    });
    return fee;
  }

  async uploadExamResultsFromOrganization({
    organizationEmail,

    results,
  }: {
    organizationEmail: string;

    results: UploadExamResultsInput[];
  }) {
    // Get the organization with which the IEC is associated
    const organization = await this.organizationRepository.findOne({
      where: { email: organizationEmail },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found ');
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

  async setupAction({
    organizationEmail,
    colleges,
    faculties,
    departments,
    lecturers,
    classes,
    students,
    courses,
  }: {
    organizationEmail: string;
    colleges: CreateCollegeInput[];
    faculties: CreateFacultyWithRelationshipInput[];
    departments: CreateDepartmentWithRelationshipInput[];
    lecturers: CreateLecturerWithRelationshipInput[];
    classes: CreateClassWithRelationshipInput[];
    students: CreateStudentWithRelationshipInput[];
    courses: CreateCourseWithRelationshipInput[];
  }) {
    if (colleges.length) {
      const errors = await this.validateCollegeData({
        organizationEmail,
        colleges,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (faculties.length) {
      const errors = await this.validateFacultyData({
        organizationEmail,
        faculties,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (departments.length) {
      const errors = await this.validateDepartmentData({
        organizationEmail,
        departments,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (lecturers.length) {
      const errors = await this.validateLecturerData({
        organizationEmail,
        lecturers,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (classes.length) {
      const errors = await this.validateClassData({
        organizationEmail,
        classes,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (students.length) {
      const errors = await this.validateStudentData({
        organizationEmail,
        students,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    if (courses.length) {
      const errors = await this.validateCourseData({
        organizationEmail,
        courses,
      });

      if (errors.length) throw new BadRequestException(errors);
    }

    await this.orgProducer.setupAction({
      organizationEmail,
      colleges,
      faculties,
      departments,
      lecturers,
      classes,
      students,
      courses,
    });

    return {
      message:
        'An in-app notification or email will be sent to you after everything is done setting up',
    };
  }

  async updateProfileUrl({
    organizationEmail,
    file,
  }: {
    organizationEmail: string;
    file: FileUpload;
  }) {
    const organization = await this.organizationRepository.findOne({
      where: { email: organizationEmail },
    });

    if (!organization) {
      this.logger.error('Organization not found!');
      throw new BadRequestException('Organization not found!');
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

    // Update the organization's profile_url
    organization.profile_url = cloudfront_url;
    await this.organizationRepository.save(organization);

    // Track file upload metrics
    this.metricsService.trackFileUpload(mimetype, Boolean(buffer?.length));

    this.logger.log(`Updated profile URL for organization: ${organization.id}`);

    return organization;
  }

  async setupActionProcessing({
    organizationEmail,
    colleges,
    faculties,
    departments,
    lecturers,
    classes,
    students,
    courses,
  }: {
    organizationEmail: string;
    colleges: CreateCollegeInput[];
    faculties: CreateFacultyWithRelationshipInput[];
    departments: CreateDepartmentWithRelationshipInput[];
    lecturers: CreateLecturerWithRelationshipInput[];
    classes: CreateClassWithRelationshipInput[];
    students: CreateStudentWithRelationshipInput[];
    courses: CreateCourseWithRelationshipInput[];
  }) {
    return await this.courseRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const created_colleges = await this.createColleges({
          organizationEmail,
          colleges,
        });

        const created_faculties = await this.createFaculties({
          organizationEmail,
          faculties,
        });

        const created_departments = await this.createDepartments({
          organizationEmail,
          departments,
        });

        const created_lecturers = await this.createLecturers({
          organizationEmail,
          lecturers,
        });

        const created_classes = await this.createClasses({
          organizationEmail,
          classes,
        });

        const created_students = await this.createStudents({
          organizationEmail,
          students,
        });

        const created_courses = await this.createCourses({
          organizationEmail,
          courses,
        });

        await transactionalEntityManager.save(created_colleges);
        await transactionalEntityManager.save(created_faculties);
        await transactionalEntityManager.save(created_departments);
        await transactionalEntityManager.save(created_lecturers);
        await transactionalEntityManager.save(created_classes);
        await transactionalEntityManager.save(created_students);
        await transactionalEntityManager.save(created_courses);
      },
    );
  }
}
