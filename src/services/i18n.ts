import { EventEmitter } from 'events';
import { logger } from '../utils';

type TranslationKey = string;
type TranslationParams = Record<string, string | number>;
type LanguageCode = string;

interface I18nServiceInterface {
  t(key: TranslationKey, params?: TranslationParams): string;
  setLanguage(language: LanguageCode): Promise<void>;
  getLanguage(): LanguageCode;
  on(event: 'languageChanged', listener: (language: LanguageCode) => void): void;
  hasTranslation(key: TranslationKey): boolean;
  getAllKeys(): string[];
}

class I18nService extends EventEmitter implements I18nServiceInterface {
  private currentLanguage: LanguageCode = 'en';
  private fallbackLanguage: LanguageCode = 'en';
  private currentTranslations: Record<string, any> = {};
  private fallbackTranslations: Record<string, any> = {};
  private missingKeys: Set<string> = new Set();
  private loggedMissingKeys: Map<string, { count: number; lastLogged: number }> = new Map();
  private readonly THROTTLE_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_LOGS_PER_KEY = 3; // Max 3 logs per missing key

  constructor(currentLanguage: LanguageCode = 'en', fallbackLanguage: LanguageCode = 'en') {
    super();
    this.currentLanguage = currentLanguage;
    this.fallbackLanguage = fallbackLanguage;
    this.initializeTranslations();
  }

  /**
   * Initialize translations by loading language files
   */
  private async initializeTranslations(): Promise<void> {
    try {
      await this.loadTranslations(this.currentLanguage);
      if (this.currentLanguage !== this.fallbackLanguage) {
        await this.loadFallbackTranslations(this.fallbackLanguage);
      }
    } catch (error) {
      logger.error('Failed to initialize translations', error, {
        component: 'I18nService',
        action: 'initializeTranslations'
      });
      // Load default English translations as fallback
      await this.loadTranslations('en');
    }
  }

  /**
   * Load translations for a specific language
   */
  private async loadTranslations(language: LanguageCode): Promise<void> {
    try {
      const translations = await this.dynamicImport(language);
      this.currentTranslations = translations;
    } catch (error) {
      logger.error(`Failed to load translations for language '${language}'`, error, {
        component: 'I18nService',
        action: 'loadTranslations',
        metadata: { language }
      });
      throw error;
    }
  }

  /**
   * Load fallback translations
   */
  private async loadFallbackTranslations(language: LanguageCode): Promise<void> {
    try {
      const translations = await this.dynamicImport(language);
      this.fallbackTranslations = translations;
    } catch (error) {
      logger.error(`Failed to load fallback translations for language '${language}'`, error, {
        component: 'I18nService',
        action: 'loadFallbackTranslations',
        metadata: { language }
      });
      // Keep existing fallback translations
    }
  }

  /**
   * Dynamic import of translation files
   */
  private async dynamicImport(language: LanguageCode): Promise<Record<string, any>> {
    try {
      // Use require for dynamic loading since we're in React Native
      const translations = require(`../../i18n/${language}.json`);
      return translations;
    } catch (error) {
      if (language === 'en') {
        // Fallback to hardcoded English if file doesn't exist
        const englishTranslations = require('../../i18n/en.json');
        return englishTranslations;
      }
      throw error;
    }
  }

  /**
   * Set the current language and reload translations
   * @param language - Language code (e.g., 'en', 'zh')
   */
  async setLanguage(language: LanguageCode): Promise<void> {
    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;
    
    try {
      await this.loadTranslations(language);
      if (language !== this.fallbackLanguage) {
        await this.loadFallbackTranslations(this.fallbackLanguage);
      }
      
      // Clear missing keys cache when language changes
      this.missingKeys.clear();
      
      // Emit language change event
      this.emit('languageChanged', language);
    } catch (error) {
      // Revert to previous language on error
      this.currentLanguage = previousLanguage;
      logger.error(`Failed to set language to '${language}'`, error, {
        component: 'I18nService',
        action: 'setLanguage',
        metadata: { language, previousLanguage }
      });
      throw error;
    }
  }

  /**
   * Get the current language
   * @returns Current language code
   */
  getLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  /**
   * Get translation by key with optional parameter interpolation
   * Implements cascading lookup: current → fallback → key literal
   * @param key - Translation key (e.g., 'auth.welcomeBack')
   * @param params - Parameters to interpolate (e.g., { count: 5, name: 'John' })
   * @returns Translated string
   */
  t(key: TranslationKey, params?: TranslationParams): string {
    // Handle pluralization
    const finalKey = this.resolvePluralKey(key, params?.count);
    
    // First try current language
    let value = this.getTranslationValue(finalKey, this.currentTranslations);
    
    // If not found, try fallback language
    if (value === null && this.currentLanguage !== this.fallbackLanguage) {
      value = this.getTranslationValue(finalKey, this.fallbackTranslations);
    }
    
    // If still not found, return key as literal fallback
    if (value === null) {
      this.logMissingKey(finalKey);
      return finalKey;
    }

    // Handle parameter interpolation
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * Resolve plural key based on count parameter
   * @param key - Original translation key
   * @param count - Count value for pluralization
   * @returns Resolved key (plural or original)
   */
  private resolvePluralKey(key: TranslationKey, count?: string | number): string {
    if (typeof count === 'number' && count !== 1) {
      const pluralKey = `${key}_plural`;
      // Check if plural key exists before using it
      if (this.keyExistsInTranslations(pluralKey)) {
        return pluralKey;
      }
    }
    return key;
  }

  /**
   * Check if a key exists in either current or fallback translations
   */
  private keyExistsInTranslations(key: TranslationKey): boolean {
    return this.getTranslationValue(key, this.currentTranslations) !== null ||
           this.getTranslationValue(key, this.fallbackTranslations) !== null;
  }

  /**
   * Get translation value from a specific translation object
   * @param key - Translation key
   * @param translations - Translation object to search
   * @returns Translation value or null if not found
   */
  private getTranslationValue(key: TranslationKey, translations: Record<string, any>): string | null {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * Log missing translation key (with throttling to prevent spam)
   * @param key - Missing translation key
   */
  private logMissingKey(key: TranslationKey): void {
    // Always add to missing keys set for tracking
    this.missingKeys.add(key);
    
    const now = Date.now();
    const logEntry = this.loggedMissingKeys.get(key);
    
    // Check if we should log this missing key
    const shouldLog = !logEntry || 
      (logEntry.count < this.MAX_LOGS_PER_KEY && 
       now - logEntry.lastLogged > this.THROTTLE_INTERVAL_MS);
    
    if (shouldLog) {
      const count = logEntry ? logEntry.count + 1 : 1;
      
      // Update tracking
      this.loggedMissingKeys.set(key, {
        count,
        lastLogged: now,
      });
      
      // Log the missing key using centralized logger
      const message = `Translation key '${key}' not found in '${this.currentLanguage}' or fallback '${this.fallbackLanguage}'`;
      const context = {
        component: 'I18nService',
        action: 'translation_lookup',
        metadata: {
          key,
          currentLanguage: this.currentLanguage,
          fallbackLanguage: this.fallbackLanguage,
          attemptCount: count,
        },
      };
      
      if (count >= this.MAX_LOGS_PER_KEY) {
        // Final warning for this key
        logger.warn(`${message} (Final warning - will not log again)`, null, context);
      } else {
        logger.warn(message, null, context);
      }
    }
  }

  /**
   * Interpolate parameters in translation string (hardened version)
   * Safely ignores undefined parameters
   * @param text - Text with placeholders
   * @param params - Parameters to interpolate
   * @returns Interpolated string
   */
  private interpolate(text: string, params: TranslationParams): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in params && params[key] != null) {
        return String(params[key]);
      }
      // Silently return the placeholder for undefined params (no console warning)
      return match;
    });
  }

  /**
   * Check if a translation key exists in current or fallback language
   * @param key - Translation key to check
   * @returns True if key exists
   */
  hasTranslation(key: TranslationKey): boolean {
    return this.getTranslationValue(key, this.currentTranslations) !== null ||
           this.getTranslationValue(key, this.fallbackTranslations) !== null;
  }

  /**
   * Get all available translation keys from current language (for debugging)
   * @returns Array of translation keys
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    
    const traverse = (obj: any, prefix: string = '') => {
      for (const key in obj) {
        const currentKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key], currentKey);
        } else if (typeof obj[key] === 'string') {
          keys.push(currentKey);
        }
      }
    };

    traverse(this.currentTranslations);
    return keys.sort();
  }

  /**
   * Get all missing keys that have been requested
   * @returns Array of missing translation keys
   */
  getMissingKeys(): string[] {
    return Array.from(this.missingKeys).sort();
  }

  /**
   * Clear the missing keys collection
   */
  clearMissingKeys(): void {
    this.missingKeys.clear();
  }

  /**
   * Get supported languages (based on available translation files)
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): LanguageCode[] {
    // In a real implementation, this would scan the i18n directory
    // For now, return the languages we know exist
    return ['en', 'zh'];
  }
}

// Create singleton instance
const i18n = new I18nService();

export default i18n;
export { I18nService };
export type { TranslationKey, TranslationParams, LanguageCode };
