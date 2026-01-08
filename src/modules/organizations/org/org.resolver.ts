import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import {
  ClassTypeClass,
  CollegeTypeClass,
  CourseMaterialTypeClass,
  CourseTypeClass,
  DepartmentTypeClass,
  FacultyTypeClass,
  IecTypeClass,
  SemesterTypeClass,
  StudentTypeClass,
} from 'src/database/types';
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
  OrganizationClassFilterInput,
  OrganizationCourseFilterInput,
  OrganizationDepartmentFilterInput,
  OrganizationFacultyFilterInput,
  OrganizationStudentFilterInput,
  UploadExamResultsInput,
} from '../../../shared/inputs';
import {
  FeeConnection,
  RegisterResponseType,
  StudentConnection,
  UploadExamResultsResponseType,
  ValidationResponseType,
} from '../../../shared/types';
import { OrgService } from './org.service';

@Resolver()
export class OrgResolver {
  constructor(private readonly orgService: OrgService) {}
  // Queries
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
  @Query(() => FeeConnection)
  listActiveSemesterFees(
    @Context() context: { req: { user: { email: string } } },
    @Args('searchTerm', { type: () => String, nullable: true })
    searchTerm?: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const { email } = context.req.user;

    return this.orgService.listActiveSemesterFees({
      email,
      searchTerm,
      page,
      limit,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [FacultyTypeClass])
  getOrganizationFaculties(
    @Context() context: { req: { user: { email: string } } },
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationFacultyFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationFaculties({
      email,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CollegeTypeClass])
  getOrganizationColleges(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationColleges({
      email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [DepartmentTypeClass])
  getOrganizationDepartments(
    @Context() context: { req: { user: { email: string } } },
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationDepartmentFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationDepartments({
      email,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [ClassTypeClass])
  getOrganizationClasses(
    @Context() context: { req: { user: { email: string } } },
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationClassFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationClasses({
      email,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CourseTypeClass])
  getOrganizationClassCourses(
    @Context() context: { req: { user: { email: string } } },
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationCourseFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationClassCourses({
      email,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => StudentConnection)
  listOrganizationStudents(
    @Context() context: { req: { user: { email: string } } },
    @Args('searchTerm', { type: () => String, nullable: true })
    searchTerm?: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationStudentFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.listOrganizationStudents({
      email,
      searchTerm,
      page,
      limit,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => StudentTypeClass)
  getOrganizationStudent(
    @Context() context: { req: { user: { email: string } } },
    @Args('studentId', { type: () => String, nullable: false })
    studentId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationStudent({
      email,
      studentId,
    });
  }

  // Mutations
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass])
  setSemestersToInProgress(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.setSemestersToInProgress({
      organizationEmail: email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass], { nullable: true })
  setSemesterToCompleted(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.setSemestersToCompleted({
      organizationEmail: email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => IecTypeClass)
  addOrganizationIEC(
    @Context() context: { req: { user: { email: string } } },
    @Args('iecEmail', {
      type: () => String!,
      nullable: false,
    })
    iecEmail: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationIEC({
      organizationEmail: email,
      iecEmail,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [CourseMaterialTypeClass])
  uploadCourseMaterial(
    @Context() context: { req: { user: { email: string } } },
    @Args('courseId', { type: () => String!, nullable: false })
    courseId: string,
    @Args('files', { type: () => [GraphQLUpload!]!, nullable: false })
    files: FileUpload[],
  ) {
    const { email } = context.req.user;

    return this.orgService.uploadCourseMaterial({
      organizationEmail: email,
      courseId,
      files,
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => UploadExamResultsResponseType)
  uploadExamResultsFromOrganization(
    @Context() context: { req: { user: { email: string } } },
    @Args('organizationEmail', { type: () => String!, nullable: false })
    organizationEmail: string,
    @Args('results', {
      type: () => [UploadExamResultsInput!]!,
      nullable: false,
    })
    results: UploadExamResultsInput[],
  ) {
    const { email } = context.req.user;
    return this.orgService.uploadExamResultsFromOrganization({
      organizationEmail,
      results,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass])
  addOrganizationColleges(
    @Context() context: { req: { user: { email: string } } },
    @Args('colleges', {
      type: () => [CreateCollegeInput!],
      nullable: true,
    })
    colleges: CreateCollegeInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.createColleges({
      organizationEmail: email,
      colleges,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass])
  addOrganizationFaculties(
    @Context() context: { req: { user: { email: string } } },
    @Args('faculties', {
      type: () => [CreateFacultyWithRelationshipInput!],
      nullable: true,
    })
    faculties: CreateFacultyWithRelationshipInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.createFaculties({
      organizationEmail: email,
      faculties,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass])
  addOrganizationClasses(
    @Context() context: { req: { user: { email: string } } },
    @Args('classes', {
      type: () => [CreateClassWithRelationshipInput!],
      nullable: true,
    })
    classes: CreateClassWithRelationshipInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.createClasses({
      organizationEmail: email,
      classes,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [SemesterTypeClass])
  addOrganizationStudents(
    @Context() context: { req: { user: { email: string } } },
    @Args('students', {
      type: () => [CreateStudentWithRelationshipInput!],
      nullable: true,
    })
    students: CreateStudentWithRelationshipInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.createStudents({
      organizationEmail: email,
      students,
    });
  }
}
