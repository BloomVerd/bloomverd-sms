import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
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
import { BullModule } from '@nestjs/bullmq';
import { OrgConsumer } from 'src/modules/organizations/org/org.consumer';

describe('OrganizationService', () => {
  let module: TestingModule;
  let connection: Connection;
  let organizationQueue: Queue;

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
      providers: [],
    }).compile();

    connection = module.get<Connection>(Connection);
    organizationQueue = module.get<Queue>(getQueueToken('organization-queue'));
    // orgService = module.get<OrgService>(OrgService);
    // orgConsumer = module.get<OrgConsumer>(OrgConsumer);
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
