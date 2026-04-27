import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Iec } from 'src/modules/iecs/iec/entities/iec.entity';
import { Student } from 'src/modules/students/student/entities/student.entity';
import { Class } from './entities/class.entity';
import { College } from './entities/college.entity';
import { Course } from './entities/course.entity';
import { CourseMaterial } from './entities/course-material.entity';
import { Department } from './entities/department.entity';
import { Faculty } from './entities/faculty.entity';
import { Fee } from './entities/fee.entity';
import { Lecturer } from './entities/lecturer.entity';
import { Organization } from './entities/organization.entity';
import { Semester } from './entities/semester.entity';
import { GqlJwtAuthGuard } from '../../../shared/guards';
import {
  AddClassInput,
  AddCollegeInput,
  AddDepartmentInput,
  AddFacultyInput,
  AddLecturerInput,
  AddStudentInput,
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
  OrganizationLecturerFilterInput,
  OrganizationStudentFilterInput,
  UploadExamResultsInput,
} from '../../../shared/inputs';
import {
  FeeConnection,
  LecturerConnection,
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
  @Query(() => [Faculty])
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
  @Query(() => [College])
  getOrganizationColleges(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationColleges({
      email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Department])
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
  @Query(() => [Class])
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
  @Query(() => [Course])
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
  @Query(() => LecturerConnection)
  listOrganizationLecturers(
    @Context() context: { req: { user: { email: string } } },
    @Args('searchTerm', { type: () => String, nullable: true })
    searchTerm?: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('filter', {
      nullable: true,
    })
    filter?: OrganizationLecturerFilterInput,
  ) {
    const { email } = context.req.user;

    return this.orgService.listOrganizationLecturers({
      email,
      searchTerm,
      page,
      limit,
      filter,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Student)
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

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Lecturer)
  getOrganizationLecturer(
    @Context() context: { req: { user: { email: string } } },
    @Args('lecturerId', { type: () => String, nullable: false })
    lecturerId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationLecturer({
      email,
      lecturerId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Fee)
  getOrganizationFee(
    @Context() context: { req: { user: { email: string } } },
    @Args('feeId', { type: () => String, nullable: false })
    feeId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.getOrganizationFee({
      email,
      feeId,
    });
  }

  // Mutations
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Semester])
  setSemestersToInProgress(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.setSemestersToInProgress({
      organizationEmail: email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Semester], { nullable: true })
  setSemesterToCompleted(
    @Context() context: { req: { user: { email: string } } },
  ) {
    const { email } = context.req.user;

    return this.orgService.setSemestersToCompleted({
      organizationEmail: email,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Iec)
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
  @Mutation(() => [CourseMaterial])
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
    @Args('results', {
      type: () => [UploadExamResultsInput!]!,
      nullable: false,
    })
    results: UploadExamResultsInput[],
  ) {
    const { email } = context.req.user;
    return this.orgService.uploadExamResultsFromOrganization({
      organizationEmail: email,
      results,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [College])
  addOrganizationColleges(
    @Context() context: { req: { user: { email: string } } },
    @Args('colleges', {
      type: () => [AddCollegeInput!],
      nullable: true,
    })
    colleges: AddCollegeInput[],
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationColleges({
      organizationEmail: email,
      colleges,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Faculty])
  addOrganizationFaculties(
    @Context() context: { req: { user: { email: string } } },
    @Args('faculties', {
      type: () => [AddFacultyInput!],
      nullable: true,
    })
    faculties: AddFacultyInput[],
    @Args('collegeId', { type: () => String!, nullable: false })
    collegeId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationFaculties({
      organizationEmail: email,
      faculties,
      collegeId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Faculty])
  addOrganizationDepartments(
    @Context() context: { req: { user: { email: string } } },
    @Args('departments', {
      type: () => [AddDepartmentInput!],
      nullable: true,
    })
    departments: AddDepartmentInput[],
    @Args('facultyId', { type: () => String!, nullable: false })
    facultyId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationDepartments({
      organizationEmail: email,
      departments,
      facultyId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Class])
  addOrganizationClasses(
    @Context() context: { req: { user: { email: string } } },
    @Args('classes', {
      type: () => [AddClassInput!],
      nullable: true,
    })
    classes: AddClassInput[],
    @Args('departmentId', { type: () => String!, nullable: false })
    departmentId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationClasses({
      organizationEmail: email,
      classes,
      departmentId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Student])
  addOrganizationStudents(
    @Context() context: { req: { user: { email: string } } },
    @Args('students', {
      type: () => [AddStudentInput!],
      nullable: true,
    })
    students: AddStudentInput[],
    @Args('classId', { type: () => String!, nullable: false })
    classId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationStudents({
      organizationEmail: email,
      students,
      classId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Student])
  addOrganizationLecturers(
    @Context() context: { req: { user: { email: string } } },
    @Args('lecturers', {
      type: () => [AddLecturerInput!],
      nullable: true,
    })
    lecturers: AddLecturerInput[],
    @Args('departmentId', { type: () => String!, nullable: false })
    departmentId: string,
  ) {
    const { email } = context.req.user;

    return this.orgService.addOrganizationLecturers({
      organizationEmail: email,
      lecturers,
      departmentId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Organization)
  updateOrganizationProfileUrl(
    @Context() context: { req: { user: { email: string } } },
    @Args('file', { type: () => GraphQLUpload, nullable: false })
    file: FileUpload,
  ) {
    const { email } = context.req.user;

    return this.orgService.updateProfileUrl({
      organizationEmail: email,
      file,
    });
  }
}
