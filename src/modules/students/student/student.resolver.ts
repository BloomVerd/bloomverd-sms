import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import {
  CourseExamResultTypeClass,
  CourseMaterialTypeClass,
  CourseTypeClass,
  FeeTypeClass,
  SemesterTypeClass,
  StudentTypeClass,
} from 'src/database/types';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import { StudentService } from './student.service';

@Resolver()
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [SemesterTypeClass], { nullable: true })
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [CourseTypeClass])
  async registerSemesterCoursesForStudent(
    @Context() context: { req: { user: { email: string } } },
    @Args('courseIds', { type: () => [String], nullable: true })
    courseIds: string[],
  ) {
    const { email } = context.req.user;
    return this.studentService.registerSemesterCoursesForStudent({
      courseIds,
      email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [FeeTypeClass])
  async getStudentFees(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentFees({ email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => StudentTypeClass)
  async updateStudentProfileUrl(
    @Context() context: { req: { user: { email: string } } },
    @Args('file', { type: () => GraphQLUpload, nullable: false })
    file: FileUpload,
  ) {
    const { email } = context.req.user;
    return this.studentService.updateStudentProfileUrl({ email, file });
  }
}
/// Add status to semesters
// Ban two semesyers from being in progress
// Add endpoint to allow organization to set semester grogress by a particular class
//Endpoint for course registration
