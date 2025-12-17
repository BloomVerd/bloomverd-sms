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
import { HashHelper } from '../../../shared/helpers';
import {
  CreateClassInput,
  CreateClassSemesterInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateCourseMaterialInput,
  CreateDepartmentInput,
  CreateFacultyInput,
  CreateLecturerInput,
  CreateStudentInput,
  PaginationInput,
} from '../../../shared/inputs';

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
    @InjectRepository(Semester)
    private semesterRepository: Repository<Semester>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async listOrganizationCollegePaginated({
    organizationId,
    searchTerm,
    pagination,
  }: {
    organizationId?: string;
    searchTerm: string;
    pagination?: PaginationInput;
  }) {
    const college = await this.listOrganizationColleges({
      organizationId,
      searchTerm,
    });

    return this.paginate<College>(college, pagination, (college) =>
      college.id.toString(),
    );
  }

  async listOrganizationColleges({
    organizationId,
    searchTerm,
  }: {
    organizationId?: string;
    searchTerm: string;
  }) {
    return this.collegeRepository.find({
      where: {
        organization: organizationId ? { id: organizationId } : undefined,
        // name: searchTerm ? ILike(`%${searchTerm}%`) : undefined,
      },
      relations: ['organization', 'faculties'],
    });
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
        // GET the organization creating the colleges
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        // THROW an error if that organization does not exist
        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        // CREATE new college for organization
        const new_colleges: College[] = await Promise.all(
          colleges.map(async (college) => {
            const new_college = new College();
            new_college.email = college.email;
            new_college.name = college.name;
            new_college.password = await HashHelper.encrypt(college.password);
            new_college.organization = organization;

            return new_college;
          }),
        );

        // PERFORM bulk save for new_colleges
        this.logger.log(
          `Created ${new_colleges.length} college(s) successfully`,
        );
        return transactionalEntityManager.save(new_colleges);
      },
    );
  }

  async createFaculties({
    collegeEmail,
    faculties,
  }: {
    collegeEmail: string;
    faculties: CreateFacultyInput[];
  }) {
    return await this.facultyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the college creating the faculties
        const college = await transactionalEntityManager.findOne(College, {
          where: {
            email: collegeEmail,
          },
        });

        // THROW an error if that college does not exist
        if (!college) {
          this.logger.error('College not found!');
          throw new BadRequestException('College not found!');
        }

        // CREATE new faculties for organization
        const new_faculties: Faculty[] = await Promise.all(
          faculties.map(async (faculty) => {
            const new_faculty = new Faculty();
            new_faculty.email = faculty.email;
            new_faculty.name = faculty.name;
            new_faculty.password = await HashHelper.encrypt(faculty.password);
            new_faculty.college = college;

            return new_faculty;
          }),
        );

        // PERFORM bulk save for new_faculties
        this.logger.log(
          `Created ${new_faculties.length} faculties(s) for college: ${college.name} successfully`,
        );
        return transactionalEntityManager.save(new_faculties);
      },
    );
  }

  async createDepartments({
    facultyEmail,
    departments,
  }: {
    facultyEmail: string;
    departments: CreateDepartmentInput[];
  }) {
    return await this.departmentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the faculty creating the departments
        const faculty = await transactionalEntityManager.findOne(Faculty, {
          where: {
            email: facultyEmail,
          },
        });

        // THROW an error if that faculty does not exist
        if (!faculty) {
          this.logger.error('Faculty not found!');
          throw new BadRequestException('Faculty not found!');
        }

        // CREATE new departments for faculty
        const new_departments: Department[] = await Promise.all(
          departments.map(async (department) => {
            const new_department = new Department();
            new_department.email = department.email;
            new_department.name = department.name;
            new_department.password = await HashHelper.encrypt(
              department.password,
            );
            new_department.faculty = faculty;

            return new_department;
          }),
        );

        // PERFORM bulk save for new_departments
        this.logger.log(
          `Created ${new_departments.length} department(s) for faculty: ${faculty.name} successfully`,
        );
        return transactionalEntityManager.save(new_departments);
      },
    );
  }

  async createLecturers({
    organizationEmail,
    lecturers,
  }: {
    organizationEmail: string;
    lecturers: CreateLecturerInput[];
  }) {
    return await this.lecturerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the organization creating the lecturers
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
            },
          },
        );

        // THROW an error if that organization does not exist
        if (!organization) {
          this.logger.error('Organiztion not found!');
          throw new BadRequestException('Organiztion not found!');
        }

        // CREATE new college for organization
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
            new_lecturer.organization = organization;
            new_lecturer.password = await HashHelper.encrypt(lecturer.password);

            return new_lecturer;
          }),
        );

        // PERFORM bulk save for new_colleges
        this.logger.log(
          `Created ${new_lecturers.length} lecturer(s) successfully`,
        );
        return transactionalEntityManager.save(new_lecturers);
      },
    );
  }

  async assignLecturersToDepartment({
    organizationEmail,
    departmentId,
    lecturerIds,
  }: {
    organizationEmail: string;
    departmentId: string;
    lecturerIds: string[];
  }) {
    return await this.lecturerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the department when updating the lecturers
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
          },
        );

        // THROW an error if that department does not exist
        if (!department) {
          this.logger.error('Department not found!');
          throw new BadRequestException('Department not found!');
        }

        // CREATE update department for lecturers
        const updated_lecturers: Lecturer[] = await Promise.all(
          lecturerIds.map(async (lecturerId) => {
            const lecturer = await transactionalEntityManager.findOne(
              Lecturer,
              {
                where: {
                  id: lecturerId,
                },
                relations: ['departments'],
              },
            );

            if (!lecturer) {
              this.logger.error('Lecturer not found!');
              throw new BadRequestException('Lecturer not found!');
            }

            const isInDepartment = Boolean(
              lecturer.departments.find((dp) => dp.id === department.id),
            );
            if (isInDepartment) {
              this.logger.error(
                `This lecturer with id ${lecturer.id} is already in this department with id ${department.id}`,
              );
              throw new BadRequestException(
                'This lecturer already belong to this department',
              );
            }

            lecturer.departments.push(department);

            return lecturer;
          }),
        );

        // PERFORM bulk update for lecturers
        this.logger.log(
          `${updated_lecturers.length} lecturer(s) updated successfully`,
        );
        return transactionalEntityManager.save(updated_lecturers);
      },
    );
  }

  async createDepartmentClasses({
    organizationEmail,
    departmentId,
    classes,
  }: {
    organizationEmail: string;
    departmentId: string;
    classes: CreateClassInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the department we are creating the classes for
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
          },
        );

        // THROW an error if that department does not exist
        if (!department) {
          this.logger.error('Department not found!');
          throw new BadRequestException('Department not found!');
        }

        // CREATE new classes for faculty
        const new_classes: Class[] = await Promise.all(
          classes.map(async (dep_class) => {
            const new_class = new Class();
            new_class.name = dep_class.name;
            new_class.department = department;

            return new_class;
          }),
        );

        // PERFORM bulk save for new_classes
        this.logger.log(
          `Created ${new_classes.length} department class(es) for department: ${department.name} successfully`,
        );

        return transactionalEntityManager.save(new_classes);
      },
    );
  }

  async createClassSemesters({
    organizationEmail,
    classId,
    numOfSemesters = 8,
  }: {
    organizationEmail: string;
    classId: string;
    numOfSemesters?: number;
  }) {
    return await this.semesterRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the class we are creating the semesters for
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

        // THROW an error if that class does not exist
        if (!dep_class) {
          this.logger.error('Class not found!');
          throw new BadRequestException('Class not found!');
        }

        // CREATE new semesters for class
        const semesters = [];

        for (let i = 1; i < numOfSemesters + 1; i++) {
          semesters.push(i);
        }

        const new_semesters: Semester[] = await Promise.all(
          semesters.map(async (sem_num) => {
            const new_semester = new Semester();
            new_semester.semester_number = sem_num;
            new_semester.class = dep_class;
            return new_semester;
          }),
        );

        // PERFORM bulk save for new_semesters
        this.logger.log(
          `Created ${new_semesters.length} semester(s) for class: ${dep_class.name} successfully`,
        );

        return transactionalEntityManager.save(new_semesters);
      },
    );
  }

  async createClassStudents({
    organizationEmail,
    classId,
    students,
  }: {
    organizationEmail: string;
    classId: string;
    students: CreateStudentInput[];
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // GET the class we are creating the students for
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

        // THROW an error if that class does not exist
        if (!dep_class) {
          this.logger.error('Class not found!');
          throw new BadRequestException('Class not found!');
        }

        // CREATE new classes for faculty
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

            new_student.class = dep_class;

            return new_student;
          }),
        );

        // PERFORM bulk save for new_students
        this.logger.log(
          `Created ${new_students.length} student(s) for department: ${dep_class.name} successfully`,
        );

        return transactionalEntityManager.save(new_students);
      },
    );
  }

  async createSemesterCourses({
    organizationalEmail,
    semesterCourses,
    semesterId,
  }: {
    organizationalEmail: string;
    semesterCourses: CreateCourseInput[];
    semesterId: string;
  }) {
    return await this.classRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // get the semester we are creating the course for
        const semester = await transactionalEntityManager.findOne(Semester, {
          where: {
            id: semesterId,
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
        });

        //  Throw errror if semester does not exist
        if (!semester) {
          this.logger.error('Semester not found!');
          throw new BadRequestException('semester not found!');
        }

        // create semester course
        const new_semester_courses: Course[] = await Promise.all(
          semesterCourses.map(async (semesterCourse) => {
            const new_semester_course = new Course();
            new_semester_course.name = semesterCourse.name;
            new_semester_course.credits = semesterCourse.credits;
            new_semester_course.semesters = [semester];

            return new_semester_course;
          }),
        );

        // perform new semester course save
        this.logger.log(
          `Created ${new_semester_courses.length} course(s) for semester: ${semester.id} successfully`,
        );

        return transactionalEntityManager.save(new_semester_courses);
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
        // GET the course we are uploading material for
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

        // THROW an error if that course does not exist
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
        // Log the upload action
        this.logger.log(
          `Uploaded materials for course: ${course.id} successfully`,
        );

        return transactionalEntityManager.save(new_course_materials);
      },
    );
  }

  private paginate<T>(
    items: T[],
    paginationInput: PaginationInput = {},
    cursorExtractor: (item: T) => string | number,
  ) {
    const { first, after, last, before } = paginationInput;

    // Default values
    const defaultFirst = 10;
    let limit = first || defaultFirst;
    let afterIndex = -1;
    let beforeIndex = items.length;

    // Determine indices based on cursors
    if (after) {
      const decodedCursor = this.decodeCursor(after);
      afterIndex = items.findIndex(
        (item) => String(cursorExtractor(item)) === decodedCursor,
      );
      if (afterIndex === -1)
        afterIndex = -1; // Not found
      else afterIndex = afterIndex; // Include items after this index
    }

    if (before) {
      const decodedCursor = this.decodeCursor(before);
      beforeIndex = items.findIndex(
        (item) => String(cursorExtractor(item)) === decodedCursor,
      );
      if (beforeIndex === -1)
        beforeIndex = items.length; // Not found
      else beforeIndex = beforeIndex; // Include items before this index
    }

    // Handle the 'last' parameter by adjusting the starting point
    if (last) {
      const potentialCount = beforeIndex - afterIndex - 1;
      if (potentialCount > last) {
        afterIndex = beforeIndex - last - 1;
      }
      limit = last;
    }

    // Get the paginated items
    const slicedItems = items.slice(afterIndex + 1, beforeIndex);
    const paginatedItems = slicedItems.slice(0, limit);

    // Create edges with cursors
    const edges = paginatedItems.map((item) => ({
      cursor: this.encodeCursor(String(cursorExtractor(item))),
      node: item,
    }));

    // Determine if there are more pages
    const hasNextPage = beforeIndex > afterIndex + 1 + paginatedItems.length;
    const hasPreviousPage = afterIndex >= 0;

    // Create the pageInfo object
    const pageInfo = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      count: items.length,
    };
  }

  /**
   * Encode a cursor to Base64
   */
  private encodeCursor(cursor: string): string {
    return Buffer.from(cursor).toString('base64');
  }

  /**
   * Decode a cursor from Base64
   */
  private decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }
}
