# Bloomverd Student Management System

## Introduction
Welcome to the Bloomverd Student Management System (BSSMS), a comprehensive platform designed to streamline and enhance the management of student data within educational institutions. This system is built with the goal of providing efficient tools for administrators, teachers, and students alike, ensuring seamless communication and data management.

## Folder Structure
src -> database -> entities (contains database entities)
                -> types (contains graphql types for the entities)
                -> database.module.ts (the database folder is seen as a module)
                -> database.providers.ts (postgres, redis, mongo, etc. Contains how to connect those stuffs)
              
src -> modules (Contains all the modules for the application)
               -> organizations (divided into sub-modules for better organization)
                                -> auth (Authentication module)
                                -> etc
                                -> organization.module.ts (organization module, would include imports, example: resolvers [graphql-resolvers], providers, etc.)
                              
               -> students (Similar structure to organization folder)

src -> shared (Contains shared components and utilities)
              -> enums (contains enums used throughout the application)
              -> helpers (contains helper functions used throughout the application)
              -> guards (contains guards used throughout the application)
              -> inputs (contains input types used throughout the application)
              -> strategies (contains authentication strategies used throughout the application)
              -> types (contains types used throughout the application)
            
src -> app.module.ts (All modules are imported here, database, organization, student, graphql, config)

src -> config.schema.ts (Where we validate all env variables, example, DATABASE_URL: Joi.string().required())

src -> main.ts (The entry point of the application)


## Documentation
Add documentations here

ai -> documentation

## Feature Implementation
When implementing feature, this is how you should do it.

src -> modules -> organizations -> auth (contains resolvers, services, services_tests, consumers, producers)
                                -> org (similar to auth)

If I ask you to add a service with its corresponding resolver, this is what you are going to do:
- [x] Add the implementation in the service
- [x] Add a test for it in that services test
- [x] Add the corresponding graphql resolver
