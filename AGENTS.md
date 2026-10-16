# Contexto del Proyecto para Antigravity — Mi Despensa (PWA)

Este archivo proporciona todo el contexto técnico y funcional para que **Antigravity** entienda el proyecto inmediatamente al abrirlo en cualquier ordenador.

---

## 1. Resumen de la Aplicación

- **Nombre**: Mi Despensa
- **Tipo**: Progressive Web App (PWA) mobile-first en español para gestión de inventario doméstico de alimentos.
- **Stack tecnológico**:
  - **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 (`@tailwindcss/vite`) + iconos `lucide-react`.
  - **Backend / BaaS**: Firebase Authentication (Google Sign-In) + Cloud Firestore (`despensa-52e39`).
  - **Testing**: Vitest (`npm test`).
  - **Despliegue**: GitHub Pages mediante GitHub Actions (`.github/workflows/deploy.yml`) y/o Firebase Hosting (`firebase.json`).
  - **Repositorio GitHub**: `https://github.com/kaler26/Despensa`
  - **URL Pública (GitHub Pages)**: `https://kaler26.github.io/Despensa/`

---

## 2. Reglas de Negocio y Decisiones Clave

1. **Acceso Privado y Despensa Compartida**:
   - Solo tienen acceso dos cuentas de Google autorizadas:
     - `dumber.wow@gmail.com`
     - `laura.lmp94@gmail.com`
   - Ambas cuentas comparten el mismo identificador de hogar en Firestore (`SHARED_HOUSEHOLD_ID = 'hogar-principal'`), definido en [`src/context/AuthContext.tsx`](./src/context/AuthContext.tsx), para ver y modificar exactamente el mismo inventario en tiempo real.
2. **Contenedores Personalizables (sin fechas de caducidad)**:
   - Por petición expresa del usuario, **no se usan fechas de caducidad**.
   - Los alimentos se organizan por **contenedores** (ej. `Nevera`, `Congelador`, `Despensa 1`, `Despensa 2`, etc.).
   - El usuario puede filtrar por contenedor desde la barra principal y crear, renombrar o eliminar contenedores desde [`src/components/ContainerManagerModal.tsx`](./src/components/ContainerManagerModal.tsx) o directamente al crear un producto en [`src/components/ProductFormModal.tsx`](./src/components/ProductFormModal.tsx).
3. **Lista de la Compra Manual (sin reposición automática ni stock mínimo)**:
   - Por petición expresa del usuario, **no hay lista automática de reposición ni cantidad mínima (`minQuantity`)**.
   - Existe una pestaña dedicada **"Lista de la compra"** ([`src/components/ShoppingListView.tsx`](./src/components/ShoppingListView.tsx)) donde se apuntan manualmente los artículos a comprar (o con un toque desde cualquier tarjeta del inventario mediante el botón «Añadir a la compra»).
4. **Unidades Permitidas**:
   - `ud`, `kg`, `g`, `l`, `ml`, `paquete`, `lata`.
5. **Transacciones Atómicas y Stock No Negativo**:
   - Todo cambio de existencias (`+`, `-`, compra, consumo o ajuste) se ejecuta mediante `runTransaction` de Firestore en [`src/services/inventoryService.ts`](./src/services/inventoryService.ts) y [`src/domain/inventoryLogic.ts`](./src/domain/inventoryLogic.ts).
   - Nunca se permiten existencias negativas (`NegativeStockError` si `newQuantity < 0`).
   - Cada cambio de stock genera atómicamente un registro en el historial (`compra`, `consumo`, `ajuste`).
6. **Asistente Inteligente (Gemini Flash)**:
   - Permite dictar por voz (Web Speech API) o escribir peticiones en lenguaje natural en español (ej. *"nos hemos bebido 1 litro de leche y apunta huevos a la compra"*).
   - Servicio en [`src/services/geminiService.ts`](./src/services/geminiService.ts) y modal en [`src/components/GeminiAssistantModal.tsx`](./src/components/GeminiAssistantModal.tsx).
   - Interpreta multi-acciones con salida estructurada en JSON, muestra una previsualización con checklist al usuario y aplica los cambios atómicamente.
   - Soporta clave de API desde `.env` (`VITE_GEMINI_API_KEY`) o configurada directamente por el usuario en `localStorage`.

---

## 3. Estructura de Datos en Cloud Firestore (`despensa-52e39`)

Ruta raíz compartida: `users/hogar-principal`

- `users/hogar-principal/containers/{containerId}`:
  - `uid`: `'hogar-principal'`
  - `name`: `string` (ej. `"Nevera"`, `"Despensa 1"`, `"Despensa 2"`)
  - `type`: `'nevera' | 'congelador' | 'despensa' | 'armario' | 'otro'`
  - `createdAt`: `timestamp`
- `users/hogar-principal/products/{productId}`:
  - `uid`: `'hogar-principal'`
  - `name`: `string`
  - `category`: `string`
  - `location`: `string` (nombre del contenedor)
  - `quantity`: `number` (`>= 0`)
  - `unit`: `'ud' | 'kg' | 'g' | 'l' | 'ml' | 'paquete' | 'lata'`
  - `notes`: `string`
  - `createdAt`, `updatedAt`: `timestamp`
- `users/hogar-principal/shoppingList/{itemId}`:
  - `uid`: `'hogar-principal'`
  - `name`: `string`
  - `quantity`: `number` (`> 0`)
  - `unit`: `Unit`
  - `checked`: `boolean`
  - `notes`: `string`
  - `productId`: `string | null`
  - `createdAt`: `timestamp`
- `users/hogar-principal/movements/{movementId}`:
  - `uid`: `'hogar-principal'`
  - `productId`: `string`
  - `productName`: `string`
  - `type`: `'compra' | 'consumo' | 'ajuste'`
  - `delta`: `number`
  - `previousQuantity`: `number`
  - `newQuantity`: `number`
  - `unit`: `Unit`
  - `note`: `string`
  - `createdAt`: `timestamp`

---

## 4. Comandos Útiles

- Instalar dependencias: `npm install`
- Servidor de desarrollo: `npm run dev`
- Ejecutar tests: `npm test`
- Compilar para producción: `npm run build`
