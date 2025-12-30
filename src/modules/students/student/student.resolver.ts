import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  RequestPasswordResetInput,
  ResetPasswordInput,
} from '../../../shared/inputs';
import { PasswordResetResponseType } from '../../../shared/types';
import { StudentService } from './student.service';

@Resolver()
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}
}
