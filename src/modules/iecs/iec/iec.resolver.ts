import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from 'src/shared/guards';
import { UploadExamResultsInput } from 'src/shared/inputs';
import { UploadExamResultsResponseType } from 'src/shared/types';
import { IecService } from './iec.service';

@Resolver()
export class IecResolver {
  constructor(private readonly iecService: IecService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => UploadExamResultsResponseType)
  uploadExamResults(
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
    return this.iecService.uploadExamResults({
      organizationEmail,
      iecEmail: email,
      results,
    });
  }
}
