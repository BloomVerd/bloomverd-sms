import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Faculty } from '../org/entities/faculty.entity';
import { Fee } from '../org/entities/fee.entity';
import { Organization } from '../org/entities/organization.entity';
import { CreateFeeInput } from 'src/shared/inputs/create-fee.input';
import { Repository } from 'typeorm';

@Injectable()
export class FeeManagementService {
  private readonly logger = new Logger(FeeManagementService.name);

  constructor(
    @InjectRepository(Faculty)
    private readonly facultyRepository: Repository<Faculty>,
  ) {}

  async createFacultyFees({
    facultyId,
    fees,
    organizationEmail,
  }: {
    facultyId: string;
    fees: CreateFeeInput[];
    organizationEmail: string;
  }) {
    return this.facultyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const organization = await transactionalEntityManager.findOne(
          Organization,
          {
            where: {
              email: organizationEmail,
              colleges: {
                faculties: {
                  id: facultyId,
                },
              },
            },
            relations: ['colleges.faculties.fees'],
          },
        );
        if (!organization) {
          this.logger.error('Organiztion not found or faculty does not exist!');
          throw new BadRequestException(
            'Organiztion not found or faculty does not exist!',
          );
        }

        const existingFees = organization.colleges[0].faculties[0].fees.filter(
          (fee) => fee.year_group === fees[0].yearGroup,
        );

        if (existingFees.length > 0) {
          this.logger.error('Fee already exists for the given year group!');
          throw new BadRequestException(
            'Fee already exists for the given year group!',
          );
        }

        const new_faculty_fee: Fee[] = await Promise.all(
          fees.map(async (fee) => {
            const new_fee = new Fee();
            new_fee.name = fee.name;
            new_fee.description = fee.description;
            new_fee.fee_amount = fee.amount;
            new_fee.currency = fee.currency;
            new_fee.fee_type = fee.feeType;
            new_fee.student_type = fee.studentType;
            new_fee.faculty = organization.colleges[0].faculties[0];
            new_fee.year_group = fee.yearGroup;
            new_fee.level = fee.level;
            return new_fee;
          }),
        );
        this.logger.log(
          `Fee created for faculty with ID ${facultyId} successfully`,
        );

        return transactionalEntityManager.save(new_faculty_fee);
      },
    );
  }
}
