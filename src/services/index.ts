import { config } from "../config/environment";
import RealApi from "./api";
import MockApi from "./mockApi";

const SelectedApi = config.USE_MOCK_API ? MockApi : RealApi;
export default SelectedApi;

// Export notification and deep linking services
export { default as firebaseService } from "./firebase";
// export { default as notificationService } from "./notificationService"; // Temporarily disabled due to Notifee build issues
export { default as deepLinkService } from "./deepLinkService";
export { default as navigationService } from "./navigationService";
export { default as appInitService } from "./appInitService";
export { default as api } from "./api";
export { default as mockApi } from "./mockApi";
export { default as i18n } from "./i18n";
export { default as arService } from "./arService";

// Re-export any commonly used types if needed
// Currently both services have the same interface, so no additional types needed
