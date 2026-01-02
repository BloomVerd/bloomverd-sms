import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import {
  Class,
  College,
  Course,
  CourseExam,
  Department,
  entities,
  Faculty,
  Iec,
  Organization,
  Semester,
  Student,
} from '../../../database/entities';
import { Gender } from '../../../database/types';
import { HashHelper } from '../../../shared/helpers';
import { IecService } from './iec.service';

describe('IecService', () => {
  let module: TestingModule;
  let connection: Connection;
  let iecService: IecService;
  let orgRepository: Repository<Organization>;
  let iecRepository: Repository<Iec>;
  let collegeRepository: Repository<College>;
  let facultyRepository: Repository<Faculty>;
  let departmentRepository: Repository<Department>;
  let classRepository: Repository<Class>;
  let courseRepository: Repository<Course>;
  let courseExamRepository: Repository<CourseExam>;
  let studentRepository: Repository<Student>;
  let semesterRepository: Repository<Semester>;

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
      providers: [IecService],
    }).compile();

    connection = module.get<Connection>(Connection);
    iecService = module.get<IecService>(IecService);
    orgRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    iecRepository = module.get<Repository<Iec>>(getRepositoryToken(Iec));
    collegeRepository = module.get<Repository<College>>(
      getRepositoryToken(College),
    );
    facultyRepository = module.get<Repository<Faculty>>(
      getRepositoryToken(Faculty),
    );
    departmentRepository = module.get<Repository<Department>>(
      getRepositoryToken(Department),
    );

    classRepository = module.get<Repository<Class>>(getRepositoryToken(Class));
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
    courseExamRepository = module.get<Repository<CourseExam>>(
      getRepositoryToken(CourseExam),
    );
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
    semesterRepository = module.get<Repository<Semester>>(
      getRepositoryToken(Semester),
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

  describe('uploadExamResults', () => {
    it('returns a success message', async () => {
      const { exam, organization, iec, student } = await setupData();
      const result = await iecService.uploadExamResults({
        organizationEmail: organization.email,
        iecEmail: iec.email,
        results: [
          {
            student_email: student.email,
            score: 100,
            exam_id: exam.id,
          },
        ],
      });
      expect(result.message).toEqual('Exam results uploaded successfully');

      const examResults = await getExamResults(exam.id);

      expect(examResults?.[0].score).toEqual(100);
      expect(examResults?.[0].student_email).toEqual(student.email);
    });
  });

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

  const getExamResults = async (examId: string) => {
    const exam = await courseExamRepository.findOne({
      where: { id: examId },
      relations: ['results'],
    });

    return exam?.results;
  };

  const setupData = async () => {
    const organization = new Organization();
    organization.name = 'Test University';
    organization.email = 'test@email.com';
    organization.password = await HashHelper.encrypt('password');

    await orgRepository.save(organization);

    const iec = new Iec();
    iec.name = 'Test IEC';
    iec.email = 'test@iec.com';
    iec.organizations = [organization];
    iec.password = await HashHelper.encrypt('password');

    await iecRepository.save(iec);

    const college = new College();
    college.name = collegesData[0].name;
    college.email = collegesData[0].email;
    college.organization = organization;

    await collegeRepository.save(college);

    const faculty = new Faculty();
    faculty.name = facultyData[0].name;
    faculty.email = facultyData[0].email;
    faculty.college = college;

    await facultyRepository.save(faculty);

    const department = new Department();
    department.name = departmentData[0].name;
    department.email = departmentData[0].email;
    department.faculty = faculty;

    await departmentRepository.save(department);

    const classEntity = new Class();
    classEntity.name = classData[0].name;
    classEntity.department = department;
    await classRepository.save(classEntity);

    const exam = new CourseExam();
    await courseExamRepository.save(exam);

    const course = new Course();
    course.name = coursesData[0].name;
    course.course_code = coursesData[0].code;
    course.credits = coursesData[0].credits;
    course.exams = [exam];
    await courseRepository.save(course);

    const semester = new Semester();
    semester.semester_number = 1;
    semester.class = classEntity;
    semester.courses = [course];
    await semesterRepository.save(semester);

    const student = new Student();
    student.first_name = studentData[0].firstName;
    student.last_name = studentData[0].lastName;
    student.email = studentData[0].email;
    student.gender = studentData[0].gender;
    student.address = studentData[0].address;
    student.phone_number = studentData[0].phoneNumber;
    student.date_of_birth = new Date();
    student.password = await HashHelper.encrypt('password');
    student.class = classEntity;
    await studentRepository.save(student);

    return { exam, organization, iec, student };
  };
});
