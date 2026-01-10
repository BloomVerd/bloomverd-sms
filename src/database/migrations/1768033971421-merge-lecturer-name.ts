import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeLecturerName1768033971421 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new 'name' column
    await queryRunner.query(`
        ALTER TABLE "lecturers"
        ADD COLUMN "name" character varying
      `);

    // Merge first_name and last_name into name
    await queryRunner.query(`
        UPDATE "lecturers"
        SET "name" = CONCAT(COALESCE("first_name", ''), ' ', COALESCE("last_name", ''))
        WHERE "first_name" IS NOT NULL OR "last_name" IS NOT NULL
      `);

    // Clearn up any double spaces
    await queryRunner.query(`
      UPDATE "lecturers"
      SET "name" = TRIM(REGEXP_REPLACE("name", '\s+', ' ', 'g'))
      WHERE "name" IS NOT NULL
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the 'name' column
    await queryRunner.query(`
      ALTER TABLE "lecturers"
      DROP COLUMN "name"
      `);
  }
}
