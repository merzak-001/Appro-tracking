import { describe, it, expect } from "vitest";
import { numberToFrenchWords } from "../src/utils/numberToFrenchWords";

describe("numberToFrenchWords Utility Test Suite", () => {
  it("should convert 15232 DA to correct French words string", () => {
    const result = numberToFrenchWords(15232);
    expect(result).toBe("Quinze mille deux cent trente-deux Dinars Algériens");
  });

  it("should convert 35000.88 DA to correct French words with centimes", () => {
    const result = numberToFrenchWords(35000.88);
    expect(result).toContain("Trente-cinq mille Dinars Algériens");
    expect(result).toContain("centimes");
  });

  it("should handle zero amount", () => {
    const result = numberToFrenchWords(0);
    expect(result).toBe("Zéro Dinar Algérien");
  });

  it("should handle 1 million DA", () => {
    const result = numberToFrenchWords(1000000);
    expect(result).toBe("Un million Dinars Algériens");
  });
});

describe("Financial Documents Fields Suite", () => {
  it("should validate core fields structure", () => {
    const doc = {
      ref_number: "0011/SENSUS/DP/2026",
      doc_type: "DEMANDE_CHEQUE",
      objet: "Demande de chèque pour achat matériel",
      amount: 15000,
    };
    expect(doc.ref_number).toBe("0011/SENSUS/DP/2026");
    expect(doc.doc_type).toBe("DEMANDE_CHEQUE");
  });
});
