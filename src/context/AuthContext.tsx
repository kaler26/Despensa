import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  firebaseSignOut,
  googleProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from '../lib/firebase';

export interface AppUser {
  uid: string; // ID compartido del hogar ('hogar-principal') para que ambos compartan la misma despensa
  authUid: string; // UID individual de Google
  displayName: string;
  email: string;
  photoURL: string | null;
  isDemo: boolean;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  isFirebaseReady: boolean;
  canUseLocalDemo: boolean;
  signInWithGoogle: () => Promise<void>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const DEMO_STORAGE_KEY = 'mi_despensa_demo_session_v2';

/**
 * ID único compartido en Firestore para que Dani y Laura vean y modifiquen
 * exactamente la misma despensa en tiempo real.
 */
export const SHARED_HOUSEHOLD_ID = 'hogar-principal';

export const DEFAULT_ALLOWED_EMAILS = [
  'dumber.wow@gmail.com',
  'laura.lmp94@gmail.com',
] as const;

const DEMO_USER: AppUser = {
  uid: SHARED_HOUSEHOLD_ID,
  authUid: 'demo-usuario-local',
  displayName: 'Modo Pruebas Local',
  email: 'dumber.wow@gmail.com',
  photoURL: null,
  isDemo: true,
};

/**
 * Obtiene la lista de correos autorizados (por defecto dumber.wow@gmail.com y laura.lmp94@gmail.com).
 */
function getAllowedEmails(): string[] {
  const raw = (import.meta.env.VITE_ALLOWED_EMAILS ?? '').trim();
  if (!raw) {
    return [...DEFAULT_ALLOWED_EMAILS];
  }
  return raw
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAuthorized(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAllowedEmails();
  return allowed.includes(email.trim().toLowerCase());
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseUser(fbUser: User): AppUser {
  return {
    uid: SHARED_HOUSEHOLD_ID,
    authUid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email || 'Miembro del hogar',
    email: fbUser.email || '',
    photoURL: fbUser.photoURL,
    isDemo: false,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const canUseLocalDemo = import.meta.env.DEV;

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      if (canUseLocalDemo && localStorage.getItem(DEMO_STORAGE_KEY) === 'active') {
        setUser(DEMO_USER);
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    const currentAuth = auth;
    const unsubscribe = onAuthStateChanged(
      currentAuth,
      async (fbUser) => {
        if (fbUser) {
          if (!isEmailAuthorized(fbUser.email)) {
            await firebaseSignOut(currentAuth);
            setUser(null);
            setAuthError(
              `Acceso denegado: la cuenta "${fbUser.email ?? 'desconocida'}" no tiene permiso. Solo dumber.wow@gmail.com y laura.lmp94@gmail.com pueden entrar.`
            );
            setLoading(false);
            return;
          }
          localStorage.removeItem(DEMO_STORAGE_KEY);
          setUser(mapFirebaseUser(fbUser));
        } else if (canUseLocalDemo && localStorage.getItem(DEMO_STORAGE_KEY) === 'active') {
          setUser(DEMO_USER);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error al verificar estado de autenticación:', err);
        setAuthError('No se pudo verificar la sesión con Firebase.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [canUseLocalDemo]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Las credenciales de Firebase no están configuradas.');
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (!isEmailAuthorized(result.user.email)) {
        await firebaseSignOut(auth);
        setUser(null);
        setAuthError(
          `Acceso restringido: la cuenta "${result.user.email ?? ''}" no está autorizada. Solo dumber.wow@gmail.com y laura.lmp94@gmail.com tienen acceso.`
        );
        return;
      }
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(mapFirebaseUser(result.user));
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Se cerró la ventana de Google antes de completar el acceso.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          `Dominio no autorizado (${window.location.hostname}). Añade "${window.location.hostname}" en Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError(
          'El proveedor de Google aún no está habilitado en Firebase Console. Actívalo en Authentication > Sign-in method > Google.'
        );
      } else {
        setAuthError('Error al iniciar sesión con Google. Comprueba que Google Sign-In esté habilitado en tu consola de Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInDemo = () => {
    if (!canUseLocalDemo) return;
    setAuthError(null);
    localStorage.setItem(DEMO_STORAGE_KEY, 'active');
    setUser(DEMO_USER);
  };

  const signOut = async () => {
    setAuthError(null);
    localStorage.removeItem(DEMO_STORAGE_KEY);
    if (isFirebaseConfigured && auth && user && !user.isDemo) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isFirebaseReady: isFirebaseConfigured,
        canUseLocalDemo,
        signInWithGoogle,
        signInDemo,
        signOut,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return ctx;
}
