# Mi Despensa — Inventario Doméstico de Alimentos (PWA)

Aplicación web progresiva (**PWA**) mobile-first en español para gestionar el inventario doméstico de alimentos por **contenedores personalizables** (*Nevera, Congelador, Despensa 1, Despensa 2...*), controlar alertas de stock mínimo y auditar el historial de compras, consumos y ajustes mediante transacciones atómicas en **Cloud Firestore**.

---

## Características Principales

- **Acceso Privado Restringido al Propietario**: Inicio de sesión obligatorio con **Google (Firebase Authentication)**, filtro de correo autorizado (`VITE_ALLOWED_EMAILS`) y aislamiento estricto por usuario (`request.auth.uid == userId`) en las reglas de seguridad de **Cloud Firestore**.
- **Contenedores Personalizables**: Filtra, crea, renombra o elimina contenedores (*Nevera, Congelador, Despensa 1, Despensa 2, Armario...*) desde la interfaz.
- **Control Transaccional de Existencias**: Todas las modificaciones de stock se ejecutan mediante transacciones de Firestore (`runTransaction`) e impiden existencias negativas (`quantity >= 0`).
- **Lista Automática de Reposición e Historial**: Pestañas dedicadas para productos agotados/bajo mínimo e historial inmutable de compras, consumos y ajustes.
- **Instalable como PWA en Móvil y Escritorio**: Lista para alojarse en **GitHub Pages** o **Firebase Hosting**.

---

## Cómo Publicarla en GitHub (GitHub Pages) con Acceso Exclusivo para Ti

### Paso 1: Crear tu proyecto gratuito en Firebase (5 min)
1. Entra en [Firebase Console](https://console.firebase.google.com/) y pulsa **Crear un proyecto**.
2. En el menú lateral ve a **Authentication > Sign-in method** y activa el proveedor **Google**.
3. En **Firestore Database**, pulsa **Crear base de datos** (modo producción) y pega en la pestaña **Reglas** el contenido del archivo [`firestore.rules`](./firestore.rules).
4. En **Configuración del proyecto (⚙️) > Tus aplicaciones**, pulsa el icono Web (`</>`) para registrar la app y copiar tus claves `firebaseConfig`.

### Paso 2: Subir el repositorio a GitHub
El repositorio Git local ya está inicializado en esta carpeta. Puedes publicarlo con **GitHub Desktop** (abriendo `File > Add local repository...`, seleccionando `c:\Users\dani\Desktop\despensa` y pulsando **Publish repository**) o desde terminal:

```bash
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

### Paso 3: Configurar tus claves y tu correo exclusivo en GitHub
1. En tu repositorio de GitHub, ve a **Settings > Secrets and variables > Actions > New repository secret** y añade:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ALLOWED_EMAILS`: pon **tu correo de Gmail** (ej. `tucorreo@gmail.com`). Así solo tu cuenta podrá entrar en la aplicación.
2. En tu repositorio de GitHub, ve a **Settings > Pages** y en **Source** selecciona **GitHub Actions**.
3. En **Firebase Console > Authentication > Settings > Authorized domains**, añade el dominio de tu GitHub Pages: `<tu-usuario>.github.io`.

¡Listo! Cada vez que subas cambios a `main`, el workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ejecutará las pruebas, compilará la PWA y la publicará en `https://<tu-usuario>.github.io/<tu-repo>/`.

---

## Desarrollo y Pruebas en Local

```bash
npm install
npm test
npm run dev
```
