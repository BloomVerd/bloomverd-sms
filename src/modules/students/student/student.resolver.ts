import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CourseExamResultTypeClass,
  CourseMaterialTypeClass,
  CourseTypeClass,
  SemesterTypeClass,
} from 'src/database/types';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import { StudentService } from './student.service';

@Resolver()
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [SemesterTypeClass])
  async getStudentSemesters(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesters(email);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseTypeClass])
  async getStudentSemesterCourses(
    @Context() context: { req: { user: { email: string } } },
    @Args('semesterId', { type: () => String }) semesterId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesterCourses({ semesterId, email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseMaterialTypeClass])
  async getStudentCourseMaterials(
    @Context() context: { req: { user: { email: string } } },
    @Args('courseId', { type: () => String }) courseId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentCourseMaterials({ courseId, email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseExamResultTypeClass])
  async getStudentSemesterResults(
    @Context() context: { req: { user: { email: string } } },
    @Args('semesterId', { type: () => String }) semesterId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesterResults({ semesterId, email });
  }
}
