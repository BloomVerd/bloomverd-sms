import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import {
  CreateClassInput,
  CreateClassSemesterInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateDepartmentInput,
  CreateFacultyInput,
  CreateLecturereInput,
  createStudentInput,
  PaginationInput,
} from 'src/shared/inputs';
import {
  DepartmentType,
  FacultyType,
  LecturerType,
  RegisterResponseType,
} from 'src/shared/types';
import { CollegeType } from 'src/shared/types';
import { OrgService } from './org.service';

@Resolver()
export class OrgResolver {
  constructor(private readonly orgService: OrgService) {}

  @Query(() => CollegeType)
  listOrganizationColleges(
    @Args('searchTerm') searchTerm: string,
    @Args('organizationId', { nullable: true }) organizationId?: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ) {
    return this.orgService.listOrganizationCollegePaginated({
      organizationId,
      searchTerm,
      pagination,
    });
  }

  @Query(() => DepartmentType)
  async listOrganizationDepartments() {
    return {
      departments: [
        {
          id: '1',
          name: 'Computer Science Department',
        },
        {
          id: '2',
          name: 'Mathematics Department',
        },
      ],
    };
  }

  @Query(() => CollegeType)
  async getOrganizationCollege(
    @Args('input') input: 'collegeId',
  ): Promise<CollegeType> {
    console.log(input);
    return {
      colleges: [
        {
          id: '1',
          name: 'Science College',
        },
      ],
    };
  }

  @Query(() => DepartmentType)
  async getOrganizationDepartMent(
    @Args('input') input: 'departmentId',
  ): Promise<DepartmentType> {
    console.log(input);
    return {
      departments: [
        {
          id: '1',
          name: 'Biomedical Department',
        },
      ],
    };
  }

  @Mutation(() => CollegeType)
  async createOrganizationCollege(
    @Args('input') input: CreateCollegeInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'College created successfully',
    };
  }

  @Mutation(() => DepartmentType)
  async createOrganizationDepartment(
    @Args('input') input: CreateDepartmentInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Department created successfully',
    };
  }

  @Mutation(() => FacultyType)
  async createOrganizationFaculty(
    @Args('input') input: CreateFacultyInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Faculty created successfully',
    };
  }

  @Mutation(() => LecturerType)
  async createLecturer(
    @Args('input') input: CreateLecturereInput,
  ): Promise<LecturerType> {
    console.log(input);
    return {
      email: input.email,
      id: '1',
      firstName: input.firstName,
      lastName: input.lastName,
      facultyId: input.facultyId,
    };
  }

  @Mutation(() => RegisterResponseType)
  async assignLecturerToDepartment(
    @Args('lecturerId') lecturerId: string,
    @Args('departmentId') departmentId: string,
  ): Promise<RegisterResponseType> {
    console.log({ lecturerId, departmentId });
    return {
      message: 'Lecturer assigned to department successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async createClass(
    @Args('input') input: CreateClassInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Class created successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async assignClassToDepartment(
    @Args('classId') classId: string,
    @Args('departmentId') departmentId: string,
  ): Promise<RegisterResponseType> {
    console.log({ classId, departmentId });
    return {
      message: 'Class assigned to department successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async createClassSemester(
    @Args('input') input: CreateClassSemesterInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Class semester created successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async createCourse(
    @Args('input') input: CreateCourseInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Course created successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async assignCourseToClassSemester(
    @Args('courseId') courseId: string,
    @Args('classSemesterId') classSemesterId: string,
  ): Promise<RegisterResponseType> {
    console.log({ courseId, classSemesterId });
    return {
      message: 'Course assigned to class semester successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async createStudent(
    @Args('input') input: createStudentInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Student created successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async assignStudentToClass(
    @Args('studentId') studentId: string,
    @Args('classId') classId: string,
  ): Promise<RegisterResponseType> {
    console.log({ studentId, classId });
    return {
      message: 'Student assigned to class successfully',
    };
  }

  @Mutation(() => RegisterResponseType)
  async enrollStudentInCourse(
    @Args('studentId') studentId: string,
    @Args('courseId') courseId: string,
  ): Promise<RegisterResponseType> {
    console.log({ studentId, courseId });
    return {
      message: 'Student enrolled in course successfully',
    };
  }
}
