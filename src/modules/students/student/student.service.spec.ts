import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Connection, Repository } from 'typeorm';
import { entities, Student } from '../../../database/entities';
import { Gender } from '../../../shared/enums';
import { HashHelper } from '../../../shared/helpers';
import { AuthProducer } from '../auth/auth.producer';
import { StudentService } from './student.service';

describe('StudentService', () => {
  let module: TestingModule;
  let connection: Connection;
  let studentQueue: Queue;

  let studentService: StudentService;
  let authProducer: AuthProducer;
  let studentRepository: Repository<Student>;

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
      providers: [StudentService, AuthProducer],
    }).compile();

    connection = module.get<Connection>(Connection);
    studentQueue = module.get<Queue>(getQueueToken('student-queue'));
    studentService = module.get<StudentService>(StudentService);
    authProducer = module.get<AuthProducer>(AuthProducer);
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
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
    it('should generate a reset token and send email for existing student', async () => {
      // Create a test student
      const student = await studentRepository.save({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone_number: '+1234567890',
        address: '123 Test St',
        date_of_birth: new Date('2000-01-01'),
        gender: Gender.MALE,
        password: await HashHelper.encrypt('password123'),
      });

      // Mock the authProducer
      const sendEmailSpy = jest
        .spyOn(authProducer, 'sendPasswordResetEmail')
        .mockResolvedValue(undefined);

      const result = await studentService.requestPasswordReset(
        'john.doe@example.com',
      );

      expect(result.message).toBe('Password reset email sent successfully');

      // Verify token was saved
      const updatedStudent = await studentRepository.findOne({
        where: { id: student.id },
      });
      expect(updatedStudent?.reset_token).toBeDefined();
      expect(updatedStudent?.reset_token_expires_at).toBeDefined();
      expect(updatedStudent?.reset_token_expires_at?.getTime()).toBeGreaterThan(
        new Date().getTime(),
      );

      // Verify email was sent
      expect(sendEmailSpy).toHaveBeenCalledWith({
        email: 'john.doe@example.com',
      });
    });

    it('should throw NotFoundException for non-existent student', async () => {
      await expect(
        studentService.requestPasswordReset('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Create a test student with a reset token
      const resetToken = 'test-reset-token-123';
      const hashedToken = await HashHelper.encrypt(resetToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const student = await studentRepository.save({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone_number: '+0987654321',
        address: '456 Test Ave',
        date_of_birth: new Date('2001-02-15'),
        gender: Gender.FEMALE,
        password: await HashHelper.encrypt('oldpassword'),
        reset_token: hashedToken,
        reset_token_expires_at: expiresAt,
      });

      const result = await studentService.resetPassword(
        'jane.smith@example.com',
        resetToken,
        'newpassword123',
      );

      expect(result.message).toBe('Password reset successfully');

      // Verify password was updated and token was invalidated
      const updatedStudent = await studentRepository.findOne({
        where: { id: student.id },
      });

      console.log(updatedStudent);
      expect(updatedStudent?.reset_token).toBeNull();
      expect(updatedStudent?.reset_token_expires_at).toBeNull();
      expect(
        await HashHelper.compare(
          'newpassword123',
          updatedStudent?.password || '',
        ),
      ).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      await expect(
        studentService.resetPassword(
          'jane.smith@example.com',
          'invalid-token',
          'newpassword',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      // Create a test student with an expired reset token
      const resetToken = 'expired-token';
      const hashedToken = await HashHelper.encrypt(resetToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1); // Expired 1 hour ago

      await studentRepository.save({
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@example.com',
        phone_number: '+1122334455',
        address: '789 Test Blvd',
        date_of_birth: new Date('1999-03-20'),
        gender: Gender.MALE,
        password: await HashHelper.encrypt('password'),
        reset_token: hashedToken,
        reset_token_expires_at: expiresAt,
      });

      await expect(
        studentService.resetPassword(
          'jane.smith@example.com',
          resetToken,
          'newpassword',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
