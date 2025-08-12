import Toast from 'react-native-toast-message';

export interface ApiError {
  title: string;
  message: string;
}

/**
 * ErrorToast utility for displaying user-friendly error messages
 * using react-native-toast-message
 */
export class ErrorToast {
  /**
   * Show an error toast with title and message
   */
  static show(error: ApiError): void {
    Toast.show({
      type: 'error',
      text1: error.title,
      text2: error.message,
      visibilityTime: 4000,
      autoHide: true,
      position: 'top',
    });
  }

  /**
   * Show a generic error toast
   */
  static showGeneric(message: string = 'An unexpected error occurred'): void {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message,
      visibilityTime: 4000,
      autoHide: true,
      position: 'top',
    });
  }

  /**
   * Show a network error toast
   */
  static showNetwork(): void {
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Please check your internet connection and try again',
      visibilityTime: 4000,
      autoHide: true,
      position: 'top',
    });
  }

  /**
   * Show a success toast (for positive feedback)
   */
  static showSuccess(title: string, message?: string): void {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: 3000,
      autoHide: true,
      position: 'top',
    });
  }

  /**
   * Show an info toast
   */
  static showInfo(title: string, message?: string): void {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      visibilityTime: 3000,
      autoHide: true,
      position: 'top',
    });
  }

  /**
   * Hide all toasts
   */
  static hide(): void {
    Toast.hide();
  }
}

export default ErrorToast;
