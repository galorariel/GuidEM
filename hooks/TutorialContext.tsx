import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: string; // Ionicons name
  iconColor?: string;
  primaryActionText: string;
}

function getTutorialStep(id: string, t: (key: any) => string): TutorialStep | null {
  const map: Record<string, { icon: string; keys: { title: any; desc: any; bullets: any[]; action: any } }> = {
    welcome: {
      icon: "rocket-outline",
      keys: { title: "tut_welcome_title", desc: "tut_welcome_desc", bullets: ["tut_welcome_b1", "tut_welcome_b2"], action: "tut_welcome_action" },
    },
    quiz_start: {
      icon: "chatbubble-ellipses-outline",
      keys: { title: "tut_quiz_start_title", desc: "tut_quiz_start_desc", bullets: ["tut_quiz_start_b1", "tut_quiz_start_b2", "tut_quiz_start_b3"], action: "tut_quiz_start_action" },
    },
    recs_ready: {
      icon: "trophy-outline",
      keys: { title: "tut_recs_ready_title", desc: "tut_recs_ready_desc", bullets: ["tut_recs_ready_b1", "tut_recs_ready_b2", "tut_recs_ready_b3"], action: "tut_recs_ready_action" },
    },
    career_detail: {
      icon: "compass-outline",
      keys: { title: "tut_career_detail_title", desc: "tut_career_detail_desc", bullets: ["tut_career_detail_b1", "tut_career_detail_b2", "tut_career_detail_b3"], action: "tut_career_detail_action" },
    },
    browse: {
      icon: "search-outline",
      keys: { title: "tut_browse_title", desc: "tut_browse_desc", bullets: ["tut_browse_b1", "tut_browse_b2", "tut_browse_b3"], action: "tut_browse_action" },
    },
    profile: {
      icon: "person-outline",
      keys: { title: "tut_profile_title", desc: "tut_profile_desc", bullets: ["tut_profile_b1", "tut_profile_b2", "tut_profile_b3"], action: "tut_profile_action" },
    },
    guide_path: {
      icon: "map-outline",
      keys: { title: "tut_guide_path_title", desc: "tut_guide_path_desc", bullets: ["tut_guide_path_b1", "tut_guide_path_b2", "tut_guide_path_b3"], action: "tut_guide_path_action" },
    },
    guide_choice: {
      icon: "git-branch-outline",
      keys: { title: "tut_guide_choice_title", desc: "tut_guide_choice_desc", bullets: ["tut_guide_choice_b1", "tut_guide_choice_b2", "tut_guide_choice_b3"], action: "tut_guide_choice_action" },
    },
    activity_detail: {
      icon: "construct-outline",
      keys: { title: "tut_activity_detail_title", desc: "tut_activity_detail_desc", bullets: ["tut_activity_detail_b1", "tut_activity_detail_b2", "tut_activity_detail_b3"], action: "tut_activity_detail_action" },
    },
  };

  const item = map[id];
  if (!item) return null;

  return {
    id,
    title: t(item.keys.title),
    description: t(item.keys.desc),
    bullets: item.keys.bullets.map((b) => t(b)),
    icon: item.icon,
    primaryActionText: t(item.keys.action),
  };
}

interface TutorialContextType {
  activeTutorial: TutorialStep | null;
  showTutorial: (id: string) => Promise<boolean>;
  dismissActiveTutorial: () => Promise<void>;
  resetTutorials: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [seenTutorials, setSeenTutorials] = useState<Record<string, boolean>>({});
  const [activeTutorial, setActiveTutorial] = useState<TutorialStep | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep a ref in sync with the state so showTutorial always reads the
  // latest value without needing to be recreated on every state change.
  const seenRef = useRef(seenTutorials);
  useEffect(() => { seenRef.current = seenTutorials; }, [seenTutorials]);
  const isLoadedRef = useRef(isLoaded);
  useEffect(() => { isLoadedRef.current = isLoaded; }, [isLoaded]);

  const storageKey = user ? `@guidem_seen_tutorials_${user.id}` : `@guidem_seen_tutorials_guest`;

  // 1. Clear active popup and reset loaded state on user logout or change
  useEffect(() => {
    setActiveTutorial(null);
    setIsLoaded(false);
  }, [user]);

  // 2. Load user-scoped seen status from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSeenTutorials(parsed);
          seenRef.current = parsed;
        } else {
          setSeenTutorials({});
          seenRef.current = {};
        }
      } catch (err) {
        console.error("Failed to load seen tutorials:", err);
      } finally {
        setIsLoaded(true);
        isLoadedRef.current = true;
      }
    })();
  }, [storageKey]);

  // Stable reference — uses refs so it never goes stale on re-renders
  const showTutorial = useCallback(async (id: string): Promise<boolean> => {
    if (!isLoadedRef.current) return false;
    if (seenRef.current[id]) return false;

    const step = getTutorialStep(id, t);
    if (!step) return false;

    setActiveTutorial(step);
    return true;
  }, [t]);

  const dismissActiveTutorial = async () => {
    if (!activeTutorial) return;

    const id = activeTutorial.id;
    const updated = { ...seenTutorials, [id]: true };
    seenRef.current = updated;

    setSeenTutorials(updated);
    setActiveTutorial(null);

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save seen tutorial state:", err);
    }
  };

  const resetTutorials = async () => {
    setSeenTutorials({});
    setActiveTutorial(null);
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (err) {
      console.error("Failed to reset tutorial state:", err);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        activeTutorial,
        showTutorial,
        dismissActiveTutorial,
        resetTutorials,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
