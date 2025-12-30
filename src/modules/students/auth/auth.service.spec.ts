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
  Department,
  entities,
  Faculty,
  Organization,
  Semester,
  Student,
} from '../../../database/entities';
import { Gender } from '../../../shared/enums';
import { HashHelper } from '../../../shared/helpers';
import { AuthConsumer } from './auth.consumer';
import { AuthProducer } from './auth.producer';
import { AuthService } from './auth.service';

describe('StudentService', () => {
  let module: TestingModule;
  let connection: Connection;
  let studentQueue: Queue;
  let authConsumer: AuthConsumer;

  let authService: AuthService;
  let orgRepository: Repository<Organization>;
  let collegeRepository: Repository<College>;
  let facultyRepository: Repository<Faculty>;
  let departmentRepository: Repository<Department>;
  let classRepository: Repository<Class>;
  let studentRepository: Repository<Student>;
  let semesterRepository: Repository<Semester>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        BullModule.registerQueue({
          name: 'student-queue',
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
      providers: [AuthService, AuthProducer, AuthConsumer],
    }).compile();

    connection = module.get<Connection>(Connection);
    studentQueue = module.get<Queue>(getQueueToken('student-queue'));
    authConsumer = module.get<AuthConsumer>(AuthConsumer);
    authService = module.get<AuthService>(AuthService);
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

    classRepository = module.get<Repository<Class>>(getRepositoryToken(Class));
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

    await studentQueue.clean(0, 3, 'active');
    await studentQueue.clean(0, 3, 'completed');
    await studentQueue.clean(0, 3, 'failed');
    await studentQueue.clean(0, 3, 'delayed');
    await studentQueue.clean(0, 3, 'wait');

    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await connection.close();
    await module.close();
  });

  describe('requestPasswordReset', () => {
    it('should return successful message after request sent', async () => {
      const { student } = await setupData();

      const response = await authService.requestPasswordReset(student.email);

      expect(response.message).toEqual(
        'Password reset email sent successfully',
      );
    });
  });

  describe('resetPassword', () => {
    // console.log('tests to be written', authService);
    it('should return successful message after password reset', async () => {
      const { student } = await setupData();

      const { resetToken } = await authService.requestPasswordReset(
        student.email,
      );

      const response = await authService.resetPassword(
        student.email,
        resetToken || '',
        'newPassword',
      );

      expect(response).toEqual({
        message: 'Password reset successfully',
      });
    });
  });

  // describe('resetPassword', () => {
  //   console.log('tests to be written', authService);
  // });

  // helpers

  const processQueueJobs = async (): Promise<void> => {
    // Get all waiting jobs
    const jobs = await studentQueue.getWaiting(0, -1);

    // If there are jobs, process them
    if (jobs.length > 0) {
      for (const job of jobs) {
        try {
          // Manually call the consumer's process method
          await authConsumer.process(job);
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

  const setupData = async () => {
    const organization = new Organization();
    organization.name = 'Test University';
    organization.email = 'test@email.com';
    organization.password = await HashHelper.encrypt('password');

    await orgRepository.save(organization);

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

    const semester = new Semester();
    semester.semester_number = 1;
    semester.class = classEntity;
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

    return { student };
  };
});
