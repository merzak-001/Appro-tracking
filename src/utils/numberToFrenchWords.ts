export function numberToFrenchWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertGroup(n: number): string {
    let res = "";
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h > 0) {
      if (h === 1) {
        res += "cent";
      } else {
        res += units[h] + " cent";
        if (r === 0) res += "s";
      }
    }

    if (r > 0) {
      if (res !== "") res += " ";
      if (r < 10) {
        res += units[r];
      } else if (r < 20) {
        res += teens[r - 10];
      } else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        if (t === 7) {
          res += "soixante-" + teens[u];
        } else if (t === 9) {
          res += "quatre-vingt-" + teens[u];
        } else {
          res += tens[t];
          if (u === 1 && (t === 2 || t === 3 || t === 4 || t === 5 || t === 6)) {
            res += " et un";
          } else if (u > 0) {
            res += "-" + units[u];
          }
        }
      }
    }
    return res;
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zéro Dinar Algérien";

  let words = "";

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    if (millions === 1) {
      words += "un million ";
    } else {
      words += convertGroup(millions) + " millions ";
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      words += "mille ";
    } else {
      words += convertGroup(thousands) + " mille ";
    }
  }

  if (remainder > 0) {
    words += convertGroup(remainder) + " ";
  }

  words = words.trim();
  if (words === "") words = "zéro";

  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);
  words += " Dinars Algériens";

  if (decimalPart > 0) {
    words += ` et ${convertGroup(decimalPart)} centimes`;
  }

  return words;
}
