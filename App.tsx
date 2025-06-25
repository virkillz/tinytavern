import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Forum_400Regular } from '@expo-google-fonts/forum';
import { bookTheme } from './src/styles/theme';
import { ChatScreen } from './src/screens/ChatScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CharacterStorageService } from './src/services/characterStorage';
import { BookStorageService } from './src/services/bookStorage';

// Import character screens
import { CharacterManagementScreen } from './src/screens/CharacterManagementScreen';
import { CharacterEditScreen } from './src/screens/CharacterEditScreen';
import { CharacterDetailScreen } from './src/screens/CharacterDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Import book screens
import { BookManagementScreen } from './src/screens/BookManagementScreen';
import { BookDetailScreen } from './src/screens/BookDetailScreen';
import { BookChatScreen } from './src/screens/BookChatScreen';
import { BookEditScreen } from './src/screens/BookEditScreen';

// Import gallery screens
import { GalleryScreen } from './src/screens/GalleryScreen';
import { ImageGenerationScreen } from './src/screens/ImageGenerationScreen';

// Import character cards browser screens
import { CharacterCardsBrowserScreen } from './src/screens/CharacterCardsBrowserScreen';
import { CharacterCardDetailScreen } from './src/screens/CharacterCardDetailScreen';

import { BottomNavBar } from './src/components/BottomNavBar';

const Stack = createNativeStackNavigator();

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [navigationRef, setNavigationRef] = useState<any>(null);

  // Load Forum font
  let [fontsLoaded] = useFonts({
    Forum_400Regular,
  });

  useEffect(() => {
    // Initialize default character and book when app starts
    CharacterStorageService.initializeDefaultCharacter().catch((error) => {
      console.error('Failed to initialize default character:', error);
    });
    
    BookStorageService.initializeDefaultBook().catch((error) => {
      console.error('Failed to initialize default book:', error);
    });
  }, []);

  // Handle navigation state changes
  const onNavigationStateChange = (state: any) => {
    if (state && state.routes && state.routes.length > 0) {
      const route = state.routes[state.index];
      setCurrentRoute(route.name);
    }
  };

  // Define which screens should show the bottom navigation
  const screensWithBottomNav = [
    'Home',
    'Characters',
    'Books',
    'CharacterCardsBrowser',
    'BookDetail',
    'CharacterDetail',
    'CharacterCardDetail'
  ];

  const shouldShowBottomNav = screensWithBottomNav.includes(currentRoute);

  // Don't render the app until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  try {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={bookTheme}>
          <NavigationContainer
            ref={setNavigationRef}
            onStateChange={onNavigationStateChange}
          >
            <StatusBar style="auto" />
            <View style={styles.container}>
              <View style={styles.navigatorContainer}>
                <Stack.Navigator
                  initialRouteName="Home"
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                  <Stack.Screen name="Characters" component={CharacterManagementScreen} />
                  <Stack.Screen name="CharacterEdit" component={CharacterEditScreen} />
                  <Stack.Screen name="CharacterDetail" component={CharacterDetailScreen} />
                  <Stack.Screen name="Profile" component={ProfileScreen} />
                  
                  {/* Book Screens */}
                  <Stack.Screen name="Books" component={BookManagementScreen} />
                  <Stack.Screen name="BookDetail" component={BookDetailScreen} />
                  <Stack.Screen name="BookChat" component={BookChatScreen} />
                  <Stack.Screen name="BookEdit" component={BookEditScreen} />
                  
                  {/* Gallery Screens */}
                  <Stack.Screen name="Gallery" component={GalleryScreen} />
                  <Stack.Screen name="ImageGeneration" component={ImageGenerationScreen} />
                  
                  {/* Character Cards Browser Screens */}
                  <Stack.Screen name="CharacterCardsBrowser" component={CharacterCardsBrowserScreen} />
                  <Stack.Screen name="CharacterCardDetail" component={CharacterCardDetailScreen} />
                </Stack.Navigator>
              </View>
              {shouldShowBottomNav && navigationRef && (
                <BottomNavBar navigation={navigationRef} currentRoute={currentRoute} />
              )}
            </View>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('App Error:', error);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigatorContainer: {
    flex: 1,
  },
});
