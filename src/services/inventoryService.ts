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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  BasicItem,
  BasicItemInput,
  DEFAULT_CONTAINERS,
  Movement,
  MovementType,
  Product,
  ProductInput,
  ProductNotFoundError,
  ShoppingListItem,
  ShoppingListItemInput,
  StorageContainer,
  ValidationError,
} from '../types/inventory';
import {
  calculateBasicItemStatus,
  createInMemoryTransactionalEngine,
  executeCreateProductTransaction,
  executeStockChangeTransaction,
  executeUpdateProductTransaction,
  inferContainerType,
  roundQuantity,
  TransactionalEngine,
  TransactionStoreAdapter,
  validateBasicItemInput,
  validateContainerName,
  validateShoppingItemInput,
} from '../domain/inventoryLogic';

const LOCAL_PRODUCTS_KEY = 'mi_despensa_products_v3';
const LOCAL_MOVEMENTS_KEY = 'mi_despensa_movements_v3';
const LOCAL_CONTAINERS_KEY = 'mi_despensa_containers_v3';
const LOCAL_SHOPPING_KEY = 'mi_despensa_shopping_v3';
const LOCAL_BASICS_KEY = 'mi_despensa_basics_v3';

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

export function getSeedShoppingList(uid: string): ShoppingListItem[] {
  const isoNow = new Date().toISOString();
  return [
    {
      id: 'shop-1',
      uid,
      name: 'Huevos camperos M/L',
      quantity: 1,
      unit: 'paquete',
      checked: false,
      notes: 'Docena en el mercado',
      productId: 'prod-huevos-camperos',
      createdAt: isoNow,
    },
    {
      id: 'shop-2',
      uid,
      name: 'Leche entera',
      quantity: 6,
      unit: 'l',
      checked: false,
      notes: 'Pack de 6 bricks',
      productId: 'prod-leche-entera',
      createdAt: isoNow,
    },
  ];
}

export function getSeedBasics(uid: string): BasicItem[] {
  const isoNow = new Date().toISOString();
  return [
    {
      id: 'basic-1',
      uid,
      name: 'Huevos',
      minQuantity: 6,
      unit: 'ud',
      category: 'Lácteos y huevos',
      preferredLocation: 'Nevera',
      notes: 'Mínimo media docena',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'basic-2',
      uid,
      name: 'Leche entera',
      minQuantity: 2,
      unit: 'l',
      category: 'Lácteos y huevos',
      preferredLocation: 'Nevera',
      notes: 'Mínimo 2 bricks de 1 l',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'basic-3',
      uid,
      name: 'Aceite de oliva',
      minQuantity: 1,
      unit: 'l',
      category: 'Aceites y condimentos',
      preferredLocation: 'Despensa 1',
      notes: 'Virgen extra',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'basic-4',
      uid,
      name: 'Café',
      minQuantity: 1,
      unit: 'paquete',
      category: 'Panadería y desayuno',
      preferredLocation: 'Despensa 1',
      notes: 'Molido tueste natural',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
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
      quantity: 4,
      unit: 'ud',
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
      quantity: 2,
      unit: 'paquete',
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

function loadLocalShoppingList(uid: string): ShoppingListItem[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_SHOPPING_KEY}_${uid}`);
    if (!raw) {
      const seeded = getSeedShoppingList(uid);
      localStorage.setItem(`${LOCAL_SHOPPING_KEY}_${uid}`, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as ShoppingListItem[];
  } catch {
    return getSeedShoppingList(uid);
  }
}

function loadLocalBasics(uid: string): BasicItem[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_BASICS_KEY}_${uid}`);
    if (!raw) {
      const seeded = getSeedBasics(uid);
      localStorage.setItem(`${LOCAL_BASICS_KEY}_${uid}`, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as BasicItem[];
  } catch {
    return getSeedBasics(uid);
  }
}

type LocalSubscriber = {
  onProducts: Set<(products: Product[]) => void>;
  onMovements: Set<(movements: Movement[]) => void>;
  onContainers: Set<(containers: StorageContainer[]) => void>;
  onShopping: Set<(items: ShoppingListItem[]) => void>;
  onBasics: Set<(items: BasicItem[]) => void>;
  containers: StorageContainer[];
  shoppingList: ShoppingListItem[];
  basics: BasicItem[];
  saveContainers: (next: StorageContainer[]) => void;
  saveShoppingList: (next: ShoppingListItem[]) => void;
  saveBasics: (next: BasicItem[]) => void;
  instance: ReturnType<typeof createInMemoryTransactionalEngine>;
};

const localStores = new Map<string, LocalSubscriber>();

function getLocalStore(uid: string): LocalSubscriber {
  let entry = localStores.get(uid);
  if (!entry) {
    const productsSubs = new Set<(products: Product[]) => void>();
    const movementsSubs = new Set<(movements: Movement[]) => void>();
    const containersSubs = new Set<(containers: StorageContainer[]) => void>();
    const shoppingSubs = new Set<(items: ShoppingListItem[]) => void>();
    const basicsSubs = new Set<(items: BasicItem[]) => void>();

    const initialContainers = loadLocalContainers(uid);
    const initialShopping = loadLocalShoppingList(uid);
    const initialBasics = loadLocalBasics(uid);

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
      onShopping: shoppingSubs,
      onBasics: basicsSubs,
      containers: initialContainers,
      shoppingList: initialShopping,
      basics: initialBasics,
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
      saveShoppingList(next: ShoppingListItem[]) {
        subscriberEntry.shoppingList = next.map((item) => ({ ...item }));
        try {
          localStorage.setItem(
            `${LOCAL_SHOPPING_KEY}_${uid}`,
            JSON.stringify(subscriberEntry.shoppingList)
          );
        } catch {
          // Ignore storage quota errors
        }
        shoppingSubs.forEach((cb) => cb(subscriberEntry.shoppingList));
      },
      saveBasics(next: BasicItem[]) {
        subscriberEntry.basics = next.map((item) => ({ ...item }));
        try {
          localStorage.setItem(
            `${LOCAL_BASICS_KEY}_${uid}`,
            JSON.stringify(subscriberEntry.basics)
          );
        } catch {
          // Ignore storage quota errors
        }
        basicsSubs.forEach((cb) => cb(subscriberEntry.basics));
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
 * Suscribe en tiempo real a los contenedores del usuario.
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
 * Crea un nuevo contenedor.
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
 * Suscribe en tiempo real a la Lista de la Compra manual del hogar.
 */
export function subscribeToShoppingList(
  uid: string,
  isDemoMode: boolean,
  onData: (items: ShoppingListItem[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users', uid, 'shoppingList'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items: ShoppingListItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid,
            name: data.name,
            quantity: Number(data.quantity) || 1,
            unit: data.unit || 'ud',
            checked: Boolean(data.checked),
            notes: data.notes ?? '',
            productId: data.productId ?? null,
            createdAt: timestampToIso(data.createdAt),
          };
        });
        onData(items);
      },
      (err) => onError(err)
    );
  }

  const store = getLocalStore(uid);
  store.onShopping.add(onData);
  onData(store.shoppingList);
  return () => {
    store.onShopping.delete(onData);
  };
}

/**
 * Añade manualmente un artículo a la Lista de la Compra (o suma la cantidad si ya existe sin marcar).
 */
export async function addShoppingListItem(
  uid: string,
  input: ShoppingListItemInput,
  existingItems: ShoppingListItem[],
  isDemoMode: boolean
): Promise<ShoppingListItem> {
  const valid = validateShoppingItemInput(input);

  // Si ya está en la lista pendiente con el mismo nombre y unidad, sumamos su cantidad
  const duplicatePending = existingItems.find(
    (item) =>
      !item.checked &&
      item.name.trim().toLowerCase() === valid.name.toLowerCase() &&
      item.unit === valid.unit
  );

  if (duplicatePending) {
    const nextQty = roundQuantity(duplicatePending.quantity + valid.quantity);
    await updateShoppingListItemQuantity(
      uid,
      duplicatePending.id,
      nextQty,
      isDemoMode
    );
    return { ...duplicatePending, quantity: nextQty };
  }

  const newItem: ShoppingListItem = {
    id: crypto.randomUUID(),
    uid,
    name: valid.name,
    quantity: valid.quantity,
    unit: valid.unit,
    checked: false,
    notes: valid.notes ?? '',
    productId: valid.productId ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'shoppingList', newItem.id);
    await setDoc(ref, {
      uid,
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      checked: false,
      notes: newItem.notes,
      productId: newItem.productId,
      createdAt: serverTimestamp(),
    });
    return newItem;
  }

  const store = getLocalStore(uid);
  store.saveShoppingList([newItem, ...store.shoppingList]);
  return newItem;
}

/**
 * Marca o desmarca un artículo de la lista de la compra como comprado.
 */
export async function toggleShoppingListItem(
  uid: string,
  itemId: string,
  checked: boolean,
  isDemoMode: boolean
): Promise<void> {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'shoppingList', itemId);
    await updateDoc(ref, { checked });
    return;
  }

  const store = getLocalStore(uid);
  store.saveShoppingList(
    store.shoppingList.map((item) =>
      item.id === itemId ? { ...item, checked } : item
    )
  );
}

/**
 * Cambia la cantidad a comprar de un artículo en la lista de la compra.
 */
export async function updateShoppingListItemQuantity(
  uid: string,
  itemId: string,
  newQuantity: number,
  isDemoMode: boolean
): Promise<void> {
  const rounded = roundQuantity(newQuantity);
  if (rounded <= 0) {
    await removeShoppingListItem(uid, itemId, isDemoMode);
    return;
  }

  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'shoppingList', itemId);
    await updateDoc(ref, { quantity: rounded });
    return;
  }

  const store = getLocalStore(uid);
  store.saveShoppingList(
    store.shoppingList.map((item) =>
      item.id === itemId ? { ...item, quantity: rounded } : item
    )
  );
}

/**
 * Elimina un artículo de la lista de la compra.
 */
export async function removeShoppingListItem(
  uid: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  if (!isDemoMode && isFirebaseConfigured && db) {
    await deleteDoc(doc(db, 'users', uid, 'shoppingList', itemId));
    return;
  }

  const store = getLocalStore(uid);
  store.saveShoppingList(store.shoppingList.filter((i) => i.id !== itemId));
}

/**
 * Limpia todos los artículos ya marcados como comprados de la lista de la compra.
 */
export async function clearCheckedShoppingListItems(
  uid: string,
  existingItems: ShoppingListItem[],
  isDemoMode: boolean
): Promise<void> {
  const checkedItems = existingItems.filter((i) => i.checked);
  if (checkedItems.length === 0) return;

  if (!isDemoMode && isFirebaseConfigured && db) {
    const firestoreDb = db;
    const batch = writeBatch(firestoreDb);
    checkedItems.forEach((item) => {
      batch.delete(doc(firestoreDb, 'users', uid, 'shoppingList', item.id));
    });
    await batch.commit();
    return;
  }

  const store = getLocalStore(uid);
  store.saveShoppingList(store.shoppingList.filter((i) => !i.checked));
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

/**
 * Suscribe en tiempo real a la lista de Básicos del hogar.
 */
export function subscribeToBasics(
  uid: string,
  isDemoMode: boolean,
  onData: (items: BasicItem[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users', uid, 'basics'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items: BasicItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid,
            name: data.name,
            minQuantity: Number(data.minQuantity) || 1,
            unit: data.unit || 'ud',
            category: data.category || 'Otros',
            preferredLocation: data.preferredLocation || undefined,
            notes: data.notes || undefined,
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt),
          };
        });
        onData(items);
      },
      (err) => onError(err)
    );
  }

  const store = getLocalStore(uid);
  store.onBasics.add(onData);
  onData(store.basics);
  return () => {
    store.onBasics.delete(onData);
  };
}

/**
 * Crea un nuevo producto básico.
 */
export async function createBasicItem(
  uid: string,
  input: BasicItemInput,
  isDemoMode: boolean
): Promise<BasicItem> {
  const valid = validateBasicItemInput(input);
  const now = new Date().toISOString();
  const newItem: BasicItem = {
    id: crypto.randomUUID(),
    uid,
    name: valid.name,
    minQuantity: valid.minQuantity,
    unit: valid.unit,
    category: valid.category,
    preferredLocation: valid.preferredLocation,
    notes: valid.notes,
    createdAt: now,
    updatedAt: now,
  };

  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'basics', newItem.id);
    await setDoc(ref, {
      uid,
      name: newItem.name,
      minQuantity: newItem.minQuantity,
      unit: newItem.unit,
      category: newItem.category,
      preferredLocation: newItem.preferredLocation || null,
      notes: newItem.notes || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newItem;
  }

  const store = getLocalStore(uid);
  store.saveBasics([newItem, ...store.basics]);
  return newItem;
}

/**
 * Actualiza un producto básico existente.
 */
export async function updateBasicItem(
  uid: string,
  itemId: string,
  input: BasicItemInput,
  isDemoMode: boolean
): Promise<BasicItem> {
  const valid = validateBasicItemInput(input);
  const now = new Date().toISOString();

  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'basics', itemId);
    await updateDoc(ref, {
      name: valid.name,
      minQuantity: valid.minQuantity,
      unit: valid.unit,
      category: valid.category,
      preferredLocation: valid.preferredLocation || null,
      notes: valid.notes || null,
      updatedAt: serverTimestamp(),
    });
    return {
      id: itemId,
      uid,
      name: valid.name,
      minQuantity: valid.minQuantity,
      unit: valid.unit,
      category: valid.category,
      preferredLocation: valid.preferredLocation,
      notes: valid.notes,
      createdAt: now,
      updatedAt: now,
    };
  }

  const store = getLocalStore(uid);
  const existing = store.basics.find((b) => b.id === itemId);
  if (!existing) {
    throw new ValidationError('El producto básico no existe.');
  }
  const updated: BasicItem = {
    ...existing,
    name: valid.name,
    minQuantity: valid.minQuantity,
    unit: valid.unit,
    category: valid.category,
    preferredLocation: valid.preferredLocation,
    notes: valid.notes,
    updatedAt: now,
  };
  store.saveBasics(store.basics.map((b) => (b.id === itemId ? updated : b)));
  return updated;
}

/**
 * Elimina un producto básico de la lista.
 */
export async function removeBasicItem(
  uid: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  if (!isDemoMode && isFirebaseConfigured && db) {
    const ref = doc(db, 'users', uid, 'basics', itemId);
    await deleteDoc(ref);
    return;
  }
  const store = getLocalStore(uid);
  store.saveBasics(store.basics.filter((b) => b.id !== itemId));
}

/**
 * Comprueba los productos básicos frente a los contenedores y añade automáticamente a la lista de la compra los que estén bajo mínimos.
 */
export async function syncBasicsWithShoppingList(
  uid: string,
  basics: BasicItem[],
  products: Product[],
  shoppingList: ShoppingListItem[],
  isDemoMode: boolean
): Promise<{ addedCount: number; addedNames: string[] }> {
  let addedCount = 0;
  const addedNames: string[] = [];

  for (const basic of basics) {
    const status = calculateBasicItemStatus(basic, products, shoppingList);

    // Si está por debajo de los mínimos requeridos y no está ya en la lista de la compra pendiente
    if (status.isUnderMin && !status.inShoppingList) {
      const quantityToAdd = status.missingQuantity > 0 ? status.missingQuantity : basic.minQuantity;
      await addShoppingListItem(
        uid,
        {
          name: basic.name,
          quantity: quantityToAdd,
          unit: basic.unit,
          notes: basic.preferredLocation
            ? `Básico reposición (${basic.preferredLocation})`
            : 'Básico reposición',
        },
        shoppingList,
        isDemoMode
      );
      addedCount++;
      addedNames.push(basic.name);
    }
  }

  return { addedCount, addedNames };
}

export { ProductNotFoundError };
