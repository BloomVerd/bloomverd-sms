# Refactor: Merge Entity and GraphQL Type Files + Relocate Entities to Modules

## Overview

Two related structural changes are required:

1. **Merge TypeORM entity files and GraphQL `@ObjectType` files into a single class** — currently they are duplicated in `src/database/entities/*.entity.ts` and `src/database/types/*.type.ts`, making it difficult to keep both in sync when fields change.
2. **Move entity files out of `src/database/entities/` into the sub-module folders they belong to** — entities should live next to the service/resolver that owns them.

---

## Part 1 — Merge Entity + GraphQL Type

### Problem

Every domain object currently has two separate class definitions:

```
src/database/entities/class.entity.ts   ← TypeORM only (@Entity, @Column, …)
src/database/types/class.type.ts        ← GraphQL only (@ObjectType, @Field, …)
```

When a new column is added to the entity, the type file must also be updated manually. These files should be one class.

### Target Pattern

Combine both decorator sets on a single class. Use `@Field()` from `@nestjs/graphql` alongside `@Column()` from `typeorm`. Mark relations as `@Field(() => RelatedType, { nullable: true })` so they are exposed to GraphQL only when loaded.

**Before — two files:**

```typescript
// class.entity.ts
@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Department, (d) => d.classes)
  department: Department;
}

// class.type.ts
@ObjectType('Class')
export class ClassTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => DepartmentTypeClass, { nullable: true })
  department: DepartmentTypeClass;
}
```

**After — one file:**

```typescript
// class.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@ObjectType('Class')
@Entity('classes')
export class Class {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  name: string;

  @Field(() => Department, { nullable: true })
  @ManyToOne(() => Department, (d) => d.classes)
  department: Department;
}
```

### Rules

- The `@ObjectType()` name must remain the same as the previous `@ObjectType` name to avoid breaking existing GraphQL clients (e.g., `'Class'`, `'CourseTest'`).
- All `@Field()` decorators from the old type file must be preserved with the same GraphQL type and `nullable` settings.
- Delete the `src/database/types/` folder and all files within it once migration is complete.
- Update every import site that previously pointed to a `*.type.ts` class to use the entity class instead.
- The `src/database/types/index.ts` barrel export file should be deleted; all imports go directly to entity files.

---

## Part 2 — Relocate Entities to Their Respective Modules

### Problem

All entities currently sit in `src/database/entities/`. As modules grow, the entity files are disconnected from the code that uses them, making navigation and ownership unclear.

### Target Folder Layout

Entities should move into the sub-module folder that owns them. The organisation below is a guide — adjust based on which service/resolver is responsible for each entity.

```
src/modules/
  organizations/
    org/
      entities/
        organization.entity.ts
        organization-setting.entity.ts
        college.entity.ts
        faculty.entity.ts
        department.entity.ts
        class.entity.ts
        semester.entity.ts
        course.entity.ts
        course-material.entity.ts
        lecturer.entity.ts
        fee.entity.ts
        iec.entity.ts
  students/
    student/
      entities/
        student.entity.ts
  exams/
    test/
      entities/
        test.entity.ts
        test-suite.entity.ts
        test-attempt.entity.ts
        question.entity.ts
        answer-submission.entity.ts
```

### Migration Steps

1. Create the `entities/` sub-folder inside each relevant sub-module directory.
2. Move (not copy) each `.entity.ts` file to its new location.
3. Update all import paths across services, resolvers, modules, and `app.module.ts` / `database.providers.ts`.
4. Remove the now-empty `src/database/entities/` folder and its `index.ts` barrel.
5. Each NestJS module file (`.module.ts`) must include its local entities in the `TypeOrmModule.forFeature([...])` call.

### TypeORM Registration

Each module file must register its own entities:

```typescript
// organizations/organization.module.ts
TypeOrmModule.forFeature([
  Organization,
  OrganizationSetting,
  College,
  Faculty,
  Department,
  Class,
  Semester,
  Course,
  CourseMaterial,
  Lecturer,
  Fee,
  Iec,
])
```

The global `TypeOrmModule.forRoot()` in `DatabaseModule` (or `app.module.ts`) should use `autoLoadEntities: true` so explicit entity listing there is not required.

---

## Part 3 — Cross-Module (Soft) Relationships

### Problem

Once entities live in separate module folders, some TypeORM relations span module boundaries. A bidirectional relation between two entities in different modules causes circular TypeScript imports (Module A imports Module B's entity, which imports Module A's entity back). This must be handled explicitly.

### Cross-Module Relationship Map

The following relations cross module boundaries in this codebase:

| Owning Entity (module) | Relation | Referenced Entity (module) |
|---|---|---|
| `Student` (students) | `@ManyToOne` → `Class` | `Class` (organizations) |
| `Student` (students) | `@ManyToMany` → `Course` | `Course` (organizations) |
| `Class` (organizations) | `@OneToMany` → `Student[]` | `Student` (students) — **inverse side** |
| `Test` (exams) | `@ManyToOne` → `Course` | `Course` (organizations) |
| `Test` (exams) | `@ManyToOne` → `Lecturer` | `Lecturer` (organizations) |
| `TestAttempt` (exams) | `@ManyToOne` → `Student` | `Student` (students) |
| `Course` (organizations) | `@OneToMany` → `Test[]` | `Test` (exams) — **inverse side** |

### Rule: Owning Side vs. Inverse Side

- **Owning side** (the entity with `@ManyToOne` or `@JoinTable`): import the referenced entity directly. This is a one-way import and causes no circular dependency.
- **Inverse side** (the entity with `@OneToMany` or the non-JoinTable side of `@ManyToMany`): do **not** import the foreign entity. Use TypeORM lazy loading instead.

### How to Declare a Lazy Inverse Relation

Replace the eager type with `Promise<T>` and pass the type to the decorator via a string or forward reference. TypeORM resolves it at runtime, breaking the compile-time circular import.

```typescript
// Class entity — organizations module
// BAD: direct import of Student causes circular dependency
import { Student } from '../../students/student/entities/student.entity';

@OneToMany(() => Student, (s) => s.class)
students: Student[];

// GOOD: lazy loading breaks the circular import
@OneToMany('Student', (s: any) => s.class)
students: Promise<Student[]>;
```

The `Promise<Student[]>` type annotation is only for TypeScript inference. Pass the entity name as a string to the decorator so TypeORM looks it up in its metadata registry at runtime rather than requiring a compile-time import.

> **GraphQL note:** Lazy-loaded relations should still have `@Field(() => [Student], { nullable: true })` if you want them exposed. Because `@Field` uses a thunk `() => T`, it does not create a compile-time circular import on its own — but you still need to import the type for the thunk. In that case use NestJS's `forwardRef` on the `@Field` thunk:
>
> ```typescript
> import { forwardRef } from '@nestjs/common';
>
> @Field(() => [Student], { nullable: true })
> @OneToMany('Student', (s: any) => s.class)
> students: Promise<Student[]>;
> ```
>
> If the cross-module GraphQL field is not needed in responses (i.e. the API never returns `Class.students` directly), simply omit the `@Field` decorator on that property to keep things simple.

### Per-Relationship Decisions

Apply the rules above to each cross-module relationship:

**`Class.students` (organizations → students)**
- Inverse side. Declare as `Promise<Student[]>` with string-based decorator. Omit `@Field` unless the GraphQL schema needs to return students nested inside a class response.

**`Course.tests` (organizations → exams)**
- Inverse side. Declare as `Promise<Test[]>` with string-based decorator. `Course` should not import `Test` directly.

**`Student.class` (students → organizations)**
- Owning side (`@ManyToOne`). Import `Class` directly from the organizations module. No circular dependency.

**`Student.registered_courses` (students → organizations)**
- Owning side (`@ManyToMany` with `@JoinTable`). Import `Course` directly from the organizations module. No circular dependency.

**`Test.course` and `Test.lecturer` (exams → organizations)**
- Owning sides (`@ManyToOne`). Import `Course` and `Lecturer` directly from the organizations module. No circular dependency.

**`TestAttempt.student` (exams → students)**
- Owning side (`@ManyToOne`). Import `Student` directly from the students module. No circular dependency.

### Example: Full Lazy Relation Pattern

```typescript
// src/modules/organizations/org/entities/course.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@ObjectType('Course')
@Entity('courses')
export class Course {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  course_code: string;

  // Cross-module inverse relation — Test lives in the exams module.
  // String reference breaks the circular import; Promise<> enables lazy loading.
  @OneToMany('Test', (test: any) => test.course)
  tests: Promise<any[]>;
}
```

```typescript
// src/modules/exams/test/entities/test.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
// Direct import is fine — this is the owning side.
import { Course } from '../../../organizations/org/entities/course.entity';

@ObjectType('Test')
@Entity('tests')
export class Test {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Course, { nullable: true })
  @ManyToOne(() => Course, (course) => course.tests)
  course: Course;
}
```

---

## Files to Delete After Migration

- `src/database/entities/` (entire folder)
- `src/database/types/` (entire folder)

## Files to Update

- Every `*.service.ts` — update entity import paths
- Every `*.resolver.ts` — update GraphQL type import paths (now same as entity)
- Every `*.module.ts` — update `TypeOrmModule.forFeature()` arrays and imports
- `src/database/database.module.ts` or wherever `TypeOrmModule.forRoot()` is configured — enable `autoLoadEntities: true`
- `src/app.module.ts` — remove any direct entity references that are now handled by feature modules
