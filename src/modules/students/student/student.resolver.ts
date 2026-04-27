import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Course } from 'src/modules/organizations/org/entities/course.entity';
import { CourseExamResult } from 'src/modules/organizations/org/entities/course-exam-result.entity';
import { CourseMaterial } from 'src/modules/organizations/org/entities/course-material.entity';
import { Fee } from 'src/modules/organizations/org/entities/fee.entity';
import { Semester } from 'src/modules/organizations/org/entities/semester.entity';
import { Student } from './entities/student.entity';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import { StudentService } from './student.service';
import { StudentAcademicStructureResponse } from 'src/shared/types/student-academic-structure-response';

@Resolver()
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Semester], { nullable: true })
  async getStudentSemesters(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesters(email);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [StudentAcademicStructureResponse], { nullable: true })
  async getStudentAcademicStructure(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentAcademicStructure(email);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Course])
  async getStudentSemesterCourses(
    @Context() context: { req: { user: { email: string } } },
    @Args('semesterId', { type: () => String }) semesterId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesterCourses({ semesterId, email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseMaterial])
  async getStudentCourseMaterials(
    @Context() context: { req: { user: { email: string } } },
    @Args('courseId', { type: () => String }) courseId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentCourseMaterials({ courseId, email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseExamResult])
  async getStudentSemesterResults(
    @Context() context: { req: { user: { email: string } } },
    @Args('semesterId', { type: () => String }) semesterId: string,
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentSemesterResults({ semesterId, email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Course])
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
  @Query(() => [Fee])
  async getStudentFees(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;
    return this.studentService.getStudentFees({ email });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Student)
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
