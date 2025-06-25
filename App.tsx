import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize default character and book when app starts
    CharacterStorageService.initializeDefaultCharacter().catch((error) => {
      console.error('Failed to initialize default character:', error);
    });
    
    BookStorageService.initializeDefaultBook().catch((error) => {
      console.error('Failed to initialize default book:', error);
    });
  }, []);

  try {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={bookTheme}>
          <NavigationContainer>
            <StatusBar style="auto" />
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
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('App Error:', error);
    return null;
  }
}
