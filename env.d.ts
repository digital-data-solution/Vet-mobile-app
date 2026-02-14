declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_BACKEND_URL: string;
      EXPO_PUBLIC_DEBUG_MODE: string;
      EXPO_PUBLIC_API_TIMEOUT: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};