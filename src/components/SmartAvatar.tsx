import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import SmartImage from './SmartImage';

interface SmartAvatarProps {
  imageUri?: string;
  name?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
}

const SmartAvatar: React.FC<SmartAvatarProps> = memo(({
  imageUri,
  name = '',
  size = 80,
  backgroundColor = '#007AFF',
  textColor = '#FFFFFF',
  style,
  textStyle,
  loadingColor = '#007AFF',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!imageUri);

  const getInitials = useCallback((fullName: string): string => {
    if (!fullName || fullName.trim() === '') return '?';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: backgroundColor,
    },
    style,
  ];

  const fontSize = size * 0.4; // 40% of container size

  const fallbackTextStyle = [
    styles.initialsText,
    {
      fontSize: fontSize,
      color: textColor,
    },
    textStyle,
  ];

  // Show image if available and not errored
  if (imageUri && !imageError) {
    return (
      <View style={containerStyle}>
        <SmartImage
          source={{ uri: imageUri }}
          style={StyleSheet.flatten([StyleSheet.absoluteFillObject, { borderRadius: size / 2 }])}
          resizeMode="cover"
          fallbackText={getInitials(name)}
          loadingColor={loadingColor}
          onLoad={handleImageLoad}
          onError={handleImageError}
          placeholderStyle={{
            backgroundColor: backgroundColor,
            borderRadius: size / 2,
          }}
          fallbackTextStyle={StyleSheet.flatten(fallbackTextStyle)}
        />
        {imageLoading && (
          <View style={[styles.loadingOverlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator size="small" color={loadingColor} />
          </View>
        )}
      </View>
    );
  }

  // Show initials fallback
  return (
    <View style={containerStyle}>
      <Text style={fallbackTextStyle}>
        {getInitials(name)}
      </Text>
    </View>
  );
});

SmartAvatar.displayName = 'SmartAvatar';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SmartAvatar;
