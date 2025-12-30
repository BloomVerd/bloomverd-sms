# Request Password Reset Feature

* Add a reset token field to the student entity.
src -> database -> entities -> student.entity.ts

* Inside the student service, requestPasswordReset method should do the following:
  - Generate a unique token
  - Save the token in the student entity
  - Send an email with the token to the student's email address (authProducer has a sendPasswordResetEmail method)
  
* Write a test for it
See example from this src -> modules -> students -> auth -> auth.service.spec.ts (This is where you are also going to be putting the test)
