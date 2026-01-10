import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationProfileUrl1768035760863
  implements MigrationInterface
{
  profileUrl = process.env.DEFAULT_PROFILE_URL;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new 'profile_url' column
    await queryRunner.query(`
        ALTER TABLE "organizations"
        ADD COLUMN "profile_url" character varying
      `);

    // Set the default value for profile_url to an empty string
    await queryRunner.query(`
        UPDATE "organizations"
        SET "profile_url" = '${this.profileUrl}'
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the 'profile_url' column
    await queryRunner.query(`
        ALTER TABLE "organizations"
        DROP COLUMN "profile_url"
      `);
  }
}
