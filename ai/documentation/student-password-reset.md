# Student Password Reset Feature

## Overview
The student password reset feature allows students to securely reset their passwords through a token-based system. The implementation includes email verification, secure token generation, and time-limited password reset tokens.

## Architecture

### Database Schema

#### Student Entity
Located at: `src/database/entities/student.entity.ts`

New fields added:
```typescript
@Column({ nullable: true })
reset_token: string;

@Column({ nullable: true })
reset_token_expires_at: Date;
```

- `reset_token`: Stores the hashed reset token (nullable)
- `reset_token_expires_at`: Stores the token expiration timestamp (nullable)

### Service Layer

#### StudentService
Located at: `src/modules/students/student/student.service.ts`

##### Dependencies
- `@InjectRepository(Student)` - Student repository for database operations
- `AuthProducer` - Handles email queue operations
- `HashHelper` - Provides password and token hashing utilities
- `crypto` - Node.js crypto module for secure token generation

##### Methods

**`requestPasswordReset(email: string): Promise<{ message: string }>`**

Flow:
1. Validates that a student with the provided email exists
2. Generates a secure 32-byte random token using `crypto.randomBytes()`
3. Hashes the token before storing in the database
4. Sets token expiration to 1 hour from current time
5. Saves the token and expiration to the student record
6. Queues a password reset email via `authProducer.sendPasswordResetEmail()`
7. Returns success message

Error handling:
- Throws `NotFoundException` if email doesn't exist

**`resetPassword(token: string, newPassword: string): Promise<{ message: string }>`**

Flow:
1. Queries for students with non-null reset tokens that haven't expired
2. Iterates through candidates and compares the provided token against hashed tokens
3. If a match is found:
   - Hashes the new password
   - Updates the student's password
   - Invalidates the reset token (sets to null)
   - Clears the token expiration timestamp
   - Saves the changes
4. Returns success message

Error handling:
- Throws `BadRequestException` if token is invalid or expired

### GraphQL Layer

#### Input Types
Located at: `src/shared/inputs/`

**RequestPasswordResetInput**
```typescript
@InputType()
export class RequestPasswordResetInput {
  @Field()
  email: string;
}
```

**ResetPasswordInput**
```typescript
@InputType()
export class ResetPasswordInput {
  @Field()
  token: string;

  @Field()
  new_password: string;
}
```

#### Response Type
Located at: `src/shared/types/password-reset-response.type.ts`

```typescript
@ObjectType()
export class PasswordResetResponseType {
  @Field()
  message: string;
}
```

#### Resolvers
Located at: `src/modules/students/student/student.resolver.ts`

**Mutations:**

1. `requestPasswordReset(input: RequestPasswordResetInput): PasswordResetResponseType`
   - Initiates the password reset process
   - Sends reset email to student

2. `resetPassword(input: ResetPasswordInput): PasswordResetResponseType`
   - Completes the password reset with a valid token
   - Updates student password

### Email Integration

The feature integrates with the existing BullMQ queue system:
- Queue: `student-queue`
- Producer: `AuthProducer` (src/modules/students/auth/auth.producer.ts)
- Job: `send-password-reset-email`

The email should contain the reset token for the student to use.

## Security Considerations

1. **Token Hashing**: Reset tokens are hashed before storage using `HashHelper.hash()`, ensuring that even if the database is compromised, tokens cannot be directly used.

2. **Token Expiration**: Tokens expire after 1 hour, limiting the window for potential attacks.

3. **Secure Token Generation**: Uses `crypto.randomBytes(32)` for cryptographically secure random token generation.

4. **Token Invalidation**: After successful password reset, the token is immediately invalidated.

5. **Password Hashing**: New passwords are hashed before storage using `HashHelper.hash()`.

## Testing

### Test Suite
Located at: `src/modules/students/student/student.service.spec.ts`

#### Test Cases

**Request Password Reset:**
- ✅ Generate reset token and send email for existing student
- ✅ Throw NotFoundException for non-existent student

**Reset Password:**
- ✅ Reset password with valid token
- ✅ Throw BadRequestException for invalid token
- ✅ Throw BadRequestException for expired token

### Running Tests
```bash
npm run test -- student.service.spec.ts
```

## Usage Examples

### GraphQL Mutation: Request Password Reset

```graphql
mutation {
  requestPasswordReset(input: {
    email: "student@example.com"
  }) {
    message
  }
}
```

Response:
```json
{
  "data": {
    "requestPasswordReset": {
      "message": "Password reset email sent successfully"
    }
  }
}
```

### GraphQL Mutation: Reset Password

```graphql
mutation {
  resetPassword(input: {
    token: "abc123def456..."
    new_password: "NewSecurePassword123!"
  }) {
    message
  }
}
```

Response:
```json
{
  "data": {
    "resetPassword": {
      "message": "Password reset successfully"
    }
  }
}
```

## Database Migration

When deploying this feature, ensure the database schema is updated with the new fields:

```sql
ALTER TABLE students 
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expires_at TIMESTAMP NULL;
```

Note: TypeORM synchronization will handle this automatically if `synchronize: true` is enabled.

## Error Responses

### Request Password Reset Errors

**Student Not Found:**
```json
{
  "errors": [
    {
      "message": "Student with this email does not exist",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

### Reset Password Errors

**Invalid or Expired Token:**
```json
{
  "errors": [
    {
      "message": "Invalid or expired reset token",
      "extensions": {
        "code": "BAD_REQUEST"
      }
    }
  ]
}
```

## Future Enhancements

Potential improvements for consideration:

1. **Rate Limiting**: Implement rate limiting on password reset requests to prevent abuse
2. **Token Usage Tracking**: Track how many times a token has been attempted
3. **Email Template**: Create a branded email template with reset instructions
4. **Multi-factor Verification**: Add additional verification steps for sensitive accounts
5. **Password History**: Prevent reuse of recent passwords
6. **Audit Logging**: Log all password reset attempts for security monitoring

## Related Files

- Entity: `src/database/entities/student.entity.ts`
- Service: `src/modules/students/student/student.service.ts`
- Service Tests: `src/modules/students/student/student.service.spec.ts`
- Resolver: `src/modules/students/student/student.resolver.ts`
- Input Types: `src/shared/inputs/request-password-reset.input.ts`, `src/shared/inputs/reset-password.input.ts`
- Response Type: `src/shared/types/password-reset-response.type.ts`
- Producer: `src/modules/students/auth/auth.producer.ts`
- Module: `src/modules/students/student.module.ts`
