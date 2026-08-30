import { ServiceFieldDefinition } from '../types';

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

const normalize = (value: string) => (value ?? '').trim();

export const buildSelectPrompt = (field: ServiceFieldDefinition) => {
  const options = field.options ?? [];
  const numberedOptions = options.map((option, index) => `${index + 1}. ${option}`).join(', ');
  return `For ${field.label}, say the option number. Options are: ${numberedOptions}.`;
};

export const resolveSelectChoice = (field: ServiceFieldDefinition, rawValue: string): string | null => {
  const value = normalize(rawValue).toLowerCase();
  const options = field.options ?? [];
  if (!options.length) return null;

  const directMatch = options.find((option) => option.toLowerCase() === value);
  if (directMatch) return directMatch;

  const compactValue = value.replace(/[^a-z0-9\s]/g, ' ');
  const numberWords: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  };

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const optionLower = option.toLowerCase();
    const optionCompact = optionLower.replace(/[^a-z0-9\s]/g, ' ');
    const optionNumbers = option.match(/\d+/g) || [];

    if (compactValue === optionCompact || compactValue.includes(optionCompact) || optionCompact.includes(compactValue)) {
      return option;
    }

    if (optionNumbers.length > 0 && optionNumbers.some((num) => compactValue.includes(num))) {
      return option;
    }

    const valueTokens = compactValue.split(/\s+/).filter(Boolean);
    const optionTokens = optionCompact.split(/\s+/).filter(Boolean);
    if (valueTokens.length > 0 && optionTokens.length > 0 && valueTokens.some((token) => optionTokens.includes(token))) {
      return option;
    }
  }

  const spokenNumbers = compactValue.match(/(?:option\s*)?(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)/gi) || [];
  for (const token of spokenNumbers) {
    const normalizedToken = token.toLowerCase().replace(/^option\s+/, '');
    const numericValue = Number.isInteger(Number(normalizedToken)) ? Number(normalizedToken) : (numberWords[normalizedToken] ?? NaN);
    if (!Number.isFinite(numericValue)) continue;
    const index = numericValue - 1;
    if (index >= 0 && index < options.length) {
      return options[index];
    }
  }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const optionDigits = option.match(/\d+/g) || [];
    const numericMatches = compactValue.match(/\d+/g) || [];
    if (numericMatches.length > 0 && optionDigits.length > 0 && numericMatches.some((num) => optionDigits.includes(num))) {
      return option;
    }
  }

  const byText = options.find((option) => option.toLowerCase().includes(value));
  if (byText) return byText;

  return null;
};

export const normalizeDateValue = (rawValue: string): string => {
  const value = normalize(rawValue);
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };

  const toFourDigitYear = (year: number) => (year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year);

  const parseIso = (day: number, month: number, year: number) => {
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${toFourDigitYear(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  };

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const iso = parseIso(Number(dmyMatch[1]), Number(dmyMatch[2]), Number(dmyMatch[3]));
    if (iso) return iso;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = value.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const iso = parseIso(Number(ymdMatch[3]), Number(ymdMatch[2]), Number(ymdMatch[1]));
    if (iso) return iso;
  }

  // 20 August 2006 / 20th August 2006
  const monthNameMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{2,4})/i);
  if (monthNameMatch) {
    const iso = parseIso(Number(monthNameMatch[1]), monthMap[monthNameMatch[2].toLowerCase()], Number(monthNameMatch[3]));
    if (iso) return iso;
  }

  // August 20, 2006 / August 20 2006
  const monthFirstMatch = value.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})/i);
  if (monthFirstMatch) {
    const iso = parseIso(Number(monthFirstMatch[2]), monthMap[monthFirstMatch[1].toLowerCase()], Number(monthFirstMatch[3]));
    if (iso) return iso;
  }

  return value;
};

export const validateFieldValue = (field: ServiceFieldDefinition, rawValue: string): ValidationResult => {
  const value = normalize(rawValue);

  if (field.required && !value) {
    return { valid: false, message: `${field.label} is required.` };
  }

  if (!value) return { valid: true };

  if (field.type === 'select' && field.options?.length) {
    const resolved = resolveSelectChoice(field, value);
    if (!resolved) {
      return { valid: false, message: `Please choose one of the listed options for ${field.label}.` };
    }
    return { valid: true };
  }

  if (field.id.toLowerCase().includes('aadhaar') || field.label.toLowerCase().includes('aadhaar')) {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 12) {
      return { valid: false, message: 'Aadhaar number must be exactly 12 digits.' };
    }
  }

  if (field.id.toLowerCase().includes('mobile') || field.label.toLowerCase().includes('mobile')) {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 10) {
      return { valid: false, message: 'Mobile number must be exactly 10 digits.' };
    }
  }

  if (field.id.toLowerCase().includes('address') || field.label.toLowerCase().includes('address')) {
    const hasStreet = /(street|road|lane|colony|cross|main|nagar|avenue|boulevard|near|house|building|plot)/i.test(value);
    if (!hasStreet) {
      return { valid: false, message: 'Address should include a street or locality name.' };
    }
  }

  if (field.type === 'date') {
    const normalized = normalizeDateValue(value);
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    if (!iso) {
      return { valid: false, message: 'Please enter a valid date (e.g., YYYY-MM-DD or DD-MM-YYYY).' };
    }
  }

  if (field.constraints?.length) {
    for (const rule of field.constraints) {
      switch (rule.type) {
        case 'minLength':
          if (value.length < Number(rule.value)) {
            return { valid: false, message: rule.message };
          }
          break;
        case 'maxLength':
          if (value.length > Number(rule.value)) {
            return { valid: false, message: rule.message };
          }
          break;
        case 'pattern':
          if (typeof rule.value === 'string' && !new RegExp(rule.value).test(value)) {
            return { valid: false, message: rule.message };
          }
          break;
        case 'contains':
          if (typeof rule.value === 'string' && !value.toLowerCase().includes(String(rule.value).toLowerCase())) {
            return { valid: false, message: rule.message };
          }
          break;
        case 'enum':
          if (Array.isArray(rule.value) && !rule.value.includes(value)) {
            return { valid: false, message: rule.message };
          }
          break;
        default:
          break;
      }
    }
  }

  return { valid: true };
};
