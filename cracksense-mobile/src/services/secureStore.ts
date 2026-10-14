import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS_TOKEN = 'cracksense_access_token';
const KEY_USER_PROFILE = 'cracksense_user_profile';
const KEY_REFRESH_TOKEN = 'cracksense_refresh_token';

// In-memory fallback if SecureStore is restricted
const memoryFallback = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
      }
    } else {
      memoryFallback.set(KEY_ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        memoryFallback.set(KEY_REFRESH_TOKEN, refreshToken);
      }
    }
  } catch (error) {
    console.warn('SecureStore save notice (using memory fallback):', error);
    memoryFallback.set(KEY_ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      memoryFallback.set(KEY_REFRESH_TOKEN, refreshToken);
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      const token = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
      return token || memoryFallback.get(KEY_ACCESS_TOKEN) || null;
    }
    return memoryFallback.get(KEY_ACCESS_TOKEN) || null;
  } catch (error) {
    console.warn('SecureStore retrieve notice (using memory fallback):', error);
    return memoryFallback.get(KEY_ACCESS_TOKEN) || null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      const token = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
      return token || memoryFallback.get(KEY_REFRESH_TOKEN) || null;
    }
    return memoryFallback.get(KEY_REFRESH_TOKEN) || null;
  } catch (error) {
    console.warn('SecureStore refresh retrieve notice:', error);
    return memoryFallback.get(KEY_REFRESH_TOKEN) || null;
  }
}

export async function saveStoredUserProfile(profile: object): Promise<void> {
  try {
    const serialized = JSON.stringify(profile);
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(KEY_USER_PROFILE, serialized);
    } else {
      memoryFallback.set(KEY_USER_PROFILE, serialized);
    }
  } catch (error) {
    console.warn('SecureStore user profile save notice:', error);
    try {
      memoryFallback.set(KEY_USER_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }
}

export async function getStoredUserProfile<T>(): Promise<T | null> {
  try {
    let raw: string | null = null;
    const available = await isSecureStoreAvailable();
    if (available) {
      raw = await SecureStore.getItemAsync(KEY_USER_PROFILE);
    }
    if (!raw) {
      raw = memoryFallback.get(KEY_USER_PROFILE) || null;
    }
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('SecureStore get profile notice:', error);
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    memoryFallback.clear();
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN).catch(() => { });
      await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN).catch(() => { });
      await SecureStore.deleteItemAsync(KEY_USER_PROFILE).catch(() => { });
    }
  } catch (error) {
    console.warn('Failed to clear secure auth session:', error);
  }
}
