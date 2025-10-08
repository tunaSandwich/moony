import type { Country } from '@/components/forms/PhoneInput/countryData';

/**
 * Strip all non-digits from a phone number string
 */
export function sanitizePhoneNumber(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Format a phone number based on country pattern
 * @param digits - Only numeric digits (e.g., "2345678910")
 * @param format - Pattern like "(###) ###-####" 
 * @returns Formatted phone number
 */
export function formatPhoneNumber(digits: string, format: string): string {
  if (!format || !digits) return digits;

  let formattedNumber = '';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
    const char = format[i];
    if (char === '#') {
      formattedNumber += digits[digitIndex];
      digitIndex++;
    } else {
      formattedNumber += char;
    }
  }

  return formattedNumber;
}

/**
 * Validate phone number length for a specific country
 */
export function validatePhoneForCountry(digits: string, country: Country): boolean {
  const cleanDigits = sanitizePhoneNumber(digits);
  return cleanDigits.length === country.maxLength;
}

/**
 * Parse E.164 format to extract country code and number
 * @param e164 - Phone number in E.164 format (e.g., "+12345678910")
 * @returns Object with dialCode and number
 */
export function parseE164(e164: string): { dialCode: string; number: string } {
  if (!e164.startsWith('+')) {
    return { dialCode: '+1', number: sanitizePhoneNumber(e164) };
  }

  // Extract potential dial codes (1-4 digits after +)
  const match = e164.match(/^\+(\d{1,4})(.*)$/);
  if (!match) {
    return { dialCode: '+1', number: sanitizePhoneNumber(e164) };
  }

  const [, potentialDialCode, remainder] = match;
  const remainderDigits = sanitizePhoneNumber(remainder);

  // Check common dial codes in order of specificity
  const dialCodesToCheck = [
    potentialDialCode.slice(0, 4),
    potentialDialCode.slice(0, 3),
    potentialDialCode.slice(0, 2),
    potentialDialCode.slice(0, 1)
  ].filter(code => code.length > 0);

  // Common dial codes for validation
  const validDialCodes = ['+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91', '+92', '+93', '+94', '+95', '+98', '+212', '+213', '+216', '+218', '+220', '+221', '+222', '+223', '+224', '+225', '+226', '+227', '+228', '+229', '+230', '+231', '+232', '+233', '+234', '+235', '+236', '+237', '+238', '+239', '+240', '+241', '+242', '+243', '+244', '+245', '+246', '+248', '+249', '+250', '+251', '+252', '+253', '+254', '+255', '+256', '+257', '+258', '+260', '+261', '+262', '+263', '+264', '+265', '+266', '+267', '+268', '+269', '+290', '+291', '+297', '+298', '+299', '+350', '+351', '+352', '+353', '+354', '+355', '+356', '+357', '+358', '+359', '+370', '+371', '+372', '+373', '+374', '+375', '+376', '+377', '+378', '+380', '+381', '+382', '+383', '+385', '+386', '+387', '+389', '+420', '+421', '+423', '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+508', '+509', '+590', '+591', '+592', '+593', '+594', '+595', '+596', '+597', '+598', '+599', '+670', '+672', '+673', '+674', '+675', '+676', '+677', '+678', '+679', '+680', '+681', '+682', '+683', '+684', '+685', '+686', '+687', '+688', '+689', '+690', '+691', '+692', '+850', '+852', '+853', '+855', '+856', '+880', '+886', '+960', '+961', '+962', '+963', '+964', '+965', '+966', '+967', '+968', '+970', '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992', '+993', '+994', '+995', '+996', '+998'];

  for (const codeLength of dialCodesToCheck) {
    const dialCode = `+${codeLength}`;
    if (validDialCodes.includes(dialCode)) {
      const remainingNumber = potentialDialCode.slice(codeLength.length) + remainderDigits;
      return { dialCode, number: remainingNumber };
    }
  }

  // Fallback to +1 if no valid dial code found
  return { dialCode: '+1', number: sanitizePhoneNumber(e164) };
}

/**
 * Combine dial code and number into E.164 format
 */
export function toE164(dialCode: string, number: string): string {
  const cleanNumber = sanitizePhoneNumber(number);
  return `${dialCode}${cleanNumber}`;
}

/**
 * Format input as user types for better UX
 * @param input - Current input value
 * @param country - Selected country for formatting rules
 * @returns Formatted display value
 */
export function formatAsUserTypes(input: string, country: Country): string {
  const digits = sanitizePhoneNumber(input);
  
  if (!country.format || digits.length === 0) {
    return digits;
  }

  // Don't format if input is longer than expected
  if (digits.length > country.maxLength) {
    return digits;
  }

  return formatPhoneNumber(digits, country.format);
}