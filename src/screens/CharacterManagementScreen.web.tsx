import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  IconButton,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  FAB,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { CharacterStorageService } from '../services/characterStorage.web';
import { CharacterCardService } from '../services/characterCard.web';
import { StoredCharacter } from '../types';

interface Props {
  navigation: any;
}

export const CharacterManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCharacters();
    }, [])
  );

  const loadCharacters = async () => {
    try {
      const storedCharacters = await CharacterStorageService.getAllCharacters();
      setCharacters(storedCharacters);
    } catch (error) {
      console.error('Error loading characters:', error);
      Alert.alert('Error', 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const importCharacterCard = async () => {
    try {
      setImporting(true);
      
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        if (!file.type.includes('png')) {
          Alert.alert('Invalid File', 'Please select a PNG file.');
          return;
        }
        
        try {
          // Extract character card from PNG
          const characterCard = await CharacterCardService.extractCharacterFromPNG(file);
          
          if (!characterCard) {
            Alert.alert('Invalid File', 'This PNG file does not contain valid character card metadata.');
            return;
          }

          if (!CharacterCardService.validateCharacterCard(characterCard)) {
            Alert.alert('Invalid Character Card', 'The character card data is incomplete or invalid.');
            return;
          }

          // Import character
          const importedCharacter = await CharacterStorageService.importCharacterFromPNG(file, characterCard);
          
          Alert.alert('Success', `Character "${importedCharacter.name}" imported successfully!`);
          await loadCharacters();
          
        } catch (error) {
          console.error('Error processing file:', error);
          Alert.alert('Error', 'Failed to process character card file');
        }
      };
      
      input.click();
      
    } catch (error) {
      console.error('Error importing character:', error);
      Alert.alert('Error', 'Failed to import character card');
    } finally {
      setImporting(false);
    }
  };

  const deleteCharacter = async (character: StoredCharacter) => {
    if (confirm(`Are you sure you want to delete "${character.name}"?`)) {
      try {
        await CharacterStorageService.deleteCharacter(character.id);
        await loadCharacters();
        Alert.alert('Success', 'Character deleted successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to delete character');
      }
    }
  };

  const selectCharacter = async (character: StoredCharacter) => {
    try {
      // Save selected character to settings
      const { StorageService } = require('../utils/storage');
      const settings = await StorageService.getSettings();
      if (settings) {
        await StorageService.saveSettings({
          ...settings,
          selectedCharacter: character.id,
        });
      }
      
      Alert.alert('Character Selected', `${character.name} is now active for chat!`, [
        { text: 'OK', onPress: () => navigation.navigate('Chat') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to select character');
    }
  };

  const renderCharacterCard = ({ item }: { item: StoredCharacter }) => (
    <Card style={styles.characterCard}>
      <TouchableOpacity onPress={() => selectCharacter(item)}>
        <View style={styles.cardContent}>
          {item.avatar && (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          )}
          <View style={styles.characterInfo}>
            <Title style={styles.characterName}>{item.name}</Title>
            <Paragraph style={styles.characterDescription} numberOfLines={2}>
              {item.card.data.description}
            </Paragraph>
            {item.card.data.tags && item.card.data.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.card.data.tags.slice(0, 3).map((tag, index) => (
                  <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                    {tag}
                  </Chip>
                ))}
                {item.card.data.tags.length > 3 && (
                  <Chip style={styles.tag} textStyle={styles.tagText}>
                    +{item.card.data.tags.length - 3}
                  </Chip>
                )}
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => navigation.navigate('CharacterEdit', { characterId: item.id })}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => deleteCharacter(item)}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const createNewCharacter = () => {
    navigation.navigate('CharacterEdit', { characterId: null });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Characters</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading characters...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.headerTitle}>Characters</Title>
        <IconButton
          icon="plus"
          size={24}
          onPress={createNewCharacter}
        />
      </View>

      {characters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>No characters yet!</Paragraph>
          <Paragraph style={styles.emptySubtext}>
            Import character cards or create new ones to get started.
          </Paragraph>
          <View style={styles.emptyActions}>
            <Button
              mode="contained"
              onPress={importCharacterCard}
              loading={importing}
              disabled={importing}
              style={styles.emptyButton}
            >
              Import Character Card
            </Button>
            <Button
              mode="outlined"
              onPress={createNewCharacter}
              style={styles.emptyButton}
            >
              Create New Character
            </Button>
          </View>
        </View>
      ) : (
        <FlatList
          data={characters}
          renderItem={renderCharacterCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="upload"
        style={styles.fab}
        onPress={importCharacterCard}
        loading={importing}
        disabled={importing}
        label="Import PNG"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerPlaceholder: {
    width: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  emptyActions: {
    width: '100%',
  },
  emptyButton: {
    marginBottom: 12,
  },
  listContainer: {
    padding: 16,
  },
  characterCard: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 18,
    marginBottom: 4,
  },
  characterDescription: {
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 6,
    marginBottom: 4,
    height: 24,
  },
  tagText: {
    fontSize: 10,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});