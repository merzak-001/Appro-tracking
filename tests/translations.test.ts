import { describe, it, expect } from 'vitest';
import { translations, Language } from '../src/translations';

describe('translations', () => {
  const languages: Language[] = ['fr', 'en', 'ar'];

  it('should contain translations for fr, en, and ar', () => {
    languages.forEach((lang) => {
      expect(translations[lang]).toBeDefined();
      expect(typeof translations[lang]).toBe('object');
    });
  });

  it('should have key common translation properties across all languages', () => {
    const requiredKeys = [
      'dashboard',
      'localOrders',
      'foreignOrders',
      'localDeliveries',
      'foreignExpeditions',
      'suppliers',
      'userManagement',
      'cancel',
      'actions',
      'logout'
    ];

    languages.forEach((lang) => {
      const dict = translations[lang] as Record<string, string>;
      requiredKeys.forEach((key) => {
        expect(dict[key]).toBeDefined();
        expect(typeof dict[key]).toBe('string');
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should have matching key sets between French, English, and Arabic', () => {
    const frKeys = Object.keys(translations.fr).sort();
    const enKeys = Object.keys(translations.en).sort();
    const arKeys = Object.keys(translations.ar).sort();

    expect(enKeys).toEqual(frKeys);
    expect(arKeys).toEqual(frKeys);
  });
});
