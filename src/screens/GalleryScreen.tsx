import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  IconButton,
  Card,
  FAB,
  ActivityIndicator,
  Menu,
} from 'react-native-paper';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { ImageStorageService } from '../services/imageStorage';
import ImageGenerationService from '../services/imageGeneration';
import { GeneratedImage } from '../types';
import { BookColors, BookTypography } from '../styles/theme';
import { ImageViewerModal } from '../components/ImageViewerModal';

interface Props {
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');
const imageSize = (screenWidth - 60) / 2; // 2 columns with padding

export const GalleryScreen: React.FC<Props> = ({ navigation }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageMenuVisible, setImageMenuVisible] = useState<string | null>(null);
  const [isImageGenConfigured, setIsImageGenConfigured] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadImages();
      checkImageGenConfiguration();
    }, [])
  );

  const checkImageGenConfiguration = async () => {
    try {
      const configured = await ImageGenerationService.isConfigured();
      setIsImageGenConfigured(configured);
    } catch (error) {
      console.error('Error checking image generator configuration:', error);
      setIsImageGenConfigured(false);
    }
  };

  const loadImages = async () => {
    try {
      setLoading(true);
      const savedImages = await ImageStorageService.getAllImages();
      setImages(savedImages);
    } catch (error) {
      console.error('Error loading images:', error);
      Alert.alert('Error', 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ImageStorageService.deleteImage(imageId);
              await loadImages(); // Refresh the list
              setImageMenuVisible(null); // Close menu
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required to save images.');
        return;
      }

      // Copy the image to a temporary location with a proper filename
      const filename = `ai_generated_${Date.now()}.png`;
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.copyAsync({
        from: image.uri,
        to: tempUri,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(tempUri);
      await MediaLibrary.createAlbumAsync('AI Generated Images', asset, false);
      
      setImageMenuVisible(null); // Close menu
      Alert.alert('Success', 'Image saved to your photo gallery!');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to save image to gallery');
    }
  };

  const shareImage = async (image: GeneratedImage) => {
    try {
      const result = await Share.share({
        url: image.uri,
        message: `AI Generated Image: ${image.prompt}`,
      });
      setImageMenuVisible(null); // Close menu
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const clearAllImages = async () => {
    Alert.alert(
      'Clear All Images',
      'Are you sure you want to delete all generated images? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await ImageStorageService.clearAllImages();
              await loadImages(); // Refresh the list
            } catch (error) {
              console.error('Error clearing images:', error);
              Alert.alert('Error', 'Failed to clear images');
            }
          },
        },
      ]
    );
  };

  const openImageViewer = (image: GeneratedImage) => {
    setSelectedImage(image);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImage(null);
  };

  const renderImageCard = ({ item }: { item: GeneratedImage }) => (
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={() => openImageViewer(item)}
    >
      <Card style={styles.imageCard}>
        <Image source={{ uri: item.uri }} style={styles.image} />
        <Card.Content style={styles.imageInfo}>
          <Paragraph style={styles.promptText} numberOfLines={2}>
            {item.prompt}
          </Paragraph>
          <View style={styles.imageMetadata}>
            <Paragraph style={styles.orientationText}>
              {item.orientation === 'vertical' ? '📱' : '🖥️'} {item.orientation}
            </Paragraph>
            <Paragraph style={styles.dateText}>
              {item.createdAt.toLocaleDateString()}
            </Paragraph>
          </View>
        </Card.Content>
        
        {/* Image Menu */}
        <View style={styles.imageMenuContainer}>
          <Menu
            visible={imageMenuVisible === item.id}
            onDismiss={() => setImageMenuVisible(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                iconColor={BookColors.onSurface}
                onPress={() => setImageMenuVisible(item.id)}
                style={styles.imageMenuButton}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setImageMenuVisible(null);
                downloadImage(item);
              }}
              title="Download"
              leadingIcon="download"
            />
            <Menu.Item
              onPress={() => {
                setImageMenuVisible(null);
                shareImage(item);
              }}
              title="Share"
              leadingIcon="share"
            />
            <Menu.Item
              onPress={() => {
                deleteImage(item.id);
              }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (!isImageGenConfigured) {
      return (
        <View style={styles.emptyContainer}>
          <Card style={[styles.emptyCard, styles.warningCard]}>
            <Card.Content style={styles.emptyContent}>
              <IconButton
                icon="alert-circle"
                size={64}
                iconColor={BookColors.warning}
                style={styles.emptyIcon}
              />
              <Title style={styles.warningTitle}>Image Generator Not Configured</Title>
              <Paragraph style={styles.warningText}>
                To use AI image generation, please configure your image generator service in Settings.
              </Paragraph>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Settings')}
                style={styles.configureButton}
                icon="cog"
              >
                Configure Image Generator
              </Button>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <IconButton
              icon="image-plus"
              size={64}
              iconColor={BookColors.primaryLight}
              style={styles.emptyIcon}
            />
            <Title style={styles.emptyTitle}>No Images Yet</Title>
            <Paragraph style={styles.emptyText}>
              Generate your first AI image using the button below
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={BookColors.onSurface}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <Title style={styles.headerTitle}>Gallery</Title>
          </View>
          <View style={styles.headerActions}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  clearAllImages();
                }}
                title="Clear All Images"
                leadingIcon="delete-sweep"
              />
            </Menu>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading gallery...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={BookColors.onSurface}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <Title style={styles.headerTitle}>Gallery</Title>
        </View>
        <View style={styles.headerActions}>
          <Paragraph style={styles.imageCount}>
            {images.length} image{images.length !== 1 ? 's' : ''}
          </Paragraph>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                clearAllImages();
              }}
              title="Clear All Images"
              leadingIcon="delete-sweep"
              disabled={images.length === 0}
            />
          </Menu>
        </View>
      </View>

      {images.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.imagesList}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          if (isImageGenConfigured) {
            navigation.navigate('ImageGeneration');
          } else {
            Alert.alert(
              'Image Generator Not Configured',
              'Please configure your image generator service in Settings to use this feature.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Settings', onPress: () => navigation.navigate('Settings') }
              ]
            );
          }
        }}
        label="Generate"
      />

      <ImageViewerModal
        visible={imageViewerVisible}
        imageUri={selectedImage?.uri || null}
        title={selectedImage?.prompt}
        onClose={closeImageViewer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BookColors.surface,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: BookColors.primaryLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    margin: 0,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCount: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
  imagesList: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: imageSize,
    marginBottom: 16,
  },
  imageCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: imageSize * 1.2,
    resizeMode: 'cover',
  },
  imageInfo: {
    padding: 12,
  },
  promptText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
    lineHeight: 16,
    marginBottom: 8,
  },
  imageMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orientationText: {
    fontSize: 10,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
  dateText: {
    fontSize: 10,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
  imageMenuContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    elevation: 2,
  },
  imageMenuButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCard: {
    backgroundColor: BookColors.surfaceVariant,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: BookColors.primaryLight,
    borderStyle: 'dashed',
    width: '100%',
    maxWidth: 300,
  },
  warningCard: {
    backgroundColor: BookColors.parchment,
    borderColor: BookColors.warning,
    borderStyle: 'solid',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningTitle: {
    fontSize: 22,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.leather,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  configureButton: {
    backgroundColor: BookColors.warning,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: BookColors.primary,
    borderRadius: 28,
  },
});