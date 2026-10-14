import * as FileSystem from 'expo-file-system/legacy';
import {
  EmergencyIncident,
  Inspection,
  UserProfile,
  UserRole
} from '../types/models';
import {
  clearAuthSession,
  getAccessToken,
  getStoredUserProfile,
  saveAuthTokens,
  saveStoredUserProfile
} from './secureStore';

const BASE_URL =
  process.env.EXPO_PUBLIC_INSFORGE_URL || 'https://749ge7kb.us-east.insforge.app';
const ANON_KEY =
  process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY || 'ik_4fbc67163fb91c2070969f7b51ce1aab';

let memoryAccessToken: string | null = null;

async function getAuthHeaders(includeAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'x-api-key': ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  if (includeAuth) {
    const token = memoryAccessToken || (await getAccessToken());
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * InsForge client compatible interface implemented with native React Native fetch REST calls
 */
export const insforge = {
  setAccessToken: (token: string | null) => {
    memoryAccessToken = token;
  },
  auth: {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/sessions?client_type=mobile`, {
          method: 'POST',
          headers: {
            'x-api-key': ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email.trim(),
            password: credentials.password
          })
        });

        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data?.message || data?.error || 'Login failed' } };
        }
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Network error' }
        };
      }
    },
    signUp: async (credentials: { email: string; password: string; name?: string }) => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/users?client_type=mobile`, {
          method: 'POST',
          headers: {
            'x-api-key': ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email.trim(),
            password: credentials.password,
            name: credentials.name?.trim()
          })
        });

        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data?.message || data?.error || 'Sign up failed' } };
        }
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Network error' }
        };
      }
    },
    signOut: async () => {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${BASE_URL}/api/auth/logout?client_type=mobile`, {
          method: 'POST',
          headers
        });
      } catch (err) {
        console.warn('Sign out notice:', err);
      }
      memoryAccessToken = null;
      return { error: null };
    }
  },
  database: {
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: string | number) => ({
          limit: async (limitNum: number) => {
            try {
              const headers = await getAuthHeaders();
              const url = `${BASE_URL}/api/database/records/${table}?select=${encodeURIComponent(
                columns
              )}&${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}&limit=${limitNum}`;
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { data: null, error: { message: err.message || 'Fetch failed' } };
              }
              const data = await res.json();
              return { data: Array.isArray(data) ? data : [], error: null };
            } catch (err) {
              return { data: null, error: { message: err instanceof Error ? err.message : 'Error' } };
            }
          }
        }),
        order: (orderColumn: string, options?: { ascending?: boolean }) => ({
          limit: async (limitNum: number) => {
            try {
              const headers = await getAuthHeaders();
              const dir = options?.ascending ? 'asc' : 'desc';
              const url = `${BASE_URL}/api/database/records/${table}?select=${encodeURIComponent(
                columns
              )}&order=${encodeURIComponent(orderColumn)}.${dir}&limit=${limitNum}`;
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { data: null, error: { message: err.message || 'Fetch failed' } };
              }
              const data = await res.json();
              return { data: Array.isArray(data) ? data : [], error: null };
            } catch (err) {
              return { data: null, error: { message: err instanceof Error ? err.message : 'Error' } };
            }
          }
        })
      }),
      insert: (rows: unknown[]) => ({
        select: async () => {
          try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${BASE_URL}/api/database/records/${table}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(rows)
            });
            const data = await res.json();
            if (!res.ok) {
              return { data: null, error: { message: data?.message || 'Insert failed' } };
            }
            return { data: Array.isArray(data) ? data : [data], error: null };
          } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : 'Error' } };
          }
        }
      }),
      update: (updates: Record<string, unknown>) => ({
        eq: (col: string, val: string) => ({
          select: async () => {
            try {
              const headers = await getAuthHeaders();
              const url = `${BASE_URL}/api/database/records/${table}?${encodeURIComponent(
                col
              )}=eq.${encodeURIComponent(val)}`;
              const res = await fetch(url, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
              });
              const data = await res.json();
              if (!res.ok) {
                return { data: null, error: { message: data?.message || 'Update failed' } };
              }
              return { data: Array.isArray(data) ? data : [data], error: null };
            } catch (err) {
              return { data: null, error: { message: err instanceof Error ? err.message : 'Error' } };
            }
          }
        })
      })
    })
  }
};

/**
 * Restores authentication session on app startup with guaranteed safety.
 */
export async function initializeInsForgeSession(): Promise<UserProfile | null> {
  try {
    const sessionPromise = (async () => {
      const token = await getAccessToken();
      const storedProfile = await getStoredUserProfile<UserProfile>();

      if (token) {
        insforge.setAccessToken(token);
        return storedProfile;
      }
      return null;
    })();

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );

    return await Promise.race([sessionPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Failed to initialize InsForge session:', err);
    return null;
  }
}

/**
 * Sign in user with email & password, caching tokens in SecureStore
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await insforge.auth.signInWithPassword({
      email: email.trim(),
      password: pass
    });

    if (error || !data) {
      return { profile: null, error: error?.message || 'Login failed' };
    }

    const accessToken = data.accessToken;
    if (accessToken) {
      insforge.setAccessToken(accessToken);
      await saveAuthTokens(accessToken);
    }

    // Retrieve or populate profile from public.users table
    let profile: UserProfile | null = null;
    try {
      const { data: userRows } = await insforge.database
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .limit(1);

      if (userRows && userRows.length > 0) {
        profile = userRows[0] as UserProfile;
      }
    } catch (fetchErr) {
      console.warn('User profile fetch notice:', fetchErr);
    }

    if (!profile) {
      // Fallback: create initial inspector profile if missing
      const newProfile: UserProfile = {
        id:
          data.user?.id ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `usr_${Date.now()}`),
        email: email.trim(),
        name: data.user?.profile?.name || email.split('@')[0],
        role: 'Inspector',
        created_at: new Date().toISOString()
      };
      try {
        await insforge.database.from('users').insert([newProfile]).select();
      } catch (insertErr) {
        console.warn('User table fallback insert notice:', insertErr);
      }
      profile = newProfile;
    }

    if (profile) {
      await saveStoredUserProfile(profile);
    }

    return { profile, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown login error';
    return { profile: null, error: msg };
  }
}

/**
 * Register a new user with email, password, full name, and role
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
  role: UserRole = 'Inspector'
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await insforge.auth.signUp({
      email: email.trim(),
      password: pass,
      name: name.trim()
    });

    if (error || !data) {
      return { profile: null, error: error?.message || 'Registration failed' };
    }

    const userId =
      data.user?.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `usr_${Date.now()}`);
    const newProfile: UserProfile = {
      id: userId,
      email: email.trim(),
      name: name.trim(),
      role: role,
      created_at: new Date().toISOString()
    };

    // Insert user row into public.users table
    try {
      await insforge.database.from('users').insert([newProfile]).select();
    } catch (insertErr) {
      console.warn('Profile insert notice:', insertErr);
    }

    if (data.accessToken) {
      insforge.setAccessToken(data.accessToken);
      await saveAuthTokens(data.accessToken);
    }
    await saveStoredUserProfile(newProfile);

    return { profile: newProfile, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown registration error';
    return { profile: null, error: msg };
  }
}

/**
 * Sign out user and remove tokens from SecureStore
 */
export async function logoutUser(): Promise<void> {
  try {
    await insforge.auth.signOut();
  } catch (err) {
    console.warn('InsForge signOut network notice:', err);
  } finally {
    memoryAccessToken = null;
    await clearAuthSession();
  }
}

/**
 * Update user profile details
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await insforge.database
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error || !data || data.length === 0) {
      return { profile: null, error: error?.message || 'Update failed' };
    }

    const updated = data[0] as UserProfile;
    await saveStoredUserProfile(updated);
    return { profile: updated, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update profile error';
    return { profile: null, error: msg };
  }
}

/**
 * Upload an image from local URI to InsForge storage bucket using native fetch or FileSystem
 */
export async function uploadImageToStorage(
  bucketName: 'crack-images' | 'inspection-reports',
  localUri: string,
  filename?: string
): Promise<{ url: string | null; error: string | null }> {
  const cleanFilename =
    filename || `capture_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

  const token = memoryAccessToken || (await getAccessToken());
  const headers: Record<string, string> = {
    'x-api-key': ANON_KEY
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const uploadUrl = `${BASE_URL}/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(
    cleanFilename
  )}`;
  const publicUrl = `${BASE_URL}/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(
    cleanFilename
  )}`;

  // Strategy 1: React Native standard FormData (using plain object, NO Blob casting)
  try {
    const formData = new FormData();
    const filePart: any = {
      uri: localUri,
      name: cleanFilename,
      type: 'image/jpeg'
    };
    formData.append('file', filePart);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData
    });

    if (response.ok) {
      return { url: publicUrl, error: null };
    }

    // Try PUT method if POST returned 405/404
    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: formData
    });

    if (putResponse.ok) {
      return { url: publicUrl, error: null };
    }
  } catch (formErr) {
    console.warn('FormData upload notice (attempting native FileSystem upload):', formErr);
  }

  // Strategy 2: Native Android FileSystem.uploadAsync fallback (bypasses JS FormData entirely)
  try {
    const uploadRes = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      headers
    });

    if (uploadRes.status >= 200 && uploadRes.status < 300) {
      return { url: publicUrl, error: null };
    }

    // Try PUT if POST failed
    const putUploadRes = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        ...headers,
        'Content-Type': 'image/jpeg'
      }
    });

    if (putUploadRes.status >= 200 && putUploadRes.status < 300) {
      return { url: publicUrl, error: null };
    }

    return { url: null, error: `Upload failed: ${uploadRes.status} ${uploadRes.body}` };
  } catch (fsErr) {
    const msg = fsErr instanceof Error ? fsErr.message : 'Storage upload error';
    return { url: null, error: msg };
  }
}

/**
 * Insert an inspection record into InsForge database using native REST fetch
 */
export async function saveInspectionRecord(
  inspection: Omit<Inspection, 'id' | 'created_at'>
): Promise<{ data: Inspection | null; error: string | null }> {
  try {
    const payload = {
      ...inspection,
      created_at: new Date().toISOString()
    };
    const { data, error } = await insforge.database
      .from('inspections')
      .insert([payload])
      .select();

    if (error || !data || data.length === 0) {
      return { data: null, error: error?.message || 'Failed to save inspection' };
    }
    return { data: data[0] as Inspection, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Save inspection error';
    return { data: null, error: msg };
  }
}

/**
 * Fetch all inspections sorted by newest first
 */
export async function fetchInspectionsList(
  limit = 50
): Promise<{ inspections: Inspection[]; error: string | null }> {
  try {
    const { data, error } = await insforge.database
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { inspections: [], error: error.message };
    }
    return { inspections: (data || []) as Inspection[], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch inspections error';
    return { inspections: [], error: msg };
  }
}

/**
 * Trigger an emergency incident alert in InsForge database
 */
export async function triggerEmergencySOS(
  incident: Omit<EmergencyIncident, 'id' | 'created_at'>
): Promise<{ data: EmergencyIncident | null; error: string | null }> {
  try {
    const payload = {
      ...incident,
      sos_status: incident.sos_status || 'TRIGGERED',
      created_at: new Date().toISOString()
    };
    const { data, error } = await insforge.database
      .from('emergency_incidents')
      .insert([payload])
      .select();

    if (error || !data || data.length === 0) {
      return { data: null, error: error?.message || 'Failed to trigger emergency SOS' };
    }
    return { data: data[0] as EmergencyIncident, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Emergency SOS error';
    return { data: null, error: msg };
  }
}
