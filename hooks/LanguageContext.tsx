import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, type Language } from "../constants/translations";
import { useAuth } from "./AuthContext";
import { supabase, getProfile, upsertProfile } from "../services/supabase";

interface LanguageContextType {
  language: Language;
  t: (key: keyof typeof translations["en"]) => string;
  changeLanguage: (newLang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>("en");

  // 1. Initial load from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("guidem_language");
        if (stored === "en" || stored === "he" || stored === "ar") {
          setLanguageState(stored as Language);
        }
      } catch (err) {
        console.error("Failed to load cached language:", err);
      }
    })();
  }, []);

  // 2. Sync with logged-in user profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const p = await getProfile(user.id);
        if (p?.language && (p.language === "en" || p.language === "he" || p.language === "ar")) {
          setLanguageState(p.language as Language);
          await AsyncStorage.setItem("guidem_language", p.language);
        }
      } catch (err) {
        console.error("Failed to sync profile language:", err);
      }
    })();
  }, [user]);

  const t = useCallback(
    (key: keyof typeof translations["en"]): string => {
      const dict = translations[language] || translations["en"];
      return dict[key] || translations["en"][key] || key;
    },
    [language]
  );

  const changeLanguage = async (newLang: Language) => {
    if (newLang === language) return;

    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem("guidem_language", newLang);
    } catch (err) {
      console.error("Failed to save language in AsyncStorage:", err);
    }

    let activeUser = user;
    if (!activeUser) {
      const { data } = await supabase.auth.getUser();
      activeUser = data.user;
    }

    if (activeUser) {
      try {
        await upsertProfile(activeUser.id, { language: newLang });
      } catch (err) {
        console.error("Failed to save profile language to Supabase:", err);
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
