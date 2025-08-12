import { config } from '../config/environment';
import RealApi from './api';
import MockApi from './mockApi';

const SelectedApi = config.USE_MOCK_API ? MockApi : RealApi;
export default SelectedApi;

// Re-export any commonly used types if needed
// Currently both services have the same interface, so no additional types needed
