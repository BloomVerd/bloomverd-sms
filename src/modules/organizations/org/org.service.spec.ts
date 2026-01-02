import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
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
  Student,
} from '../../../database/entities';
import { Gender } from '../../../shared/enums';
import { HashHelper } from '../../../shared/helpers';
import { OrgConsumer } from './org.consumer';
import { OrgProducer } from './org.producer';
import { OrgService } from './org.service';

describe('OrganizationService', () => {
  let module: TestingModule;
  let connection: Connection;
  let organizationQueue: Queue;
  let orgConsumer: OrgConsumer;

  let orgService: OrgService;
  let orgRepository: Repository<Organization>;
  let collegeRepository: Repository<College>;
  let facultyRepository: Repository<Faculty>;
  let departmentRepository: Repository<Department>;
  let lecturerRepository: Repository<Lecturer>;
  let classRepository: Repository<Class>;
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
        BullModule.registerQueue({
          name: 'organization-queue',
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
      providers: [OrgService, OrgProducer, OrgConsumer],
    }).compile();

    connection = module.get<Connection>(Connection);
    organizationQueue = module.get<Queue>(getQueueToken('organization-queue'));
    orgService = module.get<OrgService>(OrgService);
    orgConsumer = module.get<OrgConsumer>(OrgConsumer);
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
    // Clear the queue
    await organizationQueue.clean(0, 3, 'active');
    await organizationQueue.clean(0, 3, 'completed');
    await organizationQueue.clean(0, 3, 'failed');
    await organizationQueue.clean(0, 3, 'delayed');
    await organizationQueue.clean(0, 3, 'wait');

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
        organizationEmail: organization.email,
        faculties: facultyData.map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      const college_faculties = await getCollegeFaculties(
        collegesData[0].email,
      );

      expect(faculties.length).toEqual(college_faculties.length);
      expect(faculties.pop()?.college.id).toBe(colleges[0].id);
    });
  });

  describe('createDepartments', () => {
    it('Create bulk departments linked to a faculty', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      const faculties = await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      const departments = await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      const faculty_departments = await getFacultyDepartments(
        facultyData[0].email,
      );

      expect(departments.length).toEqual(faculty_departments.length);
      expect(departments.pop()?.faculty.id).toBe(faculties[0].id);
    });
  });

  describe('createLecturers', () => {
    it('Create bulk lecturers linked to a organization', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      const lecturers = await orgService.createLecturers({
        organizationEmail: organization.email,
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: departmentData[0].email,
        })),
      });

      const organization_lecturers = await getOrganizationLecturers(
        organization.email,
      );

      expect(lecturers.length).toEqual(organization_lecturers.length);
      expect(lecturers.pop()?.organization.id).toBe(organization.id);
    });
  });

  describe('createClasses', () => {
    it('Create bulk classes to a department', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      const departments = await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      const classes = await orgService.createClasses({
        organizationEmail: organization.email,
        classes: classData.map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      const dep_classes = await getDepartmentClasses(departmentData[0].email);

      expect(dep_classes.length).toEqual(classes.length);
      expect(dep_classes[0].department.id).toBe(departments[0].id);
      expect(dep_classes[0].semesters.length).toEqual(8);
    });
  });

  describe('createStudents', () => {
    it('Create bulk students for a class', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      const classes = await orgService.createClasses({
        organizationEmail: organization.email,
        classes: [classData[0]].map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      const students = await orgService.createStudents({
        organizationEmail: organization.email,
        students: studentData.map((std) => ({
          ...std,
          className: classData[0].name,
        })),
      });

      const class_students = await getClassStudents(
        `${organization.id}-${classData[0].name}`,
      );

      expect(class_students.length).toEqual(students.length);
      expect(class_students[0].class.id).toBe(classes[0].id);
    });
  });

  describe('createCourses', () => {
    it('Create bulk courses for a semester', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createClasses({
        organizationEmail: organization.email,
        classes: [classData[0]].map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      const courses = await orgService.createCourses({
        organizationEmail: organization.email,
        courses: coursesData.map((course) => ({
          ...course,
          className: classData[0].name,
        })),
      });

      const semester_courses = await getSemesterCourses(
        `${organization.id}-${classData[0].name}`,
        1,
      );

      expect(semester_courses.length).toEqual(courses.length);
      expect(semester_courses[0].semesters[0].id).toBe(
        courses[0].semesters.find((sem) => sem.semester_number === 1)?.id,
      );
    });
  });

  describe('uploadCourseMaterial', () => {
    it('Upload course material for a course', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createClasses({
        organizationEmail: organization.email,
        classes: [classData[0]].map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      const courses = await orgService.createCourses({
        organizationEmail: organization.email,
        courses: coursesData.map((course) => ({
          ...course,
          className: classData[0].name,
        })),
      });

      const materials = await orgService.uploadCourseMaterial({
        organizationEmail: organization.email,
        courseId: courses[0].id,
        materials: materialsData,
      });

      const course_materials = await getCourseMaterials(courses[0].id);

      expect(course_materials.length).toEqual(materials.length);
      expect(course_materials[0].course.id).toBe(courses[0].id);
    });
  });

  describe('validateCollegeData', () => {
    it('returns an empty validation-response array when college data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateCollegeData({
        organizationEmail: organization.email,
        colleges: collegesData,
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if college already exist by name and email', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: collegesData,
      });

      const validation_response = await orgService.validateCollegeData({
        organizationEmail: organization.email,
        colleges: collegesData,
      });

      expect(validation_response.length).toEqual(4);
    });
  });

  describe('validateFacultyData', () => {
    it('returns an empty validation-response array when faculty data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateFacultyData({
        organizationEmail: organization.email,
        faculties: facultyData.map((faculty) => ({
          ...faculty,
          collegeEmail: 'college@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if faculty already exist by name and email', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: facultyData.map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      const validation_response = await orgService.validateFacultyData({
        organizationEmail: organization.email,
        faculties: facultyData,
      });

      expect(validation_response.length).toEqual(4);
    });
  });

  describe('validateDepartmentData', () => {
    it('returns an empty validation-response array when department data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateDepartmentData({
        organizationEmail: organization.email,
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: 'faculty@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if department already exist by name and email', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      const validation_response = await orgService.validateDepartmentData({
        organizationEmail: organization.email,
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: 'faculty@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(4);
    });
  });

  describe('validateClassData', () => {
    it('returns an empty validation-response array when class data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateClassData({
        organizationEmail: organization.email,
        classes: classData.map((cls) => ({
          ...cls,
          departmentEmail: 'department@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if class already exist by name', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createClasses({
        organizationEmail: organization.email,
        classes: classData.map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      const validation_response = await orgService.validateClassData({
        organizationEmail: organization.email,
        classes: classData.map((cls) => ({
          ...cls,
          departmentEmail: 'department@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(2);
    });
  });

  describe('validateCourseData', () => {
    it('returns an empty validation-response array when course data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateCourseData({
        organizationEmail: organization.email,
        courses: coursesData.map((cls) => ({
          ...cls,
          semesterNumber: 1,
        })),
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if course already exist by code', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createClasses({
        organizationEmail: organization.email,
        classes: [classData[0]].map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      await orgService.createCourses({
        organizationEmail: organization.email,
        courses: coursesData.map((course) => ({
          ...course,
          className: classData[0].name,
        })),
      });

      const validation_response = await orgService.validateCourseData({
        organizationEmail: organization.email,
        courses: coursesData.map((course) => ({
          ...course,
          semesterNumber: 1,
        })),
      });

      expect(validation_response.length).toEqual(2);
    });
  });

  describe('validateLecturerData', () => {
    it('returns an empty validation-response array when lecturer data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateLecturerData({
        organizationEmail: organization.email,
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: 'department@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if lecturer already exist by email and phone_number', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createLecturers({
        organizationEmail: organization.email,
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: departmentData[0].email,
        })),
      });

      const validation_response = await orgService.validateLecturerData({
        organizationEmail: organization.email,
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: 'department@gmail.com',
        })),
      });

      expect(validation_response.length).toEqual(4);
    });
  });

  describe('validateStudentData', () => {
    it('returns an empty validation-response array when student data has no issues', async () => {
      const { organization } = await setupData();

      const validation_response = await orgService.validateStudentData({
        organizationEmail: organization.email,
        students: studentData,
      });

      expect(validation_response.length).toEqual(0);
    });

    it('returns an array of validation-response error if student already exist by email and phone_number', async () => {
      const { organization } = await setupData();

      await orgService.createColleges({
        organizationEmail: organization.email,
        colleges: [collegesData[0]],
      });

      await orgService.createFaculties({
        organizationEmail: organization.email,
        faculties: [facultyData[0]].map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
      });

      await orgService.createDepartments({
        organizationEmail: organization.email,
        departments: [departmentData[0]].map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
      });

      await orgService.createLecturers({
        organizationEmail: organization.email,
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: departmentData[0].email,
        })),
      });

      await orgService.createClasses({
        organizationEmail: organization.email,
        classes: [classData[0]].map((cld) => ({
          ...cld,
          departmentEmail: departmentData[0].email,
        })),
      });

      await orgService.createStudents({
        organizationEmail: organization.email,
        students: studentData.map((std) => ({
          ...std,
          className: classData[0].name,
        })),
      });

      const validation_response = await orgService.validateStudentData({
        organizationEmail: organization.email,
        students: studentData,
      });

      expect(validation_response.length).toEqual(4);
    });
  });

  describe('setupActionProcessing', () => {
    it('runs successfully if there are no issues', async () => {
      const { organization } = await setupData();
      await orgService.setupActionProcessing({
        organizationEmail: organization.email,
        colleges: collegesData,
        faculties: facultyData.map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: departmentData[0].email,
        })),
        classes: classData.map((cls) => ({
          ...cls,
          departmentEmail: departmentData[0].email,
        })),
        students: studentData.map((student) => ({
          ...student,
          className: classData[0].name,
        })),
        courses: coursesData.map((course) => ({
          ...course,
          className: classData[0].name,
        })),
      });

      const colleges = await getOrganizationColleges(organization.email);
      const faculties = await getCollegeFaculties(collegesData[0].email);
      const departments = await getFacultyDepartments(facultyData[0].email);
      const lecturers = await getDepartmentLecturers(departmentData[0].email);
      const classes = await getDepartmentClasses(departmentData[0].email);
      const students = await getClassStudents(
        `${organization.id}-${classData[0].name}`,
      );
      const courses = await getSemesterCourses(
        `${organization.id}-${classData[0].name}`,
        1,
      );

      expect(colleges[0].organization.id).toEqual(organization.id);
      expect(faculties[0].college.id).toEqual(colleges[0].id);
      expect(departments[0].faculty.id).toEqual(faculties[0].id);
      expect(lecturers[0].departments[0].id).toEqual(departments[0].id);
      expect(classes[0].department.id).toEqual(departments[0].id);
      expect(classes[0].semesters.length).toEqual(
        classData[0].numberOfSemesters,
      );
      expect(students[0].class.id).toEqual(classes[0].id);
      expect(courses[0].semesters[0].class.id).toEqual(classes[0].id);
    });
  });

  describe('setupAction', () => {
    it('puts data in queue for processing after validation, processes jobs, and verifies', async () => {
      const { organization } = await setupData();

      await orgService.setupAction({
        organizationEmail: organization.email,
        colleges: collegesData,
        faculties: facultyData.map((faculty) => ({
          ...faculty,
          collegeEmail: collegesData[0].email,
        })),
        departments: departmentData.map((department) => ({
          ...department,
          facultyEmail: facultyData[0].email,
        })),
        lecturers: lecturerData.map((lecturer) => ({
          ...lecturer,
          departmentEmail: departmentData[0].email,
        })),
        classes: classData.map((cls) => ({
          ...cls,
          departmentEmail: departmentData[0].email,
        })),
        students: studentData.map((student) => ({
          ...student,
          className: classData[0].name,
        })),
        courses: coursesData.map((course) => ({
          ...course,
          className: classData[0].name,
        })),
      });

      // Process all jobs in the queue and wait for completion
      await processQueueJobs();

      // Verify data was processed successfully
      const colleges = await getOrganizationColleges(organization.email);
      const faculties = await getCollegeFaculties(collegesData[0].email);
      const departments = await getFacultyDepartments(facultyData[0].email);
      const lecturers = await getDepartmentLecturers(departmentData[0].email);
      const classes = await getDepartmentClasses(departmentData[0].email);
      const students = await getClassStudents(
        `${organization.id}-${classData[0].name}`,
      );
      const courses = await getSemesterCourses(
        `${organization.id}-${classData[0].name}`,
        1,
      );

      expect(colleges[0].organization.id).toEqual(organization.id);
      expect(faculties[0].college.id).toEqual(colleges[0].id);
      expect(departments[0].faculty.id).toEqual(faculties[0].id);
      expect(lecturers[0].departments[0].id).toEqual(departments[0].id);
      expect(classes[0].department.id).toEqual(departments[0].id);
      expect(classes[0].semesters.length).toEqual(
        classData[0].numberOfSemesters,
      );
      expect(students[0].class.id).toEqual(classes[0].id);
      expect(courses[0].semesters[0].class.id).toEqual(classes[0].id);
    });
  });

  // DATA
  const collegesData = [
    {
      id: '1',
      name: 'Test College',
      email: 'college@gmail.com',
    },
    {
      id: '2',
      name: 'Test Colleges',
      email: 'college1@gmail.com',
    },
  ];

  const facultyData = [
    {
      id: '1',
      name: 'Test Faculty',
      email: 'faculty@gmail.com',
    },
    {
      id: '2',
      name: 'Test Facultys',
      email: 'faculty1@gmail.com',
    },
  ];

  const departmentData = [
    {
      id: '1',
      name: 'Test Department',
      email: 'department@gmail.com',
    },
    {
      id: '2',
      name: 'Test Departments',
      email: 'department1@gmail.com',
    },
  ];

  const lecturerData = [
    {
      id: '1',
      email: 'lecture1@gmail.com',
      firstName: 'Lecturer',
      lastName: 'One',
      gender: Gender.MALE,
      phoneNumber: '+233550815604',
      address: 'address',
      dateOfBirth: new Date(),
    },
    {
      id: '2',
      email: 'lecture2@gmail.com',
      firstName: 'Lecturer',
      lastName: 'Two',
      gender: Gender.MALE,
      phoneNumber: '+233550815605',
      address: 'address',
      dateOfBirth: new Date(),
    },
  ];

  const classData = [
    {
      id: '1',
      numberOfSemesters: 8,
      name: 'biomed class 2025',
    },
    {
      id: '2',
      numberOfSemesters: 8,
      name: 'biomed class 2026',
    },
  ];

  const studentData = [
    {
      id: '1',
      email: 'student1@gmail.com',
      firstName: 'Student',
      lastName: 'One',
      gender: Gender.MALE,
      phoneNumber: '+233550815604',
      address: 'address',
      dateOfBirth: new Date(),
    },
    {
      id: '2',
      email: 'student2@gmail.com',
      firstName: 'Student',
      lastName: 'Two',
      gender: Gender.MALE,
      phoneNumber: '+233550815605',
      address: 'address',
      dateOfBirth: new Date(),
    },
  ];

  const coursesData = [
    {
      id: '1',
      name: 'Introduction to Biology',
      code: 'EL291',
      credits: 3,
      semesterNumber: 1,
    },
    {
      id: '2',
      name: 'Chemical Compounds',
      code: 'CW291',
      credits: 4,
      semesterNumber: 1,
    },
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
    organization.name = 'Test organization';
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
      relations: ['department', 'semesters'],
    });
  };

  const getDepartmentLecturers = async (email: string) => {
    return lecturerRepository.find({
      where: { departments: { email } },
      relations: ['departments'],
    });
  };

  const getClassStudents = async (class_name: string) => {
    return studentRepository.find({
      where: { class: { name: class_name } },
      relations: ['class'],
    });
  };

  const getSemesterCourses = async (
    class_name: string,
    semester_number: number,
  ) => {
    return courseRepository.find({
      where: { semesters: { semester_number, class: { name: class_name } } },
      relations: ['semesters.class'],
    });
  };

  const getCourseMaterials = async (id: string) => {
    return courseMaterialRepository.find({
      where: { course: { id } },
      relations: ['course'],
    });
  };

  // Helper function to process queue jobs and wait for completion
  const processQueueJobs = async (): Promise<void> => {
    // Get all waiting jobs
    const jobs = await organizationQueue.getWaiting(0, -1);

    // If there are jobs, process them
    if (jobs.length > 0) {
      for (const job of jobs) {
        try {
          // Manually call the consumer's process method
          await orgConsumer.process(job);
          // Mark job as completed
          // await job.moveToCompleted('', '');
        } catch (error) {
          // Mark job as failed
          console.log('MARKED_ERROR:', error);
          // await job.moveToFailed(error, '');
        }
      }
    }
  };
});
