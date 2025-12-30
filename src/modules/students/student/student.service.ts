import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities';
import { HashHelper } from '../../../shared/helpers';
import { AuthProducer } from '../auth/auth.producer';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly authProducer: AuthProducer,
  ) {}
}
