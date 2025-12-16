import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { entities } from '../../../database/entities';
import { OrgService } from './org.service';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationService', () => {
  let module: TestingModule;
  let connection: Connection;

  let orgService: OrgService;

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

  describe('createOrganizationCollege', () => {
    it('Create a new College linked to an Organization', async () => {
      const collegeData = {
        name: 'Test College',
        organizationId: 'org-123',
        email: 'college@gmail.com',

        // other college properties
      };

      const college = await orgService.createOrganizationCollege(collegeData);

      expect(college).toBeDefined();
      expect(college.name).toBe(collegeData.name);
      expect(college.email).toBe(collegeData.email);
      expect(college.organizationId).toBe(collegeData.organizationId);
    });

    it('should throw an error if organization does not exist', async () => {
      const nonExistentOrgId = 'non-existent-id';
      const collegeData = {
        name: 'Test College',
        organizationId: nonExistentOrgId,
        email: 'college@gmail.com',
      };

      await expect(
        orgService.createOrganizationCollege(collegeData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrganizationDepartment', () => {
    it('Create a new Department linked to a Faculty', async () => {
      const departmentData = {
        name: 'Test Department',
        facultyId: 'faculty-123',
        email: 'department@gmail.com',
      };

      const response =
        await orgService.createOrganizationDepartment(departmentData);

      expect(response).toBeDefined();
    });

    it('should throw an error if faculty does not exist', async () => {
      const nonExistentFacultyId = 'non-existent-id';
      const departmentData = {
        name: 'Test Department',
        facultyId: nonExistentFacultyId,
        email: 'department@gmail.com',
      };

      await expect(
        orgService.createOrganizationDepartment(departmentData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrganizationFaculty', () => {
    it('Create a new Faculty linked to a College', async () => {
      const facultyData = {
        name: 'Test Faculty',
        collegeId: 'college-123',
        email: 'faculty@gmail.com',
      };

      const response = await orgService.createOrganizationFaculty(facultyData);

      expect(response).toBeDefined();
    });

    it('should throw an error if college does not exist', async () => {
      const nonExistentCollegeId = 'non-existent-id';
      const facultyData = {
        name: 'Test Faculty',
        collegeId: nonExistentCollegeId,
        email: 'faculty@gmail.com',
      };

      await expect(
        orgService.createOrganizationFaculty(facultyData),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
