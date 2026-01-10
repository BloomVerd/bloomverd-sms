import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProfileUrlOnOrganization1768037711367
  implements MigrationInterface
{
  profileUrl = process.env.DEFAULT_PROFILE_URL;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE "organizations"
          SET "profile_url" = '${this.profileUrl}'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE "organizations"
          SET "profile_url" = ''
        `);
  }
}
