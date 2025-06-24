import { Platform } from 'react-native';

// Conditional imports based on platform
export const getCharacterStorageService = async () => {
  if (Platform.OS === 'web') {
    const { CharacterStorageService } = await import('../services/characterStorage.web');
    return CharacterStorageService;
  } else {
    const { CharacterStorageService } = await import('../services/characterStorage');
    return CharacterStorageService;
  }
};

export const getCharacterCardService = async () => {
  if (Platform.OS === 'web') {
    const { CharacterCardService } = await import('../services/characterCard.web');
    return CharacterCardService;
  } else {
    const { CharacterCardService } = await import('../services/characterCard');
    return CharacterCardService;
  }
};

export const getCharacterManagementScreen = async () => {
  if (Platform.OS === 'web') {
    const { CharacterManagementScreen } = await import('../screens/CharacterManagementScreen.web');
    return CharacterManagementScreen;
  } else {
    const { CharacterManagementScreen } = await import('../screens/CharacterManagementScreen');
    return CharacterManagementScreen;
  }
};