import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import Icon from "react-native-vector-icons/MaterialIcons";
// import ModelView from "react-native-3d-model-view"; // Temporarily disabled due to build issues
import ARService from "../services/arService";
import { ARCapabilities, ARSession, Product } from "../shared/types";
import { logger } from "../utils";

const { width, height } = Dimensions.get("window");

interface ARProductViewerProps {
  product: Product;
  visible: boolean;
  onClose: () => void;
  onError?: (error: string) => void;
}

const ARProductViewer: React.FC<ARProductViewerProps> = ({
  product,
  visible,
  onClose,
  onError,
}) => {
  const [arCapabilities, setArCapabilities] = useState<ARCapabilities | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "ar" | "web">("3d");
  const [currentSession, setCurrentSession] = useState<ARSession | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      initializeARViewer();
    } else if (currentSession) {
      endCurrentSession();
    }
  }, [visible]);

  const initializeARViewer = async () => {
    try {
      setLoading(true);

      // Check AR capabilities
      const capabilities = await ARService.checkARCapabilities();
      setArCapabilities(capabilities);

      // Determine initial view mode
      let initialMode: "3d" | "ar" | "web" = "3d";
      if (product.ar_model_url) {
        if (capabilities.isARSupported) {
          initialMode = "ar";
        } else if (capabilities.hasWebXR) {
          initialMode = "web";
        }
      }

      setViewMode(initialMode);

      // Start AR session
      const session = ARService.startARSession(
        product.id,
        initialMode === "ar" ? "ar" : "3d"
      );
      setCurrentSession(session);

      logger.info("AR viewer initialized", {
        productId: product.id,
        capabilities,
        initialMode,
        hasARModel: !!product.ar_model_url,
      });
    } catch (error) {
      logger.error("Failed to initialize AR viewer", error);
      onError?.("Failed to initialize AR viewer");
    } finally {
      setLoading(false);
    }
  };

  const endCurrentSession = () => {
    if (currentSession) {
      ARService.endARSession(currentSession.sessionId);
      setCurrentSession(null);
    }
  };

  const trackInteraction = (interactionType: string) => {
    if (currentSession) {
      ARService.trackARInteraction(currentSession.sessionId, interactionType);
    }
  };

  const handleViewModeChange = (newMode: "3d" | "ar" | "web") => {
    if (newMode === viewMode) return;

    trackInteraction(`switch_to_${newMode}`);
    setViewMode(newMode);

    // Update session view type
    if (currentSession && newMode !== viewMode) {
      endCurrentSession();
      const newSession = ARService.startARSession(
        product.id,
        newMode === "ar" ? "ar" : "3d"
      );
      setCurrentSession(newSession);
    }
  };

  const handleARQuickLook = () => {
    if (!product.ar_model_url || !arCapabilities?.hasARKit) {
      Alert.alert(
        "AR Not Available",
        "AR viewing is not supported on this device."
      );
      return;
    }

    trackInteraction("ar_quicklook_launch");

    if (Platform.OS === "ios") {
      const arUrl = ARService.generateARQuickLookURL(product.ar_model_url);
      Linking.openURL(arUrl).catch((error) => {
        logger.error("Failed to open AR Quick Look", error);
        Alert.alert("Error", "Failed to open AR viewer");
      });
    }
  };

  const handleAndroidARCore = () => {
    if (!product.ar_model_url || !arCapabilities?.hasARCore) {
      Alert.alert(
        "AR Not Available",
        "AR viewing is not supported on this device."
      );
      return;
    }

    trackInteraction("arcore_launch");

    // Android Scene Viewer intent
    const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
      product.ar_model_url
    )}&mode=ar_only`;

    Linking.openURL(sceneViewerUrl).catch((error) => {
      logger.error("Failed to open Scene Viewer", error);
      Alert.alert("Error", "Failed to open AR viewer");
    });
  };

  const renderControls = () => (
    <View style={styles.controls}>
      <View style={styles.controlsRow}>
        {/* 3D View Button */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            viewMode === "3d" && styles.controlButtonActive,
          ]}
          onPress={() => handleViewModeChange("3d")}
        >
          <Icon
            name="3d-rotation"
            size={20}
            color={viewMode === "3d" ? "#FFFFFF" : "#007AFF"}
          />
          <Text
            style={[
              styles.controlButtonText,
              viewMode === "3d" && styles.controlButtonTextActive,
            ]}
          >
            3D
          </Text>
        </TouchableOpacity>

        {/* AR View Button */}
        {product.ar_model_url && arCapabilities?.isARSupported && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              viewMode === "ar" && styles.controlButtonActive,
            ]}
            onPress={() => {
              if (Platform.OS === "ios") {
                handleARQuickLook();
              } else {
                handleAndroidARCore();
              }
            }}
          >
            <Icon
              name="view-in-ar"
              size={20}
              color={viewMode === "ar" ? "#FFFFFF" : "#007AFF"}
            />
            <Text
              style={[
                styles.controlButtonText,
                viewMode === "ar" && styles.controlButtonTextActive,
              ]}
            >
              AR
            </Text>
          </TouchableOpacity>
        )}

        {/* Web View Button (Fallback) */}
        {product.ar_model_url && arCapabilities?.hasWebXR && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              viewMode === "web" && styles.controlButtonActive,
            ]}
            onPress={() => handleViewModeChange("web")}
          >
            <Icon
              name="public"
              size={20}
              color={viewMode === "web" ? "#FFFFFF" : "#007AFF"}
            />
            <Text
              style={[
                styles.controlButtonText,
                viewMode === "web" && styles.controlButtonTextActive,
              ]}
            >
              Web
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderViewer = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading 3D viewer...</Text>
        </View>
      );
    }

    if (!product.ar_model_url) {
      return (
        <View style={styles.noModelContainer}>
          <Icon name="3d-rotation" size={80} color="#CCC" />
          <Text style={styles.noModelText}>3D model not available</Text>
          <Text style={styles.noModelSubtext}>
            This product doesn't have a 3D model for AR viewing
          </Text>
        </View>
      );
    }

    switch (viewMode) {
      case "3d":
        return (
          <View style={styles.modelViewContainer}>
            {/* 3D Model View temporarily disabled due to build issues */}
            <View style={[styles.modelView, { justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="3d-rotation" size={80} color="#CCC" />
              <Text style={{ marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center' }}>
                3D Model View Coming Soon
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: '#888', textAlign: 'center' }}>
                3D model viewing will be available in a future update
              </Text>
            </View>
            <View style={styles.interactionHint}>
              <Icon name="360" size={16} color="#666" />
              <Text style={styles.interactionHintText}>
                3D viewing temporarily unavailable
              </Text>
            </View>
          </View>
        );

      case "web":
        const webXRUrl = ARService.generateWebXRURL(
          product.ar_model_url,
          product.name
        );
        return (
          <WebView
            ref={webViewRef}
            source={{ uri: webXRUrl }}
            style={styles.webView}
            onLoadStart={() => trackInteraction("webxr_load_start")}
            onLoadEnd={() => trackInteraction("webxr_load_complete")}
            onError={(error) => {
              logger.error("WebXR load error", error);
              onError?.("Failed to load web viewer");
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
          />
        );

      default:
        return renderViewer(); // Fallback to 3D view
    }
  };

  const handleClose = () => {
    endCurrentSession();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.productName} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.viewModeText}>
              {viewMode === "ar"
                ? "AR View"
                : viewMode === "3d"
                ? "3D View"
                : "Web View"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => trackInteraction("share_3d")}
              style={styles.headerButton}
            >
              <Icon name="share" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Viewer */}
        <View style={styles.viewerContainer}>{renderViewer()}</View>

        {/* Controls */}
        {renderControls()}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Icon name="info-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {arCapabilities?.isARSupported
                ? "AR supported on this device"
                : "AR not available - using 3D viewer"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  viewModeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  noModelContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noModelText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  noModelSubtext: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  modelViewContainer: {
    flex: 1,
    position: "relative",
  },
  modelView: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  interactionHint: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interactionHintText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 8,
  },
  controls: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#FFFFFF",
  },
  controlButtonActive: {
    backgroundColor: "#007AFF",
  },
  controlButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  controlButtonTextActive: {
    color: "#FFFFFF",
  },
  info: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
});

export default ARProductViewer;
