import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookColors, BookTypography } from '../styles/theme';

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUri,
  onClose,
  title,
}) => {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Image'}
            </Text>
            <IconButton
              icon="close"
              size={24}
              iconColor={BookColors.onPrimary}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>
        </SafeAreaView>

        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={1}
          onPress={onClose}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']}>
          <View style={styles.footer}>
            <Text style={styles.instruction}>
              Tap anywhere to close
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  safeArea: {
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: BookTypography.serif,
    fontWeight: '600',
    color: BookColors.onPrimary,
    marginRight: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: screenWidth - 40,
    height: screenHeight - 200, // Account for header and footer
    maxWidth: screenWidth - 40,
    maxHeight: screenHeight - 200,
  },
  bottomSafeArea: {
    zIndex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  instruction: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
});