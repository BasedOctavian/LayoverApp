import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';

// Types for external route handling
export interface ExternalRouteParams {
  type: 'profile';
  userId: string;
}

export interface ParsedUrl {
  path: string;
  params: Record<string, string>;
}

/**
 * Master handler for external routes
 * Currently supports user profile sharing
 */
export class ExternalRoutesHandler {
  private static instance: ExternalRoutesHandler;
  private isInitialized = false;
  private subscription: any = null;

  private constructor() {}

  public static getInstance(): ExternalRoutesHandler {
    if (!ExternalRoutesHandler.instance) {
      ExternalRoutesHandler.instance = new ExternalRoutesHandler();
    }
    return ExternalRoutesHandler.instance;
  }

  /**
   * Initialize the external routes handler
   * Sets up deep linking and URL handling
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Handle initial URL if app was opened via deep link
      // Wrap in try-catch to handle cases where getInitialURL is not available
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('Found initial URL:', initialUrl);
          this.handleUrl(initialUrl);
        }
      } catch (initialUrlError) {
        console.warn('Could not get initial URL:', initialUrlError);
        // Continue with setup even if initial URL fails
      }

      // Set up listener for when app is opened via deep link while running
      try {
        this.subscription = Linking.addEventListener('url', (event) => {
          console.log('Received URL event:', event.url);
          this.handleUrl(event.url);
        });
      } catch (listenerError) {
        console.warn('Could not set up URL listener:', listenerError);
        // Continue even if listener setup fails
      }

      this.isInitialized = true;
      console.log('External routes handler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize external routes handler:', error);
      // Don't throw the error, just log it and continue
    }
  }

  /**
   * Handle incoming URLs and route to appropriate screens
   */
  private handleUrl(url: string): void {
    try {
      console.log('Handling external URL:', url);
      
      const parsedUrl = this.parseUrl(url);
      if (!parsedUrl) {
        console.warn('Could not parse URL:', url);
        return;
      }

      const routeParams = this.extractRouteParams(parsedUrl);
      if (!routeParams) {
        console.warn('Could not extract route params from URL:', url);
        return;
      }

      this.navigateToRoute(routeParams);
    } catch (error) {
      console.error('Error handling external URL:', error);
    }
  }

  /**
   * Parse URL and extract path and query parameters
   */
  private parseUrl(url: string): ParsedUrl | null {
    try {
      const parsed = ExpoLinking.parse(url);
      
      if (!parsed.path) {
        return null;
      }

      return {
        path: parsed.path,
        params: parsed.queryParams || {}
      };
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  /**
   * Extract route parameters from parsed URL
   */
  private extractRouteParams(parsedUrl: ParsedUrl): ExternalRouteParams | null {
    const { path, params } = parsedUrl;

    // Handle profile routes
    if (path.startsWith('/profile/') || path.startsWith('profile/')) {
      const pathParts = path.split('/');
      const userId = pathParts[pathParts.length - 1];
      
      if (userId && userId !== 'profile') {
        return {
          type: 'profile',
          userId: userId
        };
      }
    }

    // Handle query parameter based profile routes
    if (params.userId) {
      return {
        type: 'profile',
        userId: params.userId
      };
    }

    return null;
  }

  /**
   * Navigate to the appropriate route based on extracted parameters
   */
  private navigateToRoute(routeParams: ExternalRouteParams): void {
    try {
      switch (routeParams.type) {
        case 'profile':
          this.navigateToProfile(routeParams.userId);
          break;
        default:
          console.warn('Unknown route type:', routeParams.type);
      }
    } catch (error) {
      console.error('Error navigating to route:', error);
    }
  }

  /**
   * Navigate to user profile
   */
  private navigateToProfile(userId: string): void {
    try {
      console.log('Navigating to profile:', userId);
      router.push(`/profile/${userId}`);
    } catch (error) {
      console.error('Error navigating to profile:', error);
    }
  }

  /**
   * Generate a shareable URL for a user profile
   */
  public generateProfileShareUrl(userId: string): string {
    try {
      // Use the app scheme for deep linking
      const scheme = 'mylayover';
      return `${scheme}://profile/${userId}`;
    } catch (error) {
      console.error('Error generating profile share URL:', error);
      return '';
    }
  }

  /**
   * Generate a web-compatible shareable URL for a user profile
   * This can be used for sharing on platforms that don't support deep links
   */
  public generateWebProfileShareUrl(userId: string): string {
    try {
      // You can replace this with your actual web domain when you have one
      const webDomain = 'https://wingman.app'; // Replace with actual domain
      return `${webDomain}/profile/${userId}`;
    } catch (error) {
      console.error('Error generating web profile share URL:', error);
      return '';
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    try {
      if (this.subscription && typeof this.subscription.remove === 'function') {
        this.subscription.remove();
        this.subscription = null;
      }
    } catch (error) {
      console.warn('Error cleaning up external routes subscription:', error);
    }
    this.isInitialized = false;
  }

  /**
   * Development utility: Test external route handling
   * Only available in development mode
   */
  public testRoute(userId: string): void {
    if (__DEV__) {
      console.log('Testing external route for user:', userId);
      this.navigateToProfile(userId);
    }
  }
}

// Export singleton instance
export const externalRoutesHandler = ExternalRoutesHandler.getInstance();

// Export utility functions for easy access
export const generateProfileShareUrl = (userId: string): string => {
  return externalRoutesHandler.generateProfileShareUrl(userId);
};

export const generateWebProfileShareUrl = (userId: string): string => {
  return externalRoutesHandler.generateWebProfileShareUrl(userId);
};

export const initializeExternalRoutes = async (): Promise<void> => {
  return externalRoutesHandler.initialize();
};

// Development utility for testing
export const testExternalRoute = (userId: string): void => {
  if (__DEV__) {
    externalRoutesHandler.testRoute(userId);
  }
}; 