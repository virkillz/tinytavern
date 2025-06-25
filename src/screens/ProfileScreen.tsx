import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  IconButton,
  Avatar,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { StorageService } from '../utils/storage';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

interface UserProfile {
  name: string;
  avatar?: string;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>({ name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await StorageService.getUserProfile();
      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setProfile(prev => ({
          ...prev,
          avatar: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('Error picking avatar:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveProfile = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await StorageService.saveUserProfile(profile);
      Alert.alert('Success', 'Profile saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.headerTitle}>Profile</Title>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
                {profile.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                ) : (
                  <Avatar.Icon size={100} icon="account" style={styles.avatarPlaceholder} />
                )}
                <View style={styles.avatarOverlay}>
                  <IconButton icon="camera" size={24} iconColor="#fff" />
                </View>
              </TouchableOpacity>
              <Paragraph style={styles.avatarHint}>
                Tap to change profile picture
              </Paragraph>
            </View>

            <TextInput
              label="Your Name"
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              mode="outlined"
              style={styles.input}
              placeholder="Enter your name"
            />

            <Button
              mode="contained"
              onPress={saveProfile}
              loading={loading}
              disabled={loading || !profile.name.trim()}
              style={styles.saveButton}
            >
              Save Profile
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: BookColors.surface,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: BookColors.primaryLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 48,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginTop: 20,
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 5,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    elevation: 3,
    borderWidth: 3,
    borderColor: BookColors.primaryLight,
  },
  avatarPlaceholder: {
    backgroundColor: BookColors.primaryLight,
    elevation: 3,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: BookColors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 2,
    borderColor: BookColors.surface,
  },
  avatarHint: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 24,
    backgroundColor: BookColors.surface,
  },
  saveButton: {
    paddingVertical: 8,
    backgroundColor: BookColors.primary,
    borderRadius: 12,
    elevation: 3,
  },
});