import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { getProfile } from "../../services/supabase";

export default function TabsLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    (async () => {
      try {
        const p = await getProfile(user.id);
        const userRole = (p?.role && p.role.trim() !== "") ? p.role.toLowerCase() : "student";
        setRole(userRole);
      } catch (err) {
        console.error("Layout load role error:", err);
      }
    })();
  }, [user]);

  const isParent = role === "parent";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.heading,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Guide",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          href: isParent ? null : undefined, // Hide Search tab for Parent accounts
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="questionnaire"
        options={{
          title: "Questionnaire",
          href: isParent ? null : undefined, // Hide Questionnaire tab for Parent accounts
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
