import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';

// Types for external route handling
export type ExternalRouteParams =
  | { type: 'profile'; userId: string }
  | { type: 'event'; eventId: string }
  | { type: 'ping'; pingId: string }
  | { type: 'group'; groupId: string };

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

    // Handle event routes
    if (path.startsWith('/event/') || path.startsWith('event/')) {
      const pathParts = path.split('/');
      const eventId = pathParts[pathParts.length - 1];
      
      if (eventId && eventId !== 'event' && eventId !== 'eventChat') {
        return {
          type: 'event',
          eventId: eventId
        };
      }
    }

    // Handle ping routes
    if (path.startsWith('/ping/') || path.startsWith('ping/')) {
      const pathParts = path.split('/');
      const pingId = pathParts[pathParts.length - 1];
      
      if (pingId && pingId !== 'ping' && pingId !== 'pingChat') {
        return {
          type: 'ping',
          pingId: pingId
        };
      }
    }

    // Handle group routes
    if (path.startsWith('/group/') || path.startsWith('group/')) {
      const pathParts = path.split('/');
      const groupId = pathParts[pathParts.length - 1];
      
      if (groupId && groupId !== 'group' && groupId !== 'chat' && groupId !== 'create' && groupId !== 'explore' && groupId !== 'index') {
        return {
          type: 'group',
          groupId: groupId
        };
      }
    }

    // Handle query parameter based routes
    if (params.userId) {
      return {
        type: 'profile',
        userId: params.userId
      };
    }
    
    if (params.eventId) {
      return {
        type: 'event',
        eventId: params.eventId
      };
    }
    
    if (params.pingId) {
      return {
        type: 'ping',
        pingId: params.pingId
      };
    }
    
    if (params.groupId) {
      return {
        type: 'group',
        groupId: params.groupId
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
        case 'event':
          this.navigateToEvent(routeParams.eventId);
          break;
        case 'ping':
          this.navigateToPing(routeParams.pingId);
          break;
        case 'group':
          this.navigateToGroup(routeParams.groupId);
          break;
        default:
          console.warn('Unknown route type');
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
   * Navigate to event
   */
  private navigateToEvent(eventId: string): void {
    try {
      console.log('Navigating to event:', eventId);
      router.push(`/event/${eventId}`);
    } catch (error) {
      console.error('Error navigating to event:', error);
    }
  }

  /**
   * Navigate to ping
   */
  private navigateToPing(pingId: string): void {
    try {
      console.log('Navigating to ping:', pingId);
      router.push(`/ping/${pingId}`);
    } catch (error) {
      console.error('Error navigating to ping:', error);
    }
  }

  /**
   * Navigate to group
   */
  private navigateToGroup(groupId: string): void {
    try {
      console.log('Navigating to group:', groupId);
      router.push(`/group/${groupId}`);
    } catch (error) {
      console.error('Error navigating to group:', error);
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
   * Generate a shareable URL for an event
   */
  public generateEventShareUrl(eventId: string): string {
    try {
      const scheme = 'mylayover';
      return `${scheme}://event/${eventId}`;
    } catch (error) {
      console.error('Error generating event share URL:', error);
      return '';
    }
  }

  /**
   * Generate a web-compatible shareable URL for an event
   */
  public generateWebEventShareUrl(eventId: string): string {
    try {
      const webDomain = 'https://wingman.app';
      return `${webDomain}/event/${eventId}`;
    } catch (error) {
      console.error('Error generating web event share URL:', error);
      return '';
    }
  }

  /**
   * Generate a shareable URL for a ping
   */
  public generatePingShareUrl(pingId: string): string {
    try {
      const scheme = 'mylayover';
      return `${scheme}://ping/${pingId}`;
    } catch (error) {
      console.error('Error generating ping share URL:', error);
      return '';
    }
  }

  /**
   * Generate a web-compatible shareable URL for a ping
   */
  public generateWebPingShareUrl(pingId: string): string {
    try {
      const webDomain = 'https://wingman.app';
      return `${webDomain}/ping/${pingId}`;
    } catch (error) {
      console.error('Error generating web ping share URL:', error);
      return '';
    }
  }

  /**
   * Generate a shareable URL for a group
   */
  public generateGroupShareUrl(groupId: string): string {
    try {
      const scheme = 'mylayover';
      return `${scheme}://group/${groupId}`;
    } catch (error) {
      console.error('Error generating group share URL:', error);
      return '';
    }
  }

  /**
   * Generate a web-compatible shareable URL for a group
   */
  public generateWebGroupShareUrl(groupId: string): string {
    try {
      const webDomain = 'https://wingman.app';
      return `${webDomain}/group/${groupId}`;
    } catch (error) {
      console.error('Error generating web group share URL:', error);
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

// Profile URLs
export const generateProfileShareUrl = (userId: string): string => {
  return externalRoutesHandler.generateProfileShareUrl(userId);
};

export const generateWebProfileShareUrl = (userId: string): string => {
  return externalRoutesHandler.generateWebProfileShareUrl(userId);
};

// Event URLs
export const generateEventShareUrl = (eventId: string): string => {
  return externalRoutesHandler.generateEventShareUrl(eventId);
};

export const generateWebEventShareUrl = (eventId: string): string => {
  return externalRoutesHandler.generateWebEventShareUrl(eventId);
};

// Ping URLs
export const generatePingShareUrl = (pingId: string): string => {
  return externalRoutesHandler.generatePingShareUrl(pingId);
};

export const generateWebPingShareUrl = (pingId: string): string => {
  return externalRoutesHandler.generateWebPingShareUrl(pingId);
};

// Group URLs
export const generateGroupShareUrl = (groupId: string): string => {
  return externalRoutesHandler.generateGroupShareUrl(groupId);
};

export const generateWebGroupShareUrl = (groupId: string): string => {
  return externalRoutesHandler.generateWebGroupShareUrl(groupId);
};

// Initialization
export const initializeExternalRoutes = async (): Promise<void> => {
  return externalRoutesHandler.initialize();
};

// Development utility for testing
export const testExternalRoute = (userId: string): void => {
  if (__DEV__) {
    externalRoutesHandler.testRoute(userId);
  }
}; 