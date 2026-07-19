import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View, Share, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { resetLearningPath } from "../../services/guide";
import { getProfile } from "../../services/supabase";
import { getLinkedParents, unlinkParent } from "../../services/parents";

export default function Profile() {
  const { user, signOut } = useAuth();
  
  const [role, setRole] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkedParents, setLinkedParents] = useState<{ parentId: string; parentName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getProfile(user.id);
      const userRole = (p?.role && p.role.trim() !== '') ? p.role.toLowerCase() : "student";
      setRole(userRole);
      
      if (userRole === "student") {
        setLinkCode(p?.link_code || null);
        const parents = await getLinkedParents();
        setLinkedParents(parents);
      }
    } catch (err) {
      console.error("Failed to load profile details:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  if (!user) return null;
  const name = (user.user_metadata?.full_name as string) || "User";
  const email = user.email || "-";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not sign out.");
    }
  };

  const handleResetPath = async () => {
    Alert.alert(
      "Reset Learning Path",
      "Are you sure you want to reset your learning path? This will wipe your progress and choices, and start you back at the beginning of your career path.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetLearningPath(user.id);
              Alert.alert("Success", "Learning path has been reset successfully.");
            } catch (err: any) {
              Alert.alert("Error", "Could not reset learning path.");
            }
          },
        },
      ]
    );
  };

  const handleShareCode = async () => {
    if (!linkCode) return;
    try {
      await Share.share({
        message: `Join my career journey on GuidEM! Enter my connection code to follow my progress: ${linkCode}`,
      });
    } catch (error: any) {
      Alert.alert("Error", "Sharing failed.");
    }
  };

  const handleUnlinkParent = (parentId: string, parentName: string) => {
    Alert.alert(
      "Remove Connection?",
      `Are you sure you want to disconnect ${parentName} from monitoring your milestones progress?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const success = await unlinkParent(parentId);
            if (success) {
              await loadProfileData();
            } else {
              Alert.alert("Error", "Could not remove connection.");
            }
          },
        },
      ]
    );
  };

  const isStudent = role === "student";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Profile</Text>

      {/* Profile Details Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.emailText}>{email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {role ? role.toUpperCase() : "STUDENT"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Settings Menu (Student-Only) */}
      {isStudent && (
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Settings</Text>
          <Pressable style={styles.menuItem} onPress={() => router.push("/personal-details")}>
            <Ionicons name="person-outline" size={20} color={colors.accent} />
            <Text style={styles.menuText}>Personal Details</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          
          <Pressable style={styles.menuItem} onPress={() => router.push("/saved")}>
            <Ionicons name="bookmark-outline" size={20} color={colors.accent} />
            <Text style={styles.menuText}>Saved Careers & Activities</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </View>
      )}

      {/* Account Sharing for Students */}
      {isStudent && linkCode && (
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Account Sharing</Text>
          <Text style={styles.bodyText}>
            Share this unique code with parents or teachers so they can follow your career path progress.
          </Text>
          
          <View style={styles.shareRow}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{linkCode}</Text>
            </View>
            <Pressable
              onPress={handleShareCode}
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
            >
              <Ionicons name="share-social" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          </View>

          {/* Linked Parents List */}
          {linkedParents.length > 0 && (
            <View style={styles.linkedListContainer}>
              <Text style={styles.linkedListTitle}>Connected Parents</Text>
              {linkedParents.map((parent) => (
                <View key={parent.parentId} style={styles.linkedItem}>
                  <Ionicons name="people" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.linkedName} numberOfLines={1}>
                    {parent.parentName}
                  </Text>
                  <Pressable
                    onPress={() => handleUnlinkParent(parent.parentId, parent.parentName)}
                    hitSlop={8}
                    style={styles.unlinkBtn}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Developer Tools (Student-Only) */}
      {isStudent && (
        <View style={styles.card}>
          <Text style={[styles.sectionHeading, { color: colors.muted }]}>Developer Tools</Text>
          <Pressable style={styles.menuItem} onPress={handleResetPath}>
            <Ionicons name="refresh-circle-outline" size={20} color="#cc7a00" />
            <Text style={[styles.menuText, { color: "#cc7a00" }]}>Reset Learning Path</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </View>
      )}

      <CustomButton title="Sign Out" onPress={handleSignOut} style={styles.signOutBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 40,
  },
  h1: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarLargeText: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.accent,
  },
  nameText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.heading,
    marginBottom: 2,
  },
  emailText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent + "15",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.accent,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.heading,
    marginLeft: 12,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heading,
    lineHeight: 18,
    marginBottom: 12,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  codeContainer: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  codeText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.heading,
    letterSpacing: 2,
  },
  shareBtn: {
    height: 44,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    fontFamily: fonts.bodyBold,
    color: "#fff",
    fontSize: 13,
  },
  linkedListContainer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  linkedListTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  linkedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  linkedName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.heading,
  },
  unlinkBtn: {
    padding: 2,
  },
  signOutBtn: {
    marginTop: 10,
    backgroundColor: colors.muted,
  },
  pressed: {
    opacity: 0.9,
  },
});
