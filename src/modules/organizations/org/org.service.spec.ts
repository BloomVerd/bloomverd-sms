import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import {
  Class,
  College,
  Course,
  CourseMaterial,
  Department,
  entities,
  Faculty,
  Lecturer,
  Organization,
  Semester,
  Student,
} from '../../../database/entities';
import { Gender } from '../../../database/entities/lecturer.entity';
import { HashHelper } from '../../../shared/helpers';
import { OrgService } from './org.service';

describe('OrganizationService', () => {
  let module: TestingModule;
  let connection: Connection;

  let orgService: OrgService;
  let orgRepository: Repository<Organization>;
  let collegeRepository: Repository<College>;
  let facultyRepository: Repository<Faculty>;
  let departmentRepository: Repository<Department>;
  let lecturerRepository: Repository<Lecturer>;
  let classRepository: Repository<Class>;
  let semesterRepository: Repository<Semester>;
  let studentRepository: Repository<Student>;
  let courseRepository: Repository<Course>;
  let courseMaterialRepository: Repository<CourseMaterial>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            secretOrPrivateKey: configService.get('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            type: 'postgres',
            url: configService.get<string>('DATABASE_URL'),
            entities,
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature(entities),
      ],
      controllers: [],
      providers: [OrgService],
    }).compile();

    connection = module.get<Connection>(Connection);
    orgService = module.get<OrgService>(OrgService);
    orgRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    collegeRepository = module.get<Repository<College>>(
      getRepositoryToken(College),
    );
    facultyRepository = module.get<Repository<Faculty>>(
      getRepositoryToken(Faculty),
    );
    departmentRepository = module.get<Repository<Department>>(
      getRepositoryToken(Department),
    );
    lecturerRepository = module.get<Repository<Lecturer>>(
      getRepositoryToken(Lecturer),
    );
    classRepository = module.get<Repository<Class>>(getRepositoryToken(Class));
    semesterRepository = module.get<Repository<Semester>>(
      getRepositoryToken(Semester),
    );
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
    courseMaterialRepository = module.get<Repository<CourseMaterial>>(
      getRepositoryToken(CourseMaterial),
    );
  });

  beforeEach(async () => {
    // Clear the database before each test
    const entities = connection.entityMetadatas;
    for (const entity of entities) {
      const repository = connection.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" CASCADE;`);
    }
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await connection.close();
    await module.close();
  });

  describe('createColleges', () => {
    it('Create bulk colleges linked to an Organization', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: collegesData,
      });

      const organization_colleges = await getOrganizationColleges(
        organization.email,
      );

      expect(colleges.length).toEqual(organization_colleges.length);
      expect(colleges.pop()?.organization.id).toBe(organization.id);
    });
  });

  describe('createFaculties', () => {
    it('Create bulk faculties linked to a college', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: facultyData,
      });

      const college_faculties = await getCollegeFaculties(colleges[0].email);

      expect(faculties.length).toEqual(college_faculties.length);
      expect(faculties.pop()?.college.id).toBe(colleges[0].id);
    });
  });

  describe('createDepartments', () => {
    it('Create bulk departments linked to a faculty', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: departmentData,
      });

      const faculty_departments = await getFacultyDepartments(
        faculties[0].email,
      );

      expect(departments.length).toEqual(faculty_departments.length);
      expect(departments.pop()?.faculty.id).toBe(faculties[0].id);
    });
  });

  describe('createLecturers', () => {
    it('Create bulk lecturers linked to a organization', async () => {
      const { organization } = await setupData();

      const lecturers = await orgService.createLecturers({
        organizationEmail: organization.email,
        lecturers: lecturerData,
      });

      const organization_lecturers = await getOrganizationLecturers(
        organization.email,
      );

      expect(lecturers.length).toEqual(organization_lecturers.length);
      expect(lecturers.pop()?.organization.id).toBe(organization.id);
    });
  });

  describe('assignLecturersToDepartment', () => {
    it('Assign bulk lecturers to a department', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const lecturers = await orgService.createLecturers({
        organizationEmail: organization.email,
        lecturers: lecturerData,
      });

      const updated_lecturers = await orgService.assignLecturersToDepartment({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        lecturerIds: lecturers.map((lecturer) => lecturer.id),
      });

      const response = await getOrganizationLecturers(organization.email);

      expect(updated_lecturers.length).toEqual(response.length);
      expect(response[0]?.departments[0].id).toBe(departments[0].id);
      expect(response[1]?.departments[0].id).toBe(departments[0].id);
    });
  });

  describe('createDepartmentClasses', () => {
    it('Create bulk classes to a department', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const classes = await orgService.createDepartmentClasses({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        classes: classData,
      });

      const dep_classes = await getDepartmentClasses(departments[0].email);

      expect(dep_classes.length).toEqual(classes.length);
      expect(dep_classes[0].department.id).toBe(departments[0].id);
    });
  });

  describe('createClassSemesters', () => {
    it('Create bulk semesters for a class', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const classes = await orgService.createDepartmentClasses({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        classes: [classData[0]],
      });

      const semesters = await orgService.createClassSemesters({
        organizationEmail: organization.email,
        classId: classes[0].id,
      });

      const class_semesters = await getClassSemesters(classes[0].id);

      expect(class_semesters.length).toEqual(semesters.length);
      expect(class_semesters[0].class.id).toBe(classes[0].id);
    });
  });

  describe('createClassStudents', () => {
    it('Create bulk students for a class', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const classes = await orgService.createDepartmentClasses({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        classes: [classData[0]],
      });

      await orgService.createClassSemesters({
        organizationEmail: organization.email,
        classId: classes[0].id,
      });

      const students = await orgService.createClassStudents({
        organizationEmail: organization.email,
        classId: classes[0].id,
        students: studentData,
      });

      const class_students = await getClassStudents(classes[0].id);

      expect(class_students.length).toEqual(students.length);
      expect(class_students[0].class.id).toBe(classes[0].id);
    });
  });

  describe('createSemesterCourses', () => {
    it('Create bulk courses for a semester', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const classes = await orgService.createDepartmentClasses({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        classes: [classData[0]],
      });

      const semesters = await orgService.createClassSemesters({
        organizationEmail: organization.email,
        classId: classes[0].id,
      });

      const courses = await orgService.createSemesterCourses({
        organizationalEmail: organization.email,
        semesterId: semesters[0].id,
        semesterCourses: [coursesData[0]],
      });

      const semester_courses = await getSemesterCourses(semesters[0].id);

      expect(semester_courses.length).toEqual(courses.length);
      expect(semester_courses[0].semesters[0].id).toBe(semesters[0].id);
    });
  });

  describe('uploadCourseMaterial', () => {
    it('Upload course material for a course', async () => {
      const { organization } = await setupData();

      const colleges = await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        collegeEmail: colleges[0].email,
        faculties: [facultyData[0]],
      });

      const departments = await orgService.createDepartments({
        facultyEmail: faculties[0].email,
        departments: [departmentData[0]],
      });

      const classes = await orgService.createDepartmentClasses({
        organizationEmail: organization.email,
        departmentId: departments[0].id,
        classes: [classData[0]],
      });

      const semesters = await orgService.createClassSemesters({
        organizationEmail: organization.email,
        classId: classes[0].id,
      });

      const courses = await orgService.createSemesterCourses({
        organizationalEmail: organization.email,
        semesterId: semesters[0].id,
        semesterCourses: [coursesData[0]],
      });

      const materials = await orgService.uploadCourseMaterial({
        organizationalEmail: organization.email,
        courseId: courses[0].id,
        materials: materialsData,
      });

      const course_materials = await getCourseMaterials(courses[0].id);

      expect(course_materials.length).toEqual(materials.length);
      expect(course_materials[0].course.id).toBe(courses[0].id);
    });
  });

  // DATA
  const collegesData = [
    {
      name: 'Test College',
      email: 'college@gmail.com',
      password: 'password',
    },
    {
      name: 'Test Colleges',
      email: 'college1@gmail.com',
      password: 'password',
    },
  ];

  const facultyData = [
    {
      name: 'Test Faculty',
      email: 'faculty@gmail.com',
      password: 'password',
    },
    {
      name: 'Test Facultys',
      email: 'faculty1@gmail.com',
      password: 'password',
    },
  ];

  const departmentData = [
    {
      name: 'Test Department',
      email: 'department@gmail.com',
      password: 'password',
    },
    {
      name: 'Test Departments',
      email: 'department1@gmail.com',
      password: 'password',
    },
  ];

  const lecturerData = [
    {
      email: 'lecture1@gmail.com',
      firstName: 'Lecturer',
      lastName: 'One',
      gender: Gender.MALE,
      phoneNumber: '0550815604',
      address: 'address',
      dateOfBirth: new Date(),
      password: 'password',
    },
    {
      email: 'lecture2@gmail.com',
      firstName: 'Lecturer',
      lastName: 'Two',
      gender: Gender.MALE,
      phoneNumber: '0550815605',
      address: 'address',
      dateOfBirth: new Date(),
      password: 'password',
    },
  ];

  const classData = [
    {
      name: 'biomed class 2025',
    },
    {
      name: 'biomed class 2026',
    },
  ];

  const studentData = [
    {
      email: 'student1@gmail.com',
      firstName: 'Student',
      lastName: 'One',
      gender: Gender.MALE,
      phoneNumber: '0550815604',
      address: 'address',
      dateOfBirth: new Date(),
      password: 'password',
    },
    {
      email: 'student2@gmail.com',
      firstName: 'Student',
      lastName: 'Two',
      gender: Gender.MALE,
      phoneNumber: '0550815605',
      address: 'address',
      dateOfBirth: new Date(),
      password: 'password',
    },
  ];

  const coursesData = [
    {
      name: 'Introduction to Biology',
      credits: 3,
    },
    { name: 'Chemical Compounds', credits: 4 },
  ];

  const materialsData = [
    {
      materialName: 'Biology Lecture Notes',
      materialUrl: 'http://example.com/material.pdf',
    },
    {
      materialName: 'Chemistry Lecture Notes',
      materialUrl: 'http://example.com/chemistry-material.pdf',
    },
  ];

  // HELPER FXN
  const setupData = async () => {
    const organization = new Organization();
    organization.email = 'test@gmail.com';
    organization.password = await HashHelper.encrypt('password');
    await orgRepository.save(organization);

    return { organization };
  };

  const getOrganizationColleges = async (email: string) => {
    return collegeRepository.find({
      where: { organization: { email } },
      relations: ['organization'],
    });
  };

  const getCollegeFaculties = async (email: string) => {
    return facultyRepository.find({
      where: { college: { email } },
      relations: ['college'],
    });
  };

  const getFacultyDepartments = async (email: string) => {
    return departmentRepository.find({
      where: { faculty: { email } },
      relations: ['faculty'],
    });
  };

  const getOrganizationLecturers = async (email: string) => {
    return lecturerRepository.find({
      where: { organization: { email } },
      relations: ['organization', 'departments'],
    });
  };

  const getDepartmentClasses = async (email: string) => {
    return classRepository.find({
      where: { department: { email } },
      relations: ['department'],
    });
  };

  const getClassSemesters = async (id: string) => {
    return semesterRepository.find({
      where: { class: { id } },
      relations: ['class'],
    });
  };

  const getClassStudents = async (id: string) => {
    return studentRepository.find({
      where: { class: { id } },
      relations: ['class'],
    });
  };

  const getSemesterCourses = async (id: string) => {
    return courseRepository.find({
      where: { semesters: { id } },
      relations: ['semesters'],
    });
  };

  const getCourseMaterials = async (id: string) => {
    return courseMaterialRepository.find({
      where: { course: { id } },
      relations: ['course'],
    });
  };
});
