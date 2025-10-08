import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/utils/helpers';
import { countries, defaultCountry, type Country } from './countryData';
import { 
  parseE164, 
  toE164, 
  sanitizePhoneNumber, 
  formatAsUserTypes, 
  validatePhoneForCountry 
} from '@/utils/phoneFormatters';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export interface PhoneInputProps {
  value: string; // Full E.164 format: +12345678910
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, error, disabled = false, placeholder = "Enter your phone number", className = '', ...props }, ref) => {
    // Parse initial value
    const { dialCode: initialDialCode, number: initialNumber } = parseE164(value || '');
    const initialCountry = countries.find(c => c.dialCode === initialDialCode) || defaultCountry;

    // Component state
    const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);
    const [phoneNumber, setPhoneNumber] = useState<string>(initialNumber);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const countryButtonRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => {
      setIsDropdownOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    });

    // Filter countries based on search
    const filteredCountries = countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Update internal state when external value changes
    useEffect(() => {
      if (value) {
        const { dialCode, number } = parseE164(value);
        const country = countries.find(c => c.dialCode === dialCode) || defaultCountry;
        setSelectedCountry(country);
        setPhoneNumber(number);
      }
    }, [value]);

    // Format phone number for display
    const formattedNumber = formatAsUserTypes(phoneNumber, selectedCountry);

    // Handle phone number input change
    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const digits = sanitizePhoneNumber(inputValue);
      
      // Limit input to max length for selected country
      if (digits.length <= selectedCountry.maxLength) {
        setPhoneNumber(digits);
        // Combine with country code and call onChange
        const e164Value = toE164(selectedCountry.dialCode, digits);
        onChange(e164Value);
      }
    };

    // Handle country selection
    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setIsDropdownOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
      
      // Update with new country code
      const e164Value = toE164(country.dialCode, phoneNumber);
      onChange(e164Value);
      
      // Focus the phone input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    // Handle dropdown toggle
    const handleDropdownToggle = () => {
      if (disabled) return;
      setIsDropdownOpen(!isDropdownOpen);
      setSearchTerm('');
      setFocusedIndex(-1);
    };

    // Handle search input
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setFocusedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isDropdownOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < filteredCountries.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCountries.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredCountries.length) {
            handleCountrySelect(filteredCountries[focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsDropdownOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          countryButtonRef.current?.focus();
          break;
      }
    };

    // Scroll focused item into view
    useEffect(() => {
      if (isDropdownOpen && focusedIndex >= 0 && dropdownRef.current) {
        const focusedElement = dropdownRef.current.children[focusedIndex + 1] as HTMLElement; // +1 for search input
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [focusedIndex, isDropdownOpen]);

    // Get validation status
    const isValid = phoneNumber.length === 0 || validatePhoneForCountry(phoneNumber, selectedCountry);
    const hasError = error || (!isValid && phoneNumber.length > 0);

    return (
      <div ref={containerRef} className={cn("relative", className)} {...props}>
        {/* Main Input Container */}
        <div 
          className={cn(
            "flex rounded-lg border transition-all duration-200",
            hasError 
              ? "border-pink-400 shadow-[0_0_0_3px_rgba(244,114,182,0.1)]" 
              : "border-gray-300 focus-within:border-blue-500 focus-within:shadow-[0_0_0_3px_rgba(6,152,254,0.1)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Country Code Dropdown */}
          <button
            ref={countryButtonRef}
            type="button"
            onClick={handleDropdownToggle}
            disabled={disabled}
            className={cn(
              "flex items-center justify-between min-w-[100px] px-3 py-3 bg-white/70 backdrop-blur-sm",
              "border-r border-gray-300 rounded-l-lg",
              "hover:bg-white/80 focus:outline-none focus:bg-white/80",
              "transition-all duration-200",
              disabled && "cursor-not-allowed"
            )}
            aria-label="Country code selector"
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg" role="img" aria-label={`${selectedCountry.name} flag`}>
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {selectedCountry.dialCode}
              </span>
            </div>
            <svg 
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200",
                isDropdownOpen && "transform rotate-180"
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Phone Number Input */}
          <input
            ref={ref || inputRef}
            type="tel"
            value={formattedNumber}
            onChange={handlePhoneNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 px-4 py-3 bg-white/70 backdrop-blur-sm rounded-r-lg",
              "border-none outline-none text-gray-900 placeholder-gray-500",
              "focus:bg-white/80 transition-all duration-200",
              disabled && "cursor-not-allowed"
            )}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={error ? 'phone-error' : undefined}
          />
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden"
            role="listbox"
            aria-label="Country selection"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder="Search countries..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Countries List */}
            <div ref={dropdownRef} className="overflow-y-auto max-h-48">
              {filteredCountries.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country, index) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 text-left",
                      "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors",
                      focusedIndex === index && "bg-blue-50",
                      selectedCountry.code === country.code && "bg-blue-100"
                    )}
                    role="option"
                    aria-selected={selectedCountry.code === country.code}
                    onKeyDown={handleKeyDown}
                  >
                    <span className="text-lg" role="img" aria-label={`${country.name} flag`}>
                      {country.flag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {country.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {country.dialCode}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p id="phone-error" className="mt-2 text-sm text-pink-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';