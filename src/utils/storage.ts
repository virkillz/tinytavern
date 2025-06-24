import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Message } from '../types';

const SETTINGS_KEY = 'app_settings';
const MESSAGES_KEY = 'chat_messages';
const USER_PROFILE_KEY = 'user_profile';

export const StorageService = {
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },

  async saveMessages(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
      throw error;
    }
  },

  async getMessages(): Promise<Message[]> {
    try {
      const messages = await AsyncStorage.getItem(MESSAGES_KEY);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  async clearMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MESSAGES_KEY);
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  },

  async saveUserProfile(profile: { name: string; avatar?: string }): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  },

  async getUserProfile(): Promise<{ name: string; avatar?: string } | null> {
    try {
      const profile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },
};