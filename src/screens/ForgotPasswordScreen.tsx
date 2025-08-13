import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ApiService from "../services";
import { logger, ErrorToast } from "../utils";

const ForgotPasswordScreen = ({ navigation }: any): React.JSX.Element => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSendResetEmail = async (): Promise<void> => {
    // Clear previous errors
    setEmailError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      // For now, simulate API call since mock API doesn't have password reset
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual API call when available
      // await ApiService.sendPasswordResetEmail(email.toLowerCase().trim());

      setEmailSent(true);

      Alert.alert(
        "Email Sent!",
        `A password reset link has been sent to ${email}. Please check your email and follow the instructions to reset your password.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to login after showing success message
              setTimeout(() => {
                navigation.navigate("Login");
              }, 1000);
            },
          },
        ]
      );
    } catch (error: any) {
      logger.error("Password reset error", error, {
        component: "ForgotPasswordScreen",
        action: "handleSendResetEmail",
        metadata: {
          email: email.toLowerCase().trim(),
        },
      });

      if (
        error.message?.includes("not found") ||
        error.message?.includes("does not exist")
      ) {
        setEmailError("No account found with this email address");
      } else {
        ErrorToast.show({
          title: "Error",
          message:
            error.message || "Failed to send reset email. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (): Promise<void> => {
    setEmailSent(false);
    await handleSendResetEmail();
  };

  const navigateToLogin = (): void => {
    navigation.navigate("Login");
  };

  const navigateToSignup = (): void => {
    navigation.navigate("Signup");
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Icon name="mark-email-read" size={80} color="#4CAF50" />
          </View>

          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to:
          </Text>
          <Text style={styles.emailText}>{email}</Text>

          <Text style={styles.instructionText}>
            Click the link in the email to reset your password. If you don't see
            the email, check your spam folder.
          </Text>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.resendButtonText}>Resend Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={navigateToLogin}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Icon name="lock-reset" size={60} color="#007AFF" />
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email address and we'll send you a link to
              reset your password.
            </Text>
          </View>
        </View>

        {/* Email Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View
              style={[styles.inputWrapper, emailError && styles.inputError]}
            >
              <Icon
                name="email"
                size={20}
                color={emailError ? "#FF6B6B" : "#666"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                placeholderTextColor="#999"
              />
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.disabledButton]}
            onPress={handleSendResetEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="send" size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need more help?</Text>
          <Text style={styles.helpText}>
            If you're having trouble accessing your account, you can create a
            new one or contact our support team.
          </Text>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={navigateToSignup}
            disabled={loading}
          >
            <Text style={styles.helpButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Remember your password? </Text>
          <TouchableOpacity onPress={navigateToLogin} disabled={loading}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#FF6B6B",
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#B0B0B0",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  helpSection: {
    backgroundColor: "#F0F8FF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  helpButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "#666",
    fontSize: 16,
  },
  loginLink: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  resendButton: {
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  resendButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backToLoginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToLoginText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },
});

export default ForgotPasswordScreen;
