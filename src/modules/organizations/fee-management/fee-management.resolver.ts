import { UseGuards } from '@nestjs/common';

import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { FeeManagementService } from './fee-management.service';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import { CreateFeeInput } from 'src/shared/inputs/create-fee.input';
import { Fee } from '../org/entities/fee.entity';

@Resolver()
export class FeeManagementResolver {
  constructor(private readonly feeManagementService: FeeManagementService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [Fee])
  createFacultyFees(
    @Context() context: { req: { user: { email: string } } },
    @Args('fees', { type: () => [CreateFeeInput!]!, nullable: false })
    fees: CreateFeeInput[],
    @Args('facultyId', { type: () => String!, nullable: false })
    facultyId: string,
  ) {
    const { email } = context.req.user;

    return this.feeManagementService.createFacultyFees({
      organizationEmail: email,
      fees,
      facultyId,
    });
  }
}
