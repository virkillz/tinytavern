import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeneratedImage, ImageOrientation } from '../types';

export class ImageStorageService {
  private static readonly STORAGE_KEY = 'generated_images';
  private static readonly IMAGES_DIR = `${FileSystem.documentDirectory}generated_images/`;

  static async initializeImageDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing image directory:', error);
      throw new Error('Failed to initialize image directory');
    }
  }

  static async saveImage(
    base64Image: string,
    prompt: string,
    orientation: ImageOrientation
  ): Promise<GeneratedImage> {
    try {
      await this.initializeImageDirectory();

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `img_${timestamp}.png`;
      const filePath = `${this.IMAGES_DIR}${filename}`;

      // Convert base64 to file
      await FileSystem.writeAsStringAsync(filePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create image metadata
      const imageData: GeneratedImage = {
        id: timestamp.toString(),
        filename,
        prompt,
        orientation,
        uri: filePath,
        createdAt: new Date(),
      };

      // Save metadata to storage
      await this.saveImageMetadata(imageData);

      return imageData;
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error('Failed to save image');
    }
  }

  static async saveImageMetadata(imageData: GeneratedImage): Promise<void> {
    try {
      const existingImages = await this.getAllImages();
      const updatedImages = [imageData, ...existingImages];
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedImages)
      );
    } catch (error) {
      console.error('Error saving image metadata:', error);
      throw new Error('Failed to save image metadata');
    }
  }

  static async getAllImages(): Promise<GeneratedImage[]> {
    try {
      const imagesJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!imagesJson) {
        return [];
      }

      const images: GeneratedImage[] = JSON.parse(imagesJson);
      
      // Convert date strings back to Date objects
      return images.map(image => ({
        ...image,
        createdAt: new Date(image.createdAt),
      }));
    } catch (error) {
      console.error('Error getting images:', error);
      return [];
    }
  }

  static async deleteImage(imageId: string): Promise<void> {
    try {
      const images = await this.getAllImages();
      const imageToDelete = images.find(img => img.id === imageId);
      
      if (imageToDelete) {
        // Delete file from filesystem
        const fileInfo = await FileSystem.getInfoAsync(imageToDelete.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(imageToDelete.uri);
        }

        // Remove from metadata
        const updatedImages = images.filter(img => img.id !== imageId);
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(updatedImages)
        );
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  static async getImageById(imageId: string): Promise<GeneratedImage | null> {
    try {
      const images = await this.getAllImages();
      return images.find(img => img.id === imageId) || null;
    } catch (error) {
      console.error('Error getting image by ID:', error);
      return null;
    }
  }

  static async clearAllImages(): Promise<void> {
    try {
      // Delete all files in the directory
      const dirInfo = await FileSystem.getInfoAsync(this.IMAGES_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.IMAGES_DIR);
        await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, { intermediates: true });
      }

      // Clear metadata
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing all images:', error);
      throw new Error('Failed to clear all images');
    }
  }

  static async getImageCount(): Promise<number> {
    try {
      const images = await this.getAllImages();
      return images.length;
    } catch (error) {
      console.error('Error getting image count:', error);
      return 0;
    }
  }
}