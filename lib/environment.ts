/**
 * Environment detection utilities
 */

export const isProduction = (): boolean => {
  if (typeof window === 'undefined') {
    // Server-side: check NODE_ENV or other server env vars
    return process.env.NODE_ENV === 'production';
  }
  
  // Client-side: check the hostname
  return window.location.hostname === 'app.trezalabs.com';
};

export const isDevelopment = (): boolean => {
  return !isProduction();
};

export const getEnvironmentName = (): string => {
  return isProduction() ? 'production' : 'development';
};
