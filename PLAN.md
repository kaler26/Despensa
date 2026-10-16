# Plan y Estructura de Datos — Mi Despensa (PWA)

## 1. Arquitectura General

- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4.
- **Autenticación**: Firebase Authentication con proveedor Google, restringido exclusivamente a `dumber.wow@gmail.com` y `laura.lmp94@gmail.com`.
- **Base de Datos**: Cloud Firestore (`despensa-52e39`) con inventario compartido bajo `users/hogar-principal`.
- **PWA**: Instalable en móvil y escritorio mediante `public/manifest.webmanifest` y `public/sw.js`.
- **Despliegue**: GitHub Pages automatizado con GitHub Actions (`.github/workflows/deploy.yml`).

---

## 2. Estructura de Carpetas del Proyecto

```text
despensa/
├── .agents/skills/                  # Skills de Firebase para Antigravity
├── .github/workflows/deploy.yml     # Despliegue automático a GitHub Pages
├── public/
│   ├── icons/                       # Iconos SVG de la PWA
│   ├── manifest.webmanifest         # Manifiesto de instalación móvil/escritorio
│   └── sw.js                        # Service Worker
├── src/
│   ├── __tests__/inventory.test.ts  # Suite de pruebas unitarias y transaccionales (Vitest)
│   ├── components/
│   │   ├── ConfirmDeleteModal.tsx   # Confirmación accesible antes de borrar
│   │   ├── ContainerManagerModal.tsx# Gestor de contenedores (Nevera, Despensa 1, Despensa 2...)
│   │   ├── LoginView.tsx            # Pantalla de acceso con Google
│   │   ├── MovementsHistoryView.tsx # Historial de compras, consumos y ajustes
│   │   ├── ProductCard.tsx          # Tarjeta de producto con botones grandes + y -
│   │   ├── ProductFormModal.tsx     # Formulario de creación/edición de productos
│   │   └── StockMovementModal.tsx   # Modal de movimiento personalizado
│   ├── context/AuthContext.tsx      # Estado de sesión y filtro de correos autorizados
│   ├── domain/inventoryLogic.ts     # Validaciones puras y motor transaccional
│   ├── lib/firebase.ts              # Configuración del SDK de Firebase (despensa-52e39)
│   ├── services/inventoryService.ts # Operaciones con runTransaction en Firestore
│   ├── types/inventory.ts           # Tipos TypeScript, unidades y constantes
│   ├── App.tsx                      # Pantalla principal, filtros por contenedor/categoría y pestañas
│   └── main.tsx                     # Punto de entrada de la app
├── AGENTS.md                        # Contexto automático para Antigravity
├── PLAN.md                          # Este documento de arquitectura y plan
├── README.md                        # Guía de configuración y despliegue
├── firebase.json                    # Configuración de Firebase Hosting y Firestore
└── firestore.rules                  # Reglas de seguridad de Cloud Firestore
```
