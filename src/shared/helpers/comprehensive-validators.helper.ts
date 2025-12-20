import { isEmail } from 'class-validator';

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return isEmail(email.trim());
}

export function getEmailValidationError(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  if (typeof email !== 'string') {
    return 'Email must be a string';
  }
  if (!isEmail(email.trim())) {
    return 'Email format is invalid';
  }
  return null;
}

/**
 * String validation (required and length)
 */
export function validateRequiredString(
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 255,
): string | null {
  if (!value) {
    return `${fieldName} is required`;
  }

  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return `${fieldName} cannot be empty`;
  }

  if (trimmed.length < minLength) {
    return `${fieldName} must be at least ${minLength} character(s)`;
  }

  if (trimmed.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }

  return null;
}

/**
 * Phone number validation (E.164 format)
 * Format: +[country code][number]
 * Example: +1234567890 or +44-1234-567890
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.trim().replace(/[-\s]/g, ''));
}

export function getPhoneValidationError(phoneNumber: string): string | null {
  if (!phoneNumber) {
    return 'Phone number is required';
  }

  if (typeof phoneNumber !== 'string') {
    return 'Phone number must be a string';
  }

  if (!validatePhoneNumber(phoneNumber)) {
    return 'Phone number format is invalid (use E.164 format: +1234567890)';
  }

  return null;
}

/**
 * Date validation
 * Should be a valid date string (ISO format: YYYY-MM-DD or full ISO)
 */
export function validateDate(date: string | any): boolean {
  if (!date) {
    return false;
  }

  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

export function getDateValidationError(
  date: string | any,
  fieldName: string = 'Date',
): string | null {
  if (!date) {
    return `${fieldName} is required`;
  }

  if (!validateDate(date)) {
    return `${fieldName} must be a valid date (ISO format: YYYY-MM-DD)`;
  }

  const dateObj = new Date(date);
  const now = new Date();

  // Check if date is in the future (useful for dateOfBirth)
  if (dateObj > now) {
    return `${fieldName} cannot be in the future`;
  }

  return null;
}

/**
 * Enum validation
 */
export function validateEnum(
  value: any,
  allowedValues: string[],
  fieldName: string,
): string | null {
  if (!value) {
    return `${fieldName} is required`;
  }

  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }

  return null;
}

/**
 * Number validation (for credits, etc.)
 */
export function validateNumber(
  value: any,
  min: number = 0,
  max: number = 999,
  fieldName: string = 'Number',
): string | null {
  if (value === null || value === undefined) {
    return `${fieldName} is required`;
  }

  const num = Number(value);

  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }

  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (num > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Check if two values are the same (for duplicate detection)
 */
export function areDuplicateValues(value1: any, value2: any): boolean {
  if (typeof value1 === 'string' && typeof value2 === 'string') {
    return value1.trim().toLowerCase() === value2.trim().toLowerCase();
  }
  return value1 === value2;
}

/**
 * Validate that all required fields are present
 */
export function validateRequiredFields(
  obj: any,
  requiredFields: string[],
): string[] {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = obj[field];
    if (value === null || value === undefined || value === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}

/**
 * Normalize email for comparison
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize name for comparison
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
