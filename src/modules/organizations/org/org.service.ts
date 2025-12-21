import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Class,
  College,
  Course,
  CourseMaterial,
  Department,
  Faculty,
  Lecturer,
  Organization,
  Semester,
  Student,
} from '../../../database/entities';
import { Gender } from '../../../shared/enums';
import {
  getDateValidationError,
  getEmailValidationError,
  getPhoneValidationError,
  validateEnum,
  validateRequiredString,
} from '../../../shared/helpers';
import {
  CreateClassInput,
  CreateClassWithRelationshipInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateCourseMaterialInput,
  CreateCourseWithRelationshipInput,
  CreateDepartmentInput,
  CreateDepartmentWithRelationshipInput,
  CreateFacultyInput,
  CreateFacultyWithRelationshipInput,
  CreateLecturerInput,
  CreateLecturerWithRelationshipInput,
  CreateStudentInput,
  CreateStudentWithRelationshipInput,
} from '../../../shared/inputs';
import {
  ValidationFieldType,
  ValidationResponseType,
} from '../../../shared/types';
import { OrgProducer } from './org.producer';

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name);

  constructor(
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

  /**
   * COLLEGE VALIDATION
   * Validates: email format, name required, duplicates (in data and database)
   */
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
            new_student.email = student.email;
            new_student.date_of_birth = student.dateOfBirth;
            new_student.gender = student.gender;
            new_student.address = student.address;
            new_student.phone_number = student.phoneNumber;

            new_student.class = dep_class;

            return new_student;
          }),
        );

        this.logger.log(
          `Created ${new_students.length} student(s) successfully`,
        );

        return transactionalEntityManager.save(new_students);
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

            const new_semester_course = new Course();
            new_semester_course.course_code = `${semester.class.department.faculty.college.organization.id}-${course.code}`;
            new_semester_course.name = course.name;
            new_semester_course.credits = course.credits;
            new_semester_course.semesters = [semester];

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
    organizationalEmail,
    courseId,
    materials,
  }: {
    organizationalEmail: string;
    courseId: string;
    materials: CreateCourseMaterialInput[];
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
                        email: organizationalEmail,
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
          materials.map(async (material) => {
            const new_course_material = new CourseMaterial();
            new_course_material.name = material.materialName;
            new_course_material.url = material.materialUrl;
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
