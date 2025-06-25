import { ExternalRoutesHandler, generateProfileShareUrl, generateWebProfileShareUrl } from './externalRoutes';

// Test cases for external routes
export const testExternalRoutes = () => {
  console.log('Testing External Routes...');

  // Test URL generation
  const testUserId = 'test-user-123';
  
  console.log('Profile Share URL:', generateProfileShareUrl(testUserId));
  console.log('Web Profile Share URL:', generateWebProfileShareUrl(testUserId));

  // Test URL parsing (simulated)
  const testUrls = [
    'mylayover://profile/test-user-123',
    'mylayover://profile/another-user-456',
    'https://wingman.app/profile/test-user-123',
    'mylayover://profile/test-user-123?param=value',
  ];

  console.log('Test URLs:', testUrls);

  // Test handler instance
  const handler = ExternalRoutesHandler.getInstance();
  console.log('Handler instance created:', !!handler);

  return {
    testUserId,
    testUrls,
    handler
  };
};

// Example usage in development
if (__DEV__) {
  // Uncomment to run tests
  // testExternalRoutes();
} 