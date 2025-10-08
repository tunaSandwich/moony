export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string; // E.g., "+1"
  flag: string; // Emoji or Unicode flag
  format?: string; // E.g., "(###) ###-####" for US
  maxLength: number; // Digits only
}

export const countries: Country[] = [
  { 
    name: "United States", 
    code: "US", 
    dialCode: "+1", 
    flag: "🇺🇸", 
    format: "(###) ###-####", 
    maxLength: 10 
  },
  { 
    name: "Canada", 
    code: "CA", 
    dialCode: "+1", 
    flag: "🇨🇦", 
    format: "(###) ###-####", 
    maxLength: 10 
  },
  { 
    name: "Mexico", 
    code: "MX", 
    dialCode: "+52", 
    flag: "🇲🇽", 
    format: "### ### ####", 
    maxLength: 10 
  },
  { 
    name: "United Kingdom", 
    code: "GB", 
    dialCode: "+44", 
    flag: "🇬🇧", 
    format: "#### ### ####", 
    maxLength: 10 
  },
  { 
    name: "Germany", 
    code: "DE", 
    dialCode: "+49", 
    flag: "🇩🇪", 
    format: "### ### ####", 
    maxLength: 11 
  },
  { 
    name: "France", 
    code: "FR", 
    dialCode: "+33", 
    flag: "🇫🇷", 
    format: "# ## ## ## ##", 
    maxLength: 9 
  },
  { 
    name: "Australia", 
    code: "AU", 
    dialCode: "+61", 
    flag: "🇦🇺", 
    format: "#### ### ###", 
    maxLength: 9 
  },
  { 
    name: "Japan", 
    code: "JP", 
    dialCode: "+81", 
    flag: "🇯🇵", 
    format: "###-####-####", 
    maxLength: 11 
  },
  { 
    name: "Brazil", 
    code: "BR", 
    dialCode: "+55", 
    flag: "🇧🇷", 
    format: "(##) #####-####", 
    maxLength: 11 
  },
  { 
    name: "India", 
    code: "IN", 
    dialCode: "+91", 
    flag: "🇮🇳", 
    format: "##### #####", 
    maxLength: 10 
  },
  { 
    name: "China", 
    code: "CN", 
    dialCode: "+86", 
    flag: "🇨🇳", 
    format: "### #### ####", 
    maxLength: 11 
  },
  { 
    name: "Spain", 
    code: "ES", 
    dialCode: "+34", 
    flag: "🇪🇸", 
    format: "### ### ###", 
    maxLength: 9 
  },
  { 
    name: "Italy", 
    code: "IT", 
    dialCode: "+39", 
    flag: "🇮🇹", 
    format: "### ### ####", 
    maxLength: 10 
  },
  { 
    name: "Netherlands", 
    code: "NL", 
    dialCode: "+31", 
    flag: "🇳🇱", 
    format: "## #### ####", 
    maxLength: 9 
  },
  { 
    name: "Switzerland", 
    code: "CH", 
    dialCode: "+41", 
    flag: "🇨🇭", 
    format: "## ### ## ##", 
    maxLength: 9 
  }
];

// Default country for initial state
export const defaultCountry = countries[0]; // United States