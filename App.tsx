import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChatScreen } from './src/screens/ChatScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Import character screens
import { CharacterManagementScreen } from './src/screens/CharacterManagementScreen';
import { CharacterEditScreen } from './src/screens/CharacterEditScreen';
import { CharacterDetailScreen } from './src/screens/CharacterDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  try {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator
              initialRouteName="Settings"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Characters" component={CharacterManagementScreen} />
              <Stack.Screen name="CharacterEdit" component={CharacterEditScreen} />
              <Stack.Screen name="CharacterDetail" component={CharacterDetailScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
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
