import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/AuthContext';
import { useFonts } from 'expo-font';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/welcome');
    }
  }, [user, isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.heading,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={{ paddingRight: 10, paddingVertical: 5 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.heading} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name='welcome' />
      <Stack.Screen
        name='sign-in'
        options={{ headerShown: true, title: '' }}
      />
      <Stack.Screen
        name='sign-up'
        options={{ headerShown: true, title: '' }}
      />
      <Stack.Screen name='(tabs)' options={{ title: '', gestureEnabled: false }} />
      <Stack.Screen
        name='detail'
        options={{ headerShown: true, title: 'Activity Details', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.heading } }}
      />
      <Stack.Screen
        name='career'
        options={{ headerShown: true, title: 'Career Details', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.heading } }}
      />
      <Stack.Screen
        name='personal-details'
        options={{ headerShown: true, title: 'Personal Information', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.heading } }}
      />
      <Stack.Screen
        name='saved'
        options={{ headerShown: true, title: 'Saved', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.heading } }}
      />
    </Stack>
  );
}

export default function RootLayout(){
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}