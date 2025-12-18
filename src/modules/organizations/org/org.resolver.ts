import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../../shared/guards';
import {
  CreateClassInput,
  CreateClassWithRelationshipInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateCourseWithRelationshipInput,
  CreateDepartmentInput,
  CreateDepartmentWithRelationshipInput,
  CreateFacultyInput,
  CreateFacultyWithRelationshipInput,
  CreateLecturerInput,
  CreateLecturerWithRelationshipInput,
  CreateStudentInput,
  CreateStudentWithRelationshipInput,
} from '../../../shared/inputs';
import {
  RegisterResponseType,
  ValidationResponseType,
} from '../../../shared/types';
import { OrgService } from './org.service';

@Resolver()
export class OrgResolver {
  constructor(private readonly orgService: OrgService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateCollegeData(
    @Context() context: { req: { user: { email: string } } },
    @Args('colleges', { type: () => [CreateCollegeInput!]!, nullable: false })
    colleges: CreateCollegeInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateCollegeData({
      organizationEmail: email,
      colleges,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateFacultyData(
    @Context() context: { req: { user: { email: string } } },
    @Args('faculties', { type: () => [CreateFacultyInput!]!, nullable: false })
    faculties: CreateFacultyInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateFacultyData({
      organizationEmail: email,
      faculties,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateDepartmentData(
    @Context() context: { req: { user: { email: string } } },
    @Args('departments', {
      type: () => [CreateDepartmentInput!]!,
      nullable: false,
    })
    departments: CreateDepartmentInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateDepartmentData({
      organizationEmail: email,
      departments,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateLecturerData(
    @Context() context: { req: { user: { email: string } } },
    @Args('lecturers', {
      type: () => [CreateLecturerInput!]!,
      nullable: false,
    })
    lecturers: CreateLecturerInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateLecturerData({
      organizationEmail: email,
      lecturers,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateClassData(
    @Context() context: { req: { user: { email: string } } },
    @Args('classes', {
      type: () => [CreateClassInput!]!,
      nullable: false,
    })
    classes: CreateClassInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateClassData({
      organizationEmail: email,
      classes,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateStudentData(
    @Context() context: { req: { user: { email: string } } },
    @Args('students', {
      type: () => [CreateStudentInput!]!,
      nullable: false,
    })
    students: CreateStudentInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateStudentData({
      organizationEmail: email,
      students,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ValidationResponseType])
  validateCourseData(
    @Context() context: { req: { user: { email: string } } },
    @Args('courses', {
      type: () => [CreateCourseInput!]!,
      nullable: false,
    })
    courses: CreateCourseInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.validateCourseData({
      organizationEmail: email,
      courses,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => RegisterResponseType)
  setupAction(
    @Context() context: { req: { user: { email: string } } },
    @Args('colleges', { type: () => [CreateCollegeInput!], nullable: true })
    colleges: CreateCollegeInput[],
    @Args('faculties', {
      type: () => [CreateFacultyWithRelationshipInput!],
      nullable: true,
    })
    faculties: CreateFacultyWithRelationshipInput[],
    @Args('departments', {
      type: () => [CreateDepartmentWithRelationshipInput!],
      nullable: true,
    })
    departments: CreateDepartmentWithRelationshipInput[],
    @Args('lecturers', {
      type: () => [CreateLecturerWithRelationshipInput!],
      nullable: true,
    })
    lecturers: CreateLecturerWithRelationshipInput[],
    @Args('classes', {
      type: () => [CreateClassWithRelationshipInput!],
      nullable: true,
    })
    classes: CreateClassWithRelationshipInput[],
    @Args('students', {
      type: () => [CreateStudentWithRelationshipInput!],
      nullable: true,
    })
    students: CreateStudentWithRelationshipInput[],
    @Args('courses', {
      type: () => [CreateCourseWithRelationshipInput!],
      nullable: true,
    })
    courses: CreateCourseWithRelationshipInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.setupAction({
      organizationEmail: email,
      colleges,
      faculties,
      departments,
      lecturers,
      classes,
      students,
      courses,
    });
  }
}
