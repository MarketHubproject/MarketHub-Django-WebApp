import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/api';

interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

const SignupScreen = ({ navigation }: any): React.JSX.Element => {
  const [form, setForm] = useState<SignupForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<SignupForm>>({});

  const validateForm = (): boolean => {
    const errors: Partial<SignupForm> = {};

    // First name validation
    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (form.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (form.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation (optional)
    if (form.phone && form.phone.trim()) {
      if (!/^\+?[\d\s-()]{10,}$/.test(form.phone.trim())) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (): Promise<void> => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        phone: form.phone?.trim() || undefined,
      };

      await ApiService.signup(userData);
      
      Alert.alert(
        'Success!', 
        'Your account has been created successfully. You are now logged in.',
        [
          {
            text: 'Get Started',
            onPress: () => {
              // Navigation will be handled automatically by the main App component
              // when it detects the authentication state change
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific error messages
      if (error.message?.includes('email')) {
        setFieldErrors({ email: 'This email is already registered' });
        Alert.alert('Email Already Exists', 'An account with this email already exists. Please try logging in instead.');
      } else if (error.message?.includes('password')) {
        setFieldErrors({ password: error.message });
        Alert.alert('Password Error', error.message);
      } else {
        Alert.alert('Signup Failed', error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof SignupForm, value: string): void => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navigateToLogin = (): void => {
    navigation.navigate('Login');
  };

  const renderInputField = (
    field: keyof SignupForm,
    placeholder: string,
    icon: string,
    options?: {
      secureTextEntry?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      showPasswordToggle?: boolean;
      showPassword?: boolean;
      onTogglePassword?: () => void;
    }
  ): React.JSX.Element => {
    const hasError = !!fieldErrors[field];
    
    return (
      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, hasError && styles.inputError]}>
          <Icon name={icon} size={20} color={hasError ? "#FF6B6B" : "#666"} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={form[field]}
            onChangeText={(value) => updateField(field, value)}
            secureTextEntry={options?.secureTextEntry}
            keyboardType={options?.keyboardType || 'default'}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            autoCorrect={false}
            editable={!loading}
            placeholderTextColor="#999"
          />
          {options?.showPasswordToggle && (
            <TouchableOpacity 
              onPress={options.onTogglePassword}
              style={styles.passwordToggle}
            >
              <Icon 
                name={options.showPassword ? 'visibility-off' : 'visibility'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && (
          <Text style={styles.errorText}>{fieldErrors[field]}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={navigateToLogin}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join MarketHub and start shopping</Text>
        </View>

        {/* Signup Form */}
        <View style={styles.form}>
          {/* Name Fields */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              {renderInputField('firstName', 'First Name', 'person-outline')}
            </View>
            <View style={styles.nameField}>
              {renderInputField('lastName', 'Last Name', 'person-outline')}
            </View>
          </View>

          {/* Email Field */}
          {renderInputField('email', 'Email Address', 'email', {
            keyboardType: 'email-address'
          })}

          {/* Phone Field (Optional) */}
          {renderInputField('phone', 'Phone Number (Optional)', 'phone', {
            keyboardType: 'phone-pad'
          })}

          {/* Password Fields */}
          {renderInputField('password', 'Password', 'lock', {
            secureTextEntry: !showPassword,
            showPasswordToggle: true,
            showPassword: showPassword,
            onTogglePassword: () => setShowPassword(!showPassword)
          })}

          {renderInputField('confirmPassword', 'Confirm Password', 'lock', {
            secureTextEntry: !showConfirmPassword,
            showPasswordToggle: true,
            showPassword: showConfirmPassword,
            onTogglePassword: () => setShowConfirmPassword(!showConfirmPassword)
          })}

          {/* Password Requirements */}
          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementText}>• At least 8 characters</Text>
            <Text style={styles.requirementText}>• Include uppercase and lowercase letters</Text>
            <Text style={styles.requirementText}>• Include at least one number</Text>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity 
            onPress={navigateToLogin}
            disabled={loading}
          >
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
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameField: {
    flex: 1,
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 5,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
  },
  passwordRequirements: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  signupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#007AFF',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignupScreen;
