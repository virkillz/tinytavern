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
  Avatar,
  TextInput,
  Chip,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { CharacterStorageService } from '../services/characterStorage';
import { CharacterCardService } from '../services/characterCard';
import { PNGDebugger } from '../utils/debugPNG';
import { StoredCharacter } from '../types';

interface Props {
  navigation: any;
}

export const CharacterManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [filteredCharacters, setFilteredCharacters] = useState<StoredCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCharacters();
    }, [])
  );

  // Filter characters based on search query and selected tags
  useEffect(() => {
    let filtered = characters;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(character =>
        character.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(character =>
        character.card.data.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    setFilteredCharacters(filtered);
  }, [characters, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const loadCharacters = async () => {
    try {
      const storedCharacters = await CharacterStorageService.getAllCharacters();
      setCharacters(storedCharacters);
      setFilteredCharacters(storedCharacters);
      
      // Extract all unique tags
      const tags = new Set<string>();
      storedCharacters.forEach(character => {
        if (character.card.data.tags) {
          character.card.data.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags).sort());
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

      // Pick PNG file from file system
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/png',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;
      
      // Debug the PNG file first
      console.log('🔧 Debugging PNG file...');
      await PNGDebugger.debugPNGFile(imageUri);
      
      // Extract character card from PNG
      const characterCard = await CharacterCardService.extractCharacterFromPNG(imageUri);
      
      if (!characterCard) {
        Alert.alert(
          'Invalid File', 
          'This PNG file does not contain valid character card metadata. Check the console for detailed debug information.',
          [
            { 
              text: 'Debug Info', 
              onPress: () => {
                Alert.alert(
                  'Debug Instructions',
                  'Open your browser/app console (F12) to see detailed PNG analysis. Look for logs starting with 🔍 PNG DEBUG.'
                );
              }
            },
            { text: 'OK' }
          ]
        );
        return;
      }

      if (!CharacterCardService.validateCharacterCard(characterCard)) {
        Alert.alert('Invalid Character Card', 'The character card data is incomplete or invalid.');
        return;
      }

      // Import character
      const importedCharacter = await CharacterStorageService.importCharacterFromPNG(imageUri, characterCard);
      
      Alert.alert('Success', `Character "${importedCharacter.name}" imported successfully!`);
      await loadCharacters();
      
    } catch (error) {
      console.error('Error importing character:', error);
      Alert.alert('Error', 'Failed to import character card');
    } finally {
      setImporting(false);
    }
  };

  const deleteCharacter = async (character: StoredCharacter) => {
    Alert.alert(
      'Delete Character',
      `Are you sure you want to delete "${character.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CharacterStorageService.deleteCharacter(character.id);
              await loadCharacters();
              Alert.alert('Success', 'Character deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete character');
            }
          },
        },
      ]
    );
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
      <TouchableOpacity onPress={() => navigation.navigate('CharacterDetail', { characterId: item.id })}>
        <View style={styles.cardContent}>
          {item.avatar ? (
            <Image 
              source={item.avatar === 'default_asset' 
                ? require('../../assets/default.png') 
                : { uri: item.avatar }} 
              style={styles.avatar} 
            />
          ) : (
            <Avatar.Icon size={60} icon="account" style={styles.avatarPlaceholder} />
          )}
          <View style={styles.characterInfo}>
            <Title style={styles.characterName}>{item.name}</Title>
            <Paragraph style={styles.characterDescription} numberOfLines={2}>
              {item.card.data.description}
            </Paragraph>
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
        <View style={styles.headerActions}>
          <IconButton
            icon="upload"
            size={24}
            onPress={importCharacterCard}
            disabled={importing}
          />
          <IconButton
            icon="plus"
            size={24}
            onPress={createNewCharacter}
          />
        </View>
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
        <View style={styles.contentContainer}>
          {/* Search Bar */}
          <TextInput
            label="Search characters"
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
          />

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Paragraph style={styles.filterTitle}>Filter by tags:</Paragraph>
                {selectedTags.length > 0 && (
                  <Button mode="text" onPress={clearFilters} compact>
                    Clear filters
                  </Button>
                )}
              </View>
              <View style={styles.tagsContainer}>
                {allTags.map((tag) => (
                  <Chip
                    key={tag}
                    mode={selectedTags.includes(tag) ? 'flat' : 'outlined'}
                    selected={selectedTags.includes(tag)}
                    onPress={() => toggleTag(tag)}
                    style={styles.tagChip}
                  >
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Results Info */}
          {(searchQuery || selectedTags.length > 0) && (
            <Paragraph style={styles.resultsInfo}>
              {filteredCharacters.length} of {characters.length} characters
            </Paragraph>
          )}

          {/* Character List */}
          <FlatList
            data={filteredCharacters}
            renderItem={renderCharacterCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Paragraph style={styles.noResultsText}>No characters match your search criteria</Paragraph>
                <Button mode="text" onPress={clearFilters} style={styles.clearFiltersButton}>
                  Clear filters
                </Button>
              </View>
            }
          />
        </View>
      )}
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
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
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
  avatarPlaceholder: {
    backgroundColor: '#ccc',
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
  },
  contentContainer: {
    flex: 1,
  },
  searchInput: {
    margin: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  resultsInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: '#666',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  clearFiltersButton: {
    marginTop: 8,
  },
});