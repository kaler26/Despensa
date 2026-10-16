import React from 'react';
import { Lock, LogIn, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const {
    signInWithGoogle,
    signInDemo,
    authError,
    loading,
    isFirebaseReady,
    canUseLocalDemo,
  } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <PackageCheck className="h-9 w-9" aria-hidden="true" />
          </div>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-900">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Acceso privado con usuario
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Mi Despensa
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Inicia sesión con tu cuenta autorizada de Google para acceder y gestionar tus contenedores y alimentos desde cualquier dispositivo.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-medium text-rose-800"
          >
            {authError}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={signInWithGoogle}
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {loading ? 'Verificando acceso...' : 'Iniciar sesión con Google'}
          </button>

          {canUseLocalDemo && (
            <button
              type="button"
              onClick={signInDemo}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Probar en local (solo disponible en desarrollo sin .env)
            </button>
          )}
        </div>

        {!isFirebaseReady && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            <strong>Pendiente de conectar Firebase:</strong> Configura tus claves{' '}
            <code>VITE_FIREBASE_*</code> y tu correo en{' '}
            <code>VITE_ALLOWED_EMAILS</code> dentro de <code>.env</code> (o en
            GitHub Secrets) para activar el login real con Google.
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>
            Protegido con Firebase Authentication y reglas de seguridad en Cloud Firestore.
          </span>
        </div>
      </div>
    </main>
  );
};
