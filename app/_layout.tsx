import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/AuthContext';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/sign-in');
    }
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false}}>
      <Stack.Screen name='sign-in' />
      <Stack.Screen name='sign-up' />
      <Stack.Screen name='(tabs)' />
      <Stack.Screen
        name='detail'
        options={{ headerShown: true, title: 'Activity Details', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: '#203b60' } }}
      />
      <Stack.Screen
        name='career'
        options={{ headerShown: true, title: 'Career Details', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: '#203b60' } }}
      />
      <Stack.Screen
        name='personal-details'
        options={{ headerShown: true, title: 'Personal Information', headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: '#203b60' } }}
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