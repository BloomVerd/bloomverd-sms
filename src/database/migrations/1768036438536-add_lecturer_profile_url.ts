import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLecturerProfileUrl1768036438536 implements MigrationInterface {
  profileUrl = process.env.DEFAULT_PROFILE_URL;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new 'profile_url' column
    await queryRunner.query(`
        ALTER TABLE "lecturers"
        ADD COLUMN "profile_url" character varying
      `);

    // Set the default value for profile_url to an empty string
    await queryRunner.query(`
        UPDATE "lecturers"
        SET "profile_url" = '${this.profileUrl}'
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the 'profile_url' column
    await queryRunner.query(`
        ALTER TABLE "lecturers"
        DROP COLUMN "profile_url"
      `);
  }
}
