import { parseE164, validatePhoneForCountry } from './phoneFormatters';
import { countries } from '@/components/forms/PhoneInput/countryData';

/**
 * Validate phone number in E.164 format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || phoneNumber.length < 8) {
    return false;
  }

  try {
    const { dialCode, number } = parseE164(phoneNumber);
    const country = countries.find(c => c.dialCode === dialCode);
    
    if (!country) {
      return false;
    }

    return validatePhoneForCountry(number, country);
  } catch {
    return false;
  }
}

/**
 * Validate phone number and return error message if invalid
 */
export function validatePhoneNumberWithMessage(phoneNumber: string): string | null {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return 'Phone number is required';
  }

  if (!phoneNumber.startsWith('+')) {
    return 'Phone number must include country code';
  }

  if (phoneNumber.length < 8) {
    return 'Phone number is too short';
  }

  const { dialCode, number } = parseE164(phoneNumber);
  const country = countries.find(c => c.dialCode === dialCode);
  
  if (!country) {
    return 'Invalid country code';
  }

  if (!validatePhoneForCountry(number, country)) {
    return `Invalid phone number for ${country.name}`;
  }

  return null;
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Required field validation
 */
export function validateRequired(value: string): boolean {
  return Boolean(value && value.trim().length > 0);
}