import chaseLogo from '@/assets/images/banks/chase.svg';
import boaLogo from '@/assets/images/banks/bank-of-america.svg';
import wellsFargoLogo from '@/assets/images/banks/wells-fargo.svg';
import capitalOneLogo from '@/assets/images/banks/capital-one.svg';
import citiLogo from '@/assets/images/banks/citi.svg';
import amexLogo from '@/assets/images/banks/american-express.svg';
import usBankLogo from '@/assets/images/banks/us-bank.svg';
import schwabLogo from '@/assets/images/banks/schwab.svg';

import type { BankLogo } from '@/components';

/**
 * Bank logos for display on marketing pages
 * Shows major banks supported via Plaid integration
 */
export const BANK_LOGOS: BankLogo[] = [
  { src: chaseLogo, alt: 'Chase Bank' },
  { src: boaLogo, alt: 'Bank of America' },
  { src: wellsFargoLogo, alt: 'Wells Fargo' },
  { src: capitalOneLogo, alt: 'Capital One' },
  { src: citiLogo, alt: 'Citibank' },
  { src: amexLogo, alt: 'American Express' },
  { src: usBankLogo, alt: 'US Bank' },
  { src: schwabLogo, alt: 'Charles Schwab' },
];