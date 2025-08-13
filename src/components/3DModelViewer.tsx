import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder 3D Model Viewer component
// This is a temporary placeholder until 3D functionality is implemented
const ThreeDModelViewer: React.FC<{
  modelUrl?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}> = ({ modelUrl, width = 300, height = 300, onLoad, onError }) => {
  React.useEffect(() => {
    // Simulate loading state and then call onError since this is a placeholder
    const timer = setTimeout(() => {
      if (onError) {
        onError(new Error('3D Model Viewer not yet implemented'));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onError]);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderTitle}>3D Model Viewer</Text>
        <Text style={styles.placeholderText}>
          3D model viewing functionality is coming soon.
        </Text>
        {modelUrl && (
          <Text style={styles.modelUrl} numberOfLines={1}>
            Model: {modelUrl}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  modelUrl: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default ThreeDModelViewer;
