/**
 * Formats numbers into standard string format with space as thousand separator: 1 234.00
 */
export const formatAmount = (num: number | string | null | undefined, decimals = 2): string => {
  if (num === null || num === undefined || num === '') return '0.00';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '0.00';

  const parts = val.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

export const formatNumber = formatAmount;

export const formatQty = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '0';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '0';

  const strVal = val.toString();
  const parts = strVal.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

// French number to words converter
const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  let result = '';

  const hundred = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundred > 0) {
    if (hundred === 1) {
      result += 'cent';
    } else {
      result += ones[hundred] + ' cent' + (remainder === 0 ? 's' : '');
    }
  }

  if (remainder > 0) {
    if (result !== '') result += ' ';

    if (remainder < 10) {
      result += ones[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else if (remainder < 70) {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      if (unit === 1) {
        result += tens[ten] + ' et un';
      } else if (unit > 0) {
        result += tens[ten] + '-' + ones[unit];
      } else {
        result += tens[ten];
      }
    } else if (remainder < 80) {
      const unit = remainder - 60;
      if (unit === 11) {
        result += 'soixante et onze';
      } else {
        result += 'soixante-' + teens[unit - 10];
      }
    } else if (remainder < 90) {
      const unit = remainder - 80;
      if (unit === 0) {
        result += 'quatre-vingts';
      } else {
        result += 'quatre-vingt-' + ones[unit];
      }
    } else {
      const unit = remainder - 80;
      result += 'quatre-vingt-' + teens[unit - 10];
    }
  }

  return result;
}

export const numberToFrenchWords = (
  amount: number | string | null | undefined,
  currency: string = 'DA'
): string => {
  const curr = (currency || 'DA').toUpperCase();
  const isDefaultDA = curr === 'DA' || curr === 'DZD';
  let mainUnit = 'Dinars Algériens';
  let decUnit = 'Centimes';

  if (curr === 'EUR' || curr === 'EURO' || curr === 'EUROS') {
    mainUnit = 'Euros';
    decUnit = 'Cents';
  } else if (curr === 'USD' || curr === 'DOLLAR' || curr === 'DOLLARS') {
    mainUnit = 'Dollars US';
    decUnit = 'Cents';
  } else if (curr === 'GBP') {
    mainUnit = 'Livres Sterling';
    decUnit = 'Pence';
  }

  if (amount === null || amount === undefined || amount === '') return `Zéro ${mainUnit}`;
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val) || val === 0) return `Zéro ${mainUnit}`;

  const intPart = Math.floor(Math.abs(val));
  const decPart = Math.round((Math.abs(val) - intPart) * 100);

  if (intPart === 0) {
    const zeroPrefix = isDefaultDA ? 'Zéro Dinars' : `Zéro ${mainUnit}`;
    return decPart > 0 ? `${zeroPrefix} et ${convertGroup(decPart)} ${decUnit}` : `Zéro ${mainUnit}`;
  }

  let words = '';

  const billions = Math.floor(intPart / 1000000000);
  const millions = Math.floor((intPart % 1000000000) / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const units = intPart % 1000;

  if (billions > 0) {
    words += (billions === 1 ? 'un milliard' : `${convertGroup(billions)} milliards`) + ' ';
  }
  if (millions > 0) {
    words += (millions === 1 ? 'un million' : `${convertGroup(millions)} millions`) + ' ';
  }
  if (thousands > 0) {
    if (thousands === 1) {
      words += 'mille ';
    } else {
      words += `${convertGroup(thousands)} mille `;
    }
  }
  if (units > 0) {
    words += convertGroup(units);
  }

  words = words.trim();

  // Capitalize first letter of each major word for clean professional official reading
  let formatted = words.charAt(0).toUpperCase() + words.slice(1);
  formatted += ` ${mainUnit}`;

  if (decPart > 0) {
    formatted += ` et ${convertGroup(decPart)} ${decUnit}`;
  }

  return formatted;
};

