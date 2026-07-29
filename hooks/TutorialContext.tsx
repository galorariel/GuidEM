import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: string; // Ionicons name
  iconColor?: string;
  primaryActionText: string;
}

const TUTORIALS: Record<string, TutorialStep> = {
  welcome: {
    id: "welcome",
    title: "Welcome to GuidEM! 🚀",
    description: "Your personalized guide to discovering your dream career and building a roadmap to get there.",
    bullets: [
      "Start by taking our Questionnaire to match your personality.",
      "Or explore careers, majors, and activities in the Browse tab.",
    ],
    icon: "rocket-outline",
    primaryActionText: "Let's Go!",
  },
  quiz_start: {
    id: "quiz_start",
    title: "Personality Questionnaire 🧠",
    description: "Find out what careers fit your natural interests and personality type.",
    bullets: [
      "Choose how much you agree with each activity description.",
      "Be honest — there are no right or wrong answers!",
      "It takes less than 3 minutes to complete.",
    ],
    icon: "chatbubble-ellipses-outline",
    primaryActionText: "Start Quiz",
  },
  recs_ready: {
    id: "recs_ready",
    title: "Your Recommendations! 🎉",
    description: "We've matched your personality profile (RIASEC code) with exciting careers.",
    bullets: [
      "Explore each career card to learn about salaries, majors, and details.",
      "Save the ones you like to your profile.",
      "Generate a step-by-step path to start building real skills!",
    ],
    icon: "trophy-outline",
    primaryActionText: "Explore Matches",
  },
  career_detail: {
    id: "career_detail",
    title: "Career Deep Dive 🔍",
    description: "Here you can see everything about this career, including study subjects, salary, and requirements.",
    bullets: [
      "Tap Save (heart) to bookmark this career in your profile.",
      "Tap Start Guide (map) to build a custom step-by-step roadmap.",
      "Look through options until you find the path that excites you!",
    ],
    icon: "compass-outline",
    primaryActionText: "Got It",
  },
  browse: {
    id: "browse",
    title: "Explore & Discover 🌐",
    description: "Browse the catalog to find careers, school majors, and skill-building activities.",
    bullets: [
      "Search for any job title or specialization.",
      "Filter activities by category (Tech, Creative, Science).",
      "Discover high school majors that align with your goals.",
    ],
    icon: "search-outline",
    primaryActionText: "Start Browsing",
  },
  profile: {
    id: "profile",
    title: "Your Profile Dashboard 👤",
    description: "Keep track of your achievements, saved items, and personal details.",
    bullets: [
      "View your saved careers, majors, and activities.",
      "Link a Parent to share your career path and invite them to collaborate.",
      "Update your grade level, school majors, or contact info anytime.",
    ],
    icon: "person-outline",
    primaryActionText: "Got It",
  },
  guide_path: {
    id: "guide_path",
    title: "Your Learning Guide 🗺️",
    description: "This is your customized roadmap to build skills for your selected career!",
    bullets: [
      "Follow the steps sequentially: lessons, tasks, and quizzes.",
      "Read the instructions and check the resource links inside each step.",
      "Tap 'Mark as Done' to earn progress and move forward.",
    ],
    icon: "map-outline",
    primaryActionText: "Let's Start!",
  },
  guide_choice: {
    id: "guide_choice",
    title: "Choose Your Direction ⚡",
    description: "You've reached a branching choice in your career path!",
    bullets: [
      "Select the specialization direction that interests you most.",
      "GuidEM will instantly generate the next personalized learning unit.",
      "Your path dynamically changes based on your decisions!",
    ],
    icon: "git-branch-outline",
    primaryActionText: "Decide Path",
  },
  activity_detail: {
    id: "activity_detail",
    title: "Practical Activities 🛠️",
    description: "Get hands-on experience by completing real-world tasks and challenges.",
    bullets: [
      "Read the activity description and requirements carefully.",
      "Follow the external links for references, documentation, or tools.",
      "Mark as completed to keep track of your practical achievements.",
    ],
    icon: "construct-outline",
    primaryActionText: "Got It",
  },
};

interface TutorialContextType {
  activeTutorial: TutorialStep | null;
  showTutorial: (id: string) => Promise<boolean>;
  dismissActiveTutorial: () => Promise<void>;
  resetTutorials: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTutorial, setActiveTutorial] = useState<TutorialStep | null>(null);
  const [seenTutorials, setSeenTutorials] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadSeen = async () => {
      if (!user) {
        setSeenTutorials(new Set());
        setActiveTutorial(null);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(`guidem_seen_tutorials_${user.id}`);
        if (stored) {
          setSeenTutorials(new Set(JSON.parse(stored)));
        } else {
          setSeenTutorials(new Set());
        }
      } catch (err) {
        console.error("Failed to load seen tutorials:", err);
      }
    };
    loadSeen();
  }, [user]);

  const showTutorial = async (id: string): Promise<boolean> => {
    // If tutorial is not defined or already seen, ignore
    if (!TUTORIALS[id] || seenTutorials.has(id)) {
      return false;
    }

    // Set as active
    setActiveTutorial(TUTORIALS[id]);
    return true;
  };

  const dismissActiveTutorial = async () => {
    if (!activeTutorial || !user) return;

    const id = activeTutorial.id;
    const nextSeen = new Set(seenTutorials);
    nextSeen.add(id);

    setSeenTutorials(nextSeen);
    setActiveTutorial(null);

    try {
      await AsyncStorage.setItem(
        `guidem_seen_tutorials_${user.id}`,
        JSON.stringify(Array.from(nextSeen))
      );
    } catch (err) {
      console.error("Failed to save seen tutorial state:", err);
    }
  };

  const resetTutorials = async () => {
    setSeenTutorials(new Set());
    setActiveTutorial(null);
    if (!user) return;
    try {
      await AsyncStorage.removeItem(`guidem_seen_tutorials_${user.id}`);
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
