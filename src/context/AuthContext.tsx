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
  uid: string;
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

const DEMO_USER: AppUser = {
  uid: 'demo-usuario-local',
  displayName: 'Modo Pruebas Local',
  email: 'local@despensa.dev',
  photoURL: null,
  isDemo: true,
};

/**
 * Obtiene la lista de correos autorizados desde VITE_ALLOWED_EMAILS (separados por coma).
 * Si se define, solo esos correos podrán entrar aunque inicien sesión con Google.
 */
function getAllowedEmails(): string[] {
  const raw = (import.meta.env.VITE_ALLOWED_EMAILS ?? '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isEmailAuthorized(email: string | null | undefined): boolean {
  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    // Si no se configuró lista restrictiva en VITE_ALLOWED_EMAILS, cualquier cuenta Google autenticada accede a su propio UID
    return true;
  }
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseUser(fbUser: User): AppUser {
  return {
    uid: fbUser.uid,
    displayName: fbUser.displayName || 'Propietario',
    email: fbUser.email || '',
    photoURL: fbUser.photoURL,
    isDemo: false,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // El modo demo solo está disponible en entorno local de desarrollo cuando no hay Firebase configurado
  const canUseLocalDemo = import.meta.env.DEV && !isFirebaseConfigured;

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
              `Acceso denegado: la cuenta "${fbUser.email ?? 'desconocida'}" no está autorizada para acceder ni modificar esta despensa.`
            );
            setLoading(false);
            return;
          }
          localStorage.removeItem(DEMO_STORAGE_KEY);
          setUser(mapFirebaseUser(fbUser));
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
      setAuthError(
        'Faltan las credenciales de Firebase (VITE_FIREBASE_*). Configúralas en tu archivo .env o en los Secrets de GitHub para iniciar sesión con Google.'
      );
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (!isEmailAuthorized(result.user.email)) {
        await firebaseSignOut(auth);
        setUser(null);
        setAuthError(
          `Acceso restringido: la cuenta "${result.user.email ?? ''}" no tiene permiso para entrar. Solo el propietario autorizado puede acceder.`
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
      } else {
        setAuthError('Error al iniciar sesión con Google. Comprueba tu configuración de Firebase.');
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
