import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  DEFAULT_CONTAINERS,
  Movement,
  MovementType,
  Product,
  ProductInput,
  ProductNotFoundError,
  StorageContainer,
  ValidationError,
} from '../types/inventory';
import {
  createInMemoryTransactionalEngine,
  executeCreateProductTransaction,
  executeStockChangeTransaction,
  executeUpdateProductTransaction,
  inferContainerType,
  TransactionalEngine,
  TransactionStoreAdapter,
  validateContainerName,
} from '../domain/inventoryLogic';

const LOCAL_PRODUCTS_KEY = 'mi_despensa_products_v2';
const LOCAL_MOVEMENTS_KEY = 'mi_despensa_movements_v2';
const LOCAL_CONTAINERS_KEY = 'mi_despensa_containers_v2';

export function getSeedContainers(uid: string): StorageContainer[] {
  const isoNow = new Date().toISOString();
  return DEFAULT_CONTAINERS.map((name, idx) => ({
    id: `cont-${idx + 1}`,
    uid,
    name,
    type: inferContainerType(name),
    createdAt: isoNow,
  }));
}

/**
 * Datos iniciales de ejemplo para primera ejecución en modo demostración local.
 */
export function getSeedProducts(uid: string): Product[] {
  const isoNow = new Date().toISOString();

  return [
    {
      id: 'prod-leche-entera',
      uid,
      name: 'Leche entera',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 2,
      unit: 'l',
      minQuantity: 3,
      notes: 'Brick de 1 litro semidesnatada o entera',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-huevos-camperos',
      uid,
      name: 'Huevos camperos M/L',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 0,
      unit: 'ud',
      minQuantity: 6,
      notes: 'Comprar docena en el mercado',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-yogur-natural',
      uid,
      name: 'Yogur natural sin azúcar',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 2,
      unit: 'ud',
      minQuantity: 4,
      notes: 'Pack de yogures naturales',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-arroz-redondo',
      uid,
      name: 'Arroz redondo',
      category: 'Legumbres y cereales',
      location: 'Despensa 1',
      quantity: 1.5,
      unit: 'kg',
      minQuantity: 1,
      notes: 'Ideal para paella y guarnición',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-garbanzos-cocidos',
      uid,
      name: 'Garbanzos cocidos',
      category: 'Legumbres y cereales',
      location: 'Despensa 1',
      quantity: 1,
      unit: 'paquete',
      minQuantity: 2,
      notes: 'Tarro de cristal de 400g',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-atun-claro',
      uid,
      name: 'Atún claro en aceite de oliva',
      category: 'Conservas',
      location: 'Despensa 2',
      quantity: 5,
      unit: 'lata',
      minQuantity: 3,
      notes: 'Pack ahorro de latas pequeñas',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'prod-pechuga-pollo',
      uid,
      name: 'Pechuga de pollo fileteada',
      category: 'Carnes y pescados',
      location: 'Congelador',
      quantity: 600,
      unit: 'g',
      minQuantity: 500,
      notes: 'Bolsas individuales congeladas',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
}

export function getSeedMovements(uid: string): Movement[] {
  const now = new Date();
  const t1 = new Date(now.getTime() - 7200000).toISOString();
  const t2 = new Date(now.getTime() - 3600000).toISOString();
  const t3 = new Date(now.getTime() - 1800000).toISOString();

  return [
    {
      id: 'mov-3',
      uid,
      productId: 'prod-huevos-camperos',
      productName: 'Huevos camperos M/L',
      type: 'consumo',
      delta: -2,
      previousQuantity: 2,
      newQuantity: 0,
      unit: 'ud',
      note: 'Cena (tortilla francesa)',
      createdAt: t3,
    },
    {
      id: 'mov-2',
      uid,
      productId: 'prod-leche-entera',
      productName: 'Leche entera',
      type: 'consumo',
      delta: -1,
      previousQuantity: 3,
      newQuantity: 2,
      unit: 'l',
      note: 'Desayuno familiar',
      createdAt: t2,
    },
    {
      id: 'mov-1',
      uid,
      productId: 'prod-atun-claro',
      productName: 'Atún claro en aceite de oliva',
      type: 'compra',
      delta: 5,
      previousQuantity: 0,
      newQuantity: 5,
      unit: 'lata',
      note: 'Compra semanal supermercado',
      createdAt: t1,
    },
  ];
}

function loadLocalProducts(uid: string): Product[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_PRODUCTS_KEY}_${uid}`);
    if (!raw) {
      const seeded = getSeedProducts(uid);
      localStorage.setItem(`${LOCAL_PRODUCTS_KEY}_${uid}`, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Product[];
  } catch {
    return getSeedProducts(uid);
  }
}

function loadLocalMovements(uid: string): Movement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MOVEMENTS_KEY}_${uid}`);
    if (!raw) {
      const seeded = getSeedMovements(uid);
      localStorage.setItem(`${LOCAL_MOVEMENTS_KEY}_${uid}`, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Movement[];
  } catch {
    return getSeedMovements(uid);
  }
}

function loadLocalContainers(uid: string): StorageContainer[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_CONTAINERS_KEY}_${uid}`);
    if (!raw) {
      const seeded = getSeedContainers(uid);
      localStorage.setItem(`${LOCAL_CONTAINERS_KEY}_${uid}`, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as StorageContainer[];
  } catch {
    return getSeedContainers(uid);
  }
}

type LocalSubscriber = {
  onProducts: Set<(products: Product[]) => void>;
  onMovements: Set<(movements: Movement[]) => void>;
  onContainers: Set<(containers: StorageContainer[]) => void>;
  containers: StorageContainer[];
  saveContainers: (next: StorageContainer[]) => void;
  instance: ReturnType<typeof createInMemoryTransactionalEngine>;
};

const localStores = new Map<string, LocalSubscriber>();

function getLocalStore(uid: string): LocalSubscriber {
  let entry = localStores.get(uid);
  if (!entry) {
    const productsSubs = new Set<(products: Product[]) => void>();
    const movementsSubs = new Set<(movements: Movement[]) => void>();
    const containersSubs = new Set<(containers: StorageContainer[]) => void>();

    const initialContainers = loadLocalContainers(uid);

    const instance = createInMemoryTransactionalEngine(
      loadLocalProducts(uid),
      loadLocalMovements(uid),
      (products, movements) => {
        try {
          localStorage.setItem(`${LOCAL_PRODUCTS_KEY}_${uid}`, JSON.stringify(products));
          localStorage.setItem(`${LOCAL_MOVEMENTS_KEY}_${uid}`, JSON.stringify(movements));
        } catch {
          // Ignore storage quota errors
        }
        productsSubs.forEach((cb) => cb(products));
        movementsSubs.forEach((cb) => cb(movements));
      }
    );

    const subscriberEntry: LocalSubscriber = {
      onProducts: productsSubs,
      onMovements: movementsSubs,
      onContainers: containersSubs,
      containers: initialContainers,
      saveContainers(next: StorageContainer[]) {
        subscriberEntry.containers = next.map((c) => ({ ...c }));
        try {
          localStorage.setItem(
            `${LOCAL_CONTAINERS_KEY}_${uid}`,
            JSON.stringify(subscriberEntry.containers)
          );
        } catch {
          // Ignore storage quota errors
        }
        containersSubs.forEach((cb) => cb(subscriberEntry.containers));
      },
      instance,
    };

    entry = subscriberEntry;
    localStores.set(uid, entry);
  }
  return entry;
}

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

/**
 * Crea un motor transaccional respaldado directamente por `runTransaction` de Cloud Firestore.
 */
function createFirestoreTransactionalEngine(): TransactionalEngine {
  if (!db) {
    throw new Error('Cloud Firestore no está inicializado.');
  }
  const firestoreDb = db;

  return {
    async runTransaction<T>(
      fn: (tx: TransactionStoreAdapter) => Promise<T>
    ): Promise<T> {
      return runTransaction(firestoreDb, async (firestoreTx) => {
        const adapter: TransactionStoreAdapter = {
          async getProduct(uid: string, productId: string): Promise<Product | null> {
            const ref = doc(firestoreDb, 'users', uid, 'products', productId);
            const snap = await firestoreTx.get(ref);
            if (!snap.exists()) {
              return null;
            }
            const data = snap.data();
            return {
              id: snap.id,
              uid: data.uid,
              name: data.name,
              category: data.category,
              location: data.location,
              quantity: Number(data.quantity),
              unit: data.unit,
              minQuantity: Number(data.minQuantity),
              notes: data.notes ?? '',
              createdAt: timestampToIso(data.createdAt),
              updatedAt: timestampToIso(data.updatedAt),
            };
          },

          async saveProduct(uid: string, product: Product): Promise<void> {
            const ref = doc(firestoreDb, 'users', uid, 'products', product.id);
            firestoreTx.set(ref, {
              uid: product.uid,
              name: product.name,
              category: product.category,
              location: product.location,
              quantity: product.quantity,
              unit: product.unit,
              minQuantity: product.minQuantity,
              notes: product.notes ?? '',
              createdAt: Timestamp.fromDate(new Date(product.createdAt)),
              updatedAt: serverTimestamp(),
            });
          },

          async createMovement(uid: string, movement: Movement): Promise<void> {
            const ref = doc(firestoreDb, 'users', uid, 'movements', movement.id);
            firestoreTx.set(ref, {
              uid: movement.uid,
              productId: movement.productId,
              productName: movement.productName,
              type: movement.type,
              delta: movement.delta,
              previousQuantity: movement.previousQuantity,
              newQuantity: movement.newQuantity,
              unit: movement.unit,
              note: movement.note ?? '',
              createdAt: serverTimestamp(),
            });
          },
        };

        return fn(adapter);
      });
    },
  };
}

function getEngineForUser(uid: string, isDemoMode: boolean): TransactionalEngine {
  if (!isDemoMode && isFirebaseConfigured && db) {
    return createFirestoreTransactionalEngine();
  }
  return getLocalStore(uid).instance.engine;
}

/**
 * Suscribe en tiempo real a los contenedores del usuario (ej. Nevera, Congelador, Despensa 1, Despensa 2).
 */
export function subscribeToContainers(
  uid: string,
  isDemoMode: boolean,
  onData: (containers: StorageContainer[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const firestoreDb = db;
    const colRef = collection(firestoreDb, 'users', uid, 'containers');
    const q = query(colRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Si el usuario en Cloud Firestore aún no tiene contenedores, creamos los 4 por defecto
          const defaults = getSeedContainers(uid);
          try {
            await Promise.all(
              defaults.map((c) =>
                setDoc(doc(firestoreDb, 'users', uid, 'containers', c.id), {
                  uid,
                  name: c.name,
                  type: c.type,
                  createdAt: serverTimestamp(),
                })
              )
            );
          } catch {
            onData(defaults);
          }
          return;
        }
        const items: StorageContainer[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid,
            name: data.name,
            type: data.type || inferContainerType(data.name ?? ''),
            createdAt: timestampToIso(data.createdAt),
          };
        });
        onData(items);
      },
      (err) => onError(err)
    );
  }

  const store = getLocalStore(uid);
  store.onContainers.add(onData);
  onData(store.containers);
  return () => {
    store.onContainers.delete(onData);
  };
}

/**
 * Crea un nuevo contenedor (ej. "Despensa 3", "Arcón congelador", etc.).
 */
export async function createContainer(
  uid: string,
  name: string,
  existingContainers: StorageContainer[],
  isDemoMode: boolean
): Promise<StorageContainer> {
  const validName = validateContainerName(name, existingContainers);
  const newContainer: StorageContainer = {
    id: crypto.randomUUID(),
    uid,
    name: validName,
    type: inferContainerType(validName),
    createdAt: new Date().toISOString(),
  };

  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'containers', newContainer.id);
    await setDoc(ref, {
      uid,
      name: newContainer.name,
      type: newContainer.type,
      createdAt: serverTimestamp(),
    });
    return newContainer;
  }

  const store = getLocalStore(uid);
  store.saveContainers([...store.containers, newContainer]);
  return newContainer;
}

/**
 * Renombra un contenedor existente y actualiza la ubicación en los productos que estuvieran dentro.
 */
export async function renameContainer(
  uid: string,
  containerId: string,
  newName: string,
  existingContainers: StorageContainer[],
  isDemoMode: boolean
): Promise<void> {
  const target = existingContainers.find((c) => c.id === containerId);
  if (!target) {
    throw new ValidationError('El contenedor no existe.');
  }
  const validName = validateContainerName(newName, existingContainers, containerId);
  const oldName = target.name;
  if (oldName === validName) return;

  const newType = inferContainerType(validName);

  if (!isDemoMode && isFirebaseConfigured && db) {
    const firestoreDb = db;
    const batch = writeBatch(firestoreDb);
    const contRef = doc(firestoreDb, 'users', uid, 'containers', containerId);
    batch.update(contRef, {
      name: validName,
      type: newType,
    });

    const prodsQuery = query(
      collection(firestoreDb, 'users', uid, 'products'),
      where('location', '==', oldName)
    );
    const prodsSnap = await getDocs(prodsQuery);
    prodsSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        location: validName,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return;
  }

  const store = getLocalStore(uid);
  const updatedList = store.containers.map((c) =>
    c.id === containerId ? { ...c, name: validName, type: newType } : c
  );
  store.saveContainers(updatedList);
  await store.instance.renameContainerInProducts(uid, oldName, validName);
}

/**
 * Elimina un contenedor verificando que no tenga productos asignados ni sea el único contenedor.
 */
export async function removeContainer(
  uid: string,
  containerId: string,
  existingContainers: StorageContainer[],
  products: Product[],
  isDemoMode: boolean
): Promise<void> {
  const target = existingContainers.find((c) => c.id === containerId);
  if (!target) {
    throw new ValidationError('El contenedor no existe.');
  }
  if (existingContainers.length <= 1) {
    throw new ValidationError('Debes mantener al menos un contenedor en tu despensa.');
  }
  const productsInside = products.filter((p) => p.location === target.name).length;
  if (productsInside > 0) {
    throw new ValidationError(
      `No puedes eliminar "${target.name}" porque contiene ${productsInside} ${
        productsInside === 1 ? 'alimento' : 'alimentos'
      }. Mueve o elimina antes sus alimentos, o renombra el contenedor.`
    );
  }

  if (!isDemoMode && isFirebaseConfigured && db) {
    await deleteDoc(doc(db, 'users', uid, 'containers', containerId));
    return;
  }

  const store = getLocalStore(uid);
  store.saveContainers(store.containers.filter((c) => c.id !== containerId));
}

/**
 * Suscribe en tiempo real a los productos del usuario.
 */
export function subscribeToProducts(
  uid: string,
  isDemoMode: boolean,
  onData: (products: Product[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users', uid, 'products'),
      orderBy('name', 'asc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid,
            name: data.name,
            category: data.category,
            location: data.location,
            quantity: Number(data.quantity),
            unit: data.unit,
            minQuantity: Number(data.minQuantity),
            notes: data.notes ?? '',
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt),
          };
        });
        onData(items);
      },
      (err) => {
        onError(err);
      }
    );
  }

  const store = getLocalStore(uid);
  store.onProducts.add(onData);
  onData(store.instance.getProducts());
  return () => {
    store.onProducts.delete(onData);
  };
}

/**
 * Suscribe en tiempo real al historial de movimientos del usuario.
 */
export function subscribeToMovements(
  uid: string,
  isDemoMode: boolean,
  onData: (movements: Movement[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users', uid, 'movements'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Movement[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid,
            productId: data.productId,
            productName: data.productName,
            type: data.type,
            delta: Number(data.delta),
            previousQuantity: Number(data.previousQuantity),
            newQuantity: Number(data.newQuantity),
            unit: data.unit,
            note: data.note ?? '',
            createdAt: timestampToIso(data.createdAt),
          };
        });
        onData(items);
      },
      (err) => {
        onError(err);
      }
    );
  }

  const store = getLocalStore(uid);
  store.onMovements.add(onData);
  onData(store.instance.getMovements());
  return () => {
    store.onMovements.delete(onData);
  };
}

/**
 * Crea un producto mediante una transacción y registra su stock inicial.
 */
export async function createProduct(
  uid: string,
  input: ProductInput,
  isDemoMode: boolean
): Promise<Product> {
  const engine = getEngineForUser(uid, isDemoMode);
  return executeCreateProductTransaction(engine, uid, input);
}

/**
 * Actualiza un producto mediante una transacción. Si cambia la cantidad, registra el ajuste en el historial.
 */
export async function updateProduct(
  uid: string,
  productId: string,
  input: ProductInput,
  isDemoMode: boolean,
  movementType?: MovementType,
  movementNote?: string
): Promise<Product> {
  const engine = getEngineForUser(uid, isDemoMode);
  return executeUpdateProductTransaction(engine, {
    uid,
    productId,
    input,
    movementType,
    movementNote,
  });
}

/**
 * Modifica las existencias de un producto (+ / -, compra, consumo o ajuste) usando una transacción atómica.
 */
export async function changeProductStock(
  uid: string,
  productId: string,
  delta: number,
  isDemoMode: boolean,
  type?: MovementType,
  note?: string
): Promise<{ product: Product; movement: Movement }> {
  const engine = getEngineForUser(uid, isDemoMode);
  return executeStockChangeTransaction(engine, {
    uid,
    productId,
    delta,
    type,
    note,
  });
}

/**
 * Elimina un producto del inventario del usuario.
 */
export async function removeProduct(
  uid: string,
  productId: string,
  isDemoMode: boolean
): Promise<void> {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'products', productId);
    await deleteDoc(ref);
    return;
  }
  const store = getLocalStore(uid);
  await store.instance.deleteProduct(uid, productId);
}

export { ProductNotFoundError };
