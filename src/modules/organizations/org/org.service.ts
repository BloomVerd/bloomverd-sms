import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  College,
  Department,
  Faculty,
  Organization,
  Class,
  Lecturer,
  Course,
  Semester,
  Student,
} from 'src/database/entities';
import { ILike, Repository } from 'typeorm';

import {
  CreateClassInput,
  CreateClassSemesterInput,
  CreateCollegeInput,
  CreateCourseInput,
  CreateFacultyInput,
  createStudentInput,
  CreateDepartmentInput,
  CreateLecturereInput,
  PaginationInput,
} from 'src/shared/inputs';
import { CollegeType } from 'src/shared/types';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    @InjectRepository(Faculty)
    private facultyRepository: Repository<Faculty>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Lecturer)
    private lecturerRepository: Repository<Lecturer>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Semester)
    private semesterRepository: Repository<Semester>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async listOrganizationCollegePaginated({
    organizationId,
    searchTerm,
    pagination,
  }: {
    organizationId?: string;
    searchTerm: string;
    pagination?: PaginationInput;
  }) {
    const college = await this.listOrganizationColleges({
      organizationId,
      searchTerm,
    });

    return this.paginate<College>(college, pagination, (college) =>
      college.id.toString(),
    );
  }

  async listOrganizationColleges({
    organizationId,
    searchTerm,
  }: {
    organizationId?: string;
    searchTerm: string;
  }) {
    return this.collegeRepository.find({
      where: {
        organization: organizationId ? { id: organizationId } : undefined,
        // name: searchTerm ? ILike(`%${searchTerm}%`) : undefined,
      },
      relations: ['organization', 'faculties'],
    });
  }

  private paginate<T>(
    items: T[],
    paginationInput: PaginationInput = {},
    cursorExtractor: (item: T) => string | number,
  ) {
    const { first, after, last, before } = paginationInput;

    // Default values
    const defaultFirst = 10;
    let limit = first || defaultFirst;
    let afterIndex = -1;
    let beforeIndex = items.length;

    // Determine indices based on cursors
    if (after) {
      const decodedCursor = this.decodeCursor(after);
      afterIndex = items.findIndex(
        (item) => String(cursorExtractor(item)) === decodedCursor,
      );
      if (afterIndex === -1)
        afterIndex = -1; // Not found
      else afterIndex = afterIndex; // Include items after this index
    }

    if (before) {
      const decodedCursor = this.decodeCursor(before);
      beforeIndex = items.findIndex(
        (item) => String(cursorExtractor(item)) === decodedCursor,
      );
      if (beforeIndex === -1)
        beforeIndex = items.length; // Not found
      else beforeIndex = beforeIndex; // Include items before this index
    }

    // Handle the 'last' parameter by adjusting the starting point
    if (last) {
      const potentialCount = beforeIndex - afterIndex - 1;
      if (potentialCount > last) {
        afterIndex = beforeIndex - last - 1;
      }
      limit = last;
    }

    // Get the paginated items
    const slicedItems = items.slice(afterIndex + 1, beforeIndex);
    const paginatedItems = slicedItems.slice(0, limit);

    // Create edges with cursors
    const edges = paginatedItems.map((item) => ({
      cursor: this.encodeCursor(String(cursorExtractor(item))),
      node: item,
    }));

    // Determine if there are more pages
    const hasNextPage = beforeIndex > afterIndex + 1 + paginatedItems.length;
    const hasPreviousPage = afterIndex >= 0;

    // Create the pageInfo object
    const pageInfo = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      count: items.length,
    };
  }

  /**
   * Encode a cursor to Base64
   */
  private encodeCursor(cursor: string): string {
    return Buffer.from(cursor).toString('base64');
  }

  /**
   * Decode a cursor from Base64
   */
  private decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }
}
