import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../services/i18n';
import { LanguageCode } from '../services/i18n';

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (language: LanguageCode) => Promise<void>;
  language: LanguageCode;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<LanguageCode>(i18n.getLanguage());

  useEffect(() => {
    // Listen to language change events
    const handleLanguageChange = (newLanguage: LanguageCode) => {
      setCurrentLanguage(newLanguage);
    };

    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup
    return () => {
      i18n.removeListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const setLanguage = async (newLanguage: LanguageCode): Promise<void> => {
    try {
      await i18n.setLanguage(newLanguage);
      // State will be updated via the event listener
    } catch (error) {
      console.error('Failed to set language:', error);
      throw error;
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return i18n.t(key, params);
  };

  const value: I18nContextType = {
    t,
    setLanguage,
    language,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
