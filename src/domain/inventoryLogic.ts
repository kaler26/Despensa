import {
  ALLOWED_UNITS,
  ContainerType,
  InventoryFilter,
  Movement,
  MovementType,
  NegativeStockError,
  Product,
  ProductInput,
  ProductNotFoundError,
  StockStatus,
  StorageContainer,
  Unit,
  ValidationError,
} from '../types/inventory';

/**
 * Redondea cantidades a un máximo de 3 decimales para evitar errores de coma flotante (ej. 0.1 + 0.2).
 */
export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Valida si una cadena es una unidad permitida.
 */
export function isValidUnit(unit: string): unit is Unit {
  return (ALLOWED_UNITS as readonly string[]).includes(unit);
}

/**
 * Infiere el icono/tipo de contenedor según su nombre.
 */
export function inferContainerType(name: string): ContainerType {
  const lower = name.trim().toLowerCase();
  if (lower.includes('nevera') || lower.includes('frigo')) return 'nevera';
  if (lower.includes('congelador') || lower.includes('arcón')) return 'congelador';
  if (lower.includes('despensa')) return 'despensa';
  if (lower.includes('armario') || lower.includes('alacena') || lower.includes('estante')) {
    return 'armario';
  }
  return 'otro';
}

/**
 * Valida el nombre de un contenedor (ej. "Nevera", "Despensa 1", "Despensa 2").
 */
export function validateContainerName(
  name: string,
  existingContainers: Pick<StorageContainer, 'id' | 'name'>[],
  excludeId?: string
): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    throw new ValidationError('El nombre del contenedor es obligatorio.');
  }
  if (trimmed.length > 50) {
    throw new ValidationError(
      'El nombre del contenedor no puede superar los 50 caracteres.'
    );
  }
  const duplicate = existingContainers.some(
    (c) =>
      c.id !== excludeId &&
      c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    throw new ValidationError(
      `Ya existe un contenedor llamado "${trimmed}".`
    );
  }
  return trimmed;
}

/**
 * Valida todos los campos de entrada de un producto según las reglas de negocio y Firestore.
 */
export function validateProductInput(input: ProductInput): ProductInput {
  const name = (input.name ?? '').trim();
  const category = (input.category ?? '').trim();
  const location = (input.location ?? '').trim();
  const notes = (input.notes ?? '').trim();

  if (!name) {
    throw new ValidationError('El nombre del producto es obligatorio.');
  }
  if (name.length > 100) {
    throw new ValidationError('El nombre no puede superar los 100 caracteres.');
  }
  if (!category) {
    throw new ValidationError('La categoría es obligatoria.');
  }
  if (category.length > 50) {
    throw new ValidationError('La categoría no puede superar los 50 caracteres.');
  }
  if (!location) {
    throw new ValidationError('El contenedor / ubicación es obligatorio.');
  }
  if (location.length > 50) {
    throw new ValidationError('El contenedor no puede superar los 50 caracteres.');
  }
  if (!isValidUnit(input.unit)) {
    throw new ValidationError(
      `La unidad "${input.unit}" no es válida. Unidades permitidas: ${ALLOWED_UNITS.join(', ')}.`
    );
  }
  if (
    typeof input.quantity !== 'number' ||
    Number.isNaN(input.quantity) ||
    !Number.isFinite(input.quantity)
  ) {
    throw new ValidationError('La cantidad debe ser un número válido.');
  }
  if (input.quantity < 0) {
    throw new NegativeStockError(0, input.quantity, input.unit);
  }
  if (input.quantity > 1_000_000) {
    throw new ValidationError('La cantidad supera el límite máximo permitido.');
  }
  if (
    typeof input.minQuantity !== 'number' ||
    Number.isNaN(input.minQuantity) ||
    !Number.isFinite(input.minQuantity)
  ) {
    throw new ValidationError('La cantidad mínima debe ser un número válido.');
  }
  if (input.minQuantity < 0) {
    throw new ValidationError('La cantidad mínima no puede ser negativa.');
  }
  if (input.minQuantity > 1_000_000) {
    throw new ValidationError('La cantidad mínima supera el límite máximo permitido.');
  }
  if (notes.length > 500) {
    throw new ValidationError('Las notas no pueden superar los 500 caracteres.');
  }

  return {
    name,
    category,
    location,
    quantity: roundQuantity(input.quantity),
    unit: input.unit,
    minQuantity: roundQuantity(input.minQuantity),
    notes,
  };
}

/**
 * Calcula la nueva cantidad aplicando un delta y garantizando que nunca sea negativa.
 */
export function computeNewQuantity(
  currentQuantity: number,
  delta: number,
  unit: Unit
): number {
  if (typeof delta !== 'number' || Number.isNaN(delta) || !Number.isFinite(delta)) {
    throw new ValidationError('El cambio de cantidad debe ser un número válido.');
  }
  const next = roundQuantity(currentQuantity + delta);
  if (next < 0) {
    throw new NegativeStockError(currentQuantity, delta, unit);
  }
  if (next > 1_000_000) {
    throw new ValidationError('La cantidad resultante supera el máximo permitido.');
  }
  return next;
}

/**
 * Determina el estado de existencias de un producto (agotado, bajo mínimo u ok).
 */
export function getStockStatus(product: Pick<Product, 'quantity' | 'minQuantity'>): StockStatus {
  if (product.quantity <= 0) {
    return 'agotado';
  }
  if (product.quantity <= product.minQuantity) {
    return 'bajo';
  }
  return 'ok';
}

/**
 * Devuelve true si el producto está agotado o por debajo (o igual) del stock mínimo.
 */
export function isLowOrOutOfStock(
  product: Pick<Product, 'quantity' | 'minQuantity'>
): boolean {
  return getStockStatus(product) !== 'ok';
}

/**
 * Filtra y ordena la lista de productos por buscador (nombre/notas/contenedor), categoría y contenedor.
 */
export function filterProducts(
  products: Product[],
  filter: InventoryFilter
): Product[] {
  const searchNormalized = filter.search.trim().toLowerCase();
  const categoryFilter = filter.category.trim();
  const locationFilter = filter.location.trim();

  return products
    .filter((product) => {
      if (categoryFilter && categoryFilter !== 'Todas' && product.category !== categoryFilter) {
        return false;
      }
      if (locationFilter && locationFilter !== 'Todos' && locationFilter !== 'Todas' && product.location !== locationFilter) {
        return false;
      }
      if (searchNormalized) {
        const matchesName = product.name.toLowerCase().includes(searchNormalized);
        const matchesNotes = product.notes.toLowerCase().includes(searchNormalized);
        const matchesCategory = product.category.toLowerCase().includes(searchNormalized);
        const matchesLocation = product.location.toLowerCase().includes(searchNormalized);
        if (!matchesName && !matchesNotes && !matchesCategory && !matchesLocation) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Obtiene la lista automática de productos agotados o por debajo del mínimo,
 * priorizando primero los agotados y luego por orden alfabético.
 */
export function getLowStockProducts(products: Product[]): Product[] {
  return products
    .filter(isLowOrOutOfStock)
    .sort((a, b) => {
      const aOut = a.quantity === 0 ? 0 : 1;
      const bOut = b.quantity === 0 ? 0 : 1;
      if (aOut !== bOut) return aOut - bOut;
      return a.name.localeCompare(b.name, 'es');
    });
}

/**
 * Interfaz de contexto transaccional para desacoplar la lógica transaccional
 * y permitir pruebas deterministas así como ejecución en Firestore runTransaction.
 */
export interface TransactionStoreAdapter {
  getProduct(uid: string, productId: string): Promise<Product | null>;
  saveProduct(uid: string, product: Product): Promise<void>;
  createMovement(uid: string, movement: Movement): Promise<void>;
}

export interface TransactionalEngine {
  runTransaction<T>(
    fn: (tx: TransactionStoreAdapter) => Promise<T>
  ): Promise<T>;
}

/**
 * Crea una instancia de motor transaccional en memoria (con bloqueo mutex serie para simular aislamiento atómico).
 */
export function createInMemoryTransactionalEngine(
  initialProducts: Product[] = [],
  initialMovements: Movement[] = [],
  onChange?: (products: Product[], movements: Movement[]) => void
): {
  engine: TransactionalEngine;
  getProducts: () => Product[];
  getMovements: () => Movement[];
  deleteProduct: (uid: string, productId: string) => Promise<void>;
  renameContainerInProducts: (uid: string, oldName: string, newName: string) => Promise<void>;
} {
  let productsMap = new Map<string, Product>(
    initialProducts.map((p) => [`${p.uid}:${p.id}`, { ...p }])
  );
  let movementsList: Movement[] = [...initialMovements];
  let lockPromise: Promise<unknown> = Promise.resolve();

  const notify = () => {
    if (onChange) {
      onChange(
        Array.from(productsMap.values()).map((p) => ({ ...p })),
        movementsList.map((m) => ({ ...m }))
      );
    }
  };

  const engine: TransactionalEngine = {
    async runTransaction<T>(
      fn: (tx: TransactionStoreAdapter) => Promise<T>
    ): Promise<T> {
      const previousLock = lockPromise;
      let releaseLock!: () => void;
      lockPromise = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      await previousLock;

      const stagedProducts = new Map<string, Product>();
      for (const [k, v] of productsMap.entries()) {
        stagedProducts.set(k, { ...v });
      }
      const stagedMovements: Movement[] = [];

      const txAdapter: TransactionStoreAdapter = {
        async getProduct(uid: string, productId: string): Promise<Product | null> {
          const item = stagedProducts.get(`${uid}:${productId}`);
          return item ? { ...item } : null;
        },
        async saveProduct(uid: string, product: Product): Promise<void> {
          if (product.quantity < 0) {
            throw new NegativeStockError(0, product.quantity, product.unit);
          }
          stagedProducts.set(`${uid}:${product.id}`, { ...product });
        },
        async createMovement(_uid: string, movement: Movement): Promise<void> {
          stagedMovements.unshift({ ...movement });
        },
      };

      try {
        const result = await fn(txAdapter);
        productsMap = stagedProducts;
        movementsList = [...stagedMovements, ...movementsList];
        notify();
        return result;
      } finally {
        releaseLock();
      }
    },
  };

  return {
    engine,
    getProducts: () => Array.from(productsMap.values()).map((p) => ({ ...p })),
    getMovements: () => movementsList.map((m) => ({ ...m })),
    async deleteProduct(uid: string, productId: string) {
      const key = `${uid}:${productId}`;
      if (!productsMap.has(key)) {
        throw new ProductNotFoundError(productId);
      }
      productsMap.delete(key);
      notify();
    },
    async renameContainerInProducts(uid: string, oldName: string, newName: string) {
      const now = new Date().toISOString();
      for (const [k, prod] of productsMap.entries()) {
        if (prod.uid === uid && prod.location === oldName) {
          productsMap.set(k, { ...prod, location: newName, updatedAt: now });
        }
      }
      notify();
    },
  };
}

/**
 * Ejecuta la creación transaccional de un producto y registra su movimiento inicial si quantity > 0.
 */
export async function executeCreateProductTransaction(
  engine: TransactionalEngine,
  uid: string,
  input: ProductInput,
  generateId: () => string = () => crypto.randomUUID(),
  nowIso: () => string = () => new Date().toISOString()
): Promise<Product> {
  if (!uid) {
    throw new ValidationError('El usuario debe estar autenticado.');
  }
  const validated = validateProductInput(input);
  const timestamp = nowIso();
  const productId = generateId();

  return engine.runTransaction(async (tx) => {
    const newProduct: Product = {
      id: productId,
      uid,
      name: validated.name,
      category: validated.category,
      location: validated.location,
      quantity: validated.quantity,
      unit: validated.unit,
      minQuantity: validated.minQuantity,
      notes: validated.notes ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await tx.saveProduct(uid, newProduct);

    if (validated.quantity > 0) {
      const movement: Movement = {
        id: generateId(),
        uid,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'compra',
        delta: validated.quantity,
        previousQuantity: 0,
        newQuantity: validated.quantity,
        unit: newProduct.unit,
        note: 'Stock inicial al crear el producto',
        createdAt: timestamp,
      };
      await tx.createMovement(uid, movement);
    }

    return newProduct;
  });
}

/**
 * Ejecuta una modificación atómica de existencias (compra, consumo o ajuste)
 * dentro de una transacción, impidiendo existencias negativas y registrando el historial.
 */
export async function executeStockChangeTransaction(
  engine: TransactionalEngine,
  params: {
    uid: string;
    productId: string;
    delta: number;
    type?: MovementType;
    note?: string;
  },
  generateId: () => string = () => crypto.randomUUID(),
  nowIso: () => string = () => new Date().toISOString()
): Promise<{ product: Product; movement: Movement }> {
  const { uid, productId, delta } = params;
  if (!uid) {
    throw new ValidationError('El usuario debe estar autenticado.');
  }
  if (delta === 0) {
    throw new ValidationError('La variación de cantidad no puede ser 0.');
  }

  return engine.runTransaction(async (tx) => {
    const existing = await tx.getProduct(uid, productId);
    if (!existing) {
      throw new ProductNotFoundError(productId);
    }

    const newQuantity = computeNewQuantity(existing.quantity, delta, existing.unit);
    const timestamp = nowIso();

    const inferredType: MovementType =
      params.type ?? (delta > 0 ? 'compra' : 'consumo');

    const defaultNote: Record<MovementType, string> = {
      compra: 'Reposición de existencias (+)',
      consumo: 'Consumo registrado (-)',
      ajuste: 'Ajuste manual de inventario',
    };

    const noteText = (params.note ?? defaultNote[inferredType]).trim().slice(0, 300);

    const updatedProduct: Product = {
      ...existing,
      quantity: newQuantity,
      updatedAt: timestamp,
    };

    const movement: Movement = {
      id: generateId(),
      uid,
      productId: existing.id,
      productName: existing.name,
      type: inferredType,
      delta: roundQuantity(delta),
      previousQuantity: existing.quantity,
      newQuantity,
      unit: existing.unit,
      note: noteText,
      createdAt: timestamp,
    };

    await tx.saveProduct(uid, updatedProduct);
    await tx.createMovement(uid, movement);

    return { product: updatedProduct, movement };
  });
}

/**
 * Ejecuta la edición de un producto dentro de una transacción.
 * Si la cantidad cambia respecto al valor almacenado en la base de datos,
 * valida que no sea negativa y registra automáticamente un movimiento en el historial.
 */
export async function executeUpdateProductTransaction(
  engine: TransactionalEngine,
  params: {
    uid: string;
    productId: string;
    input: ProductInput;
    movementType?: MovementType;
    movementNote?: string;
  },
  generateId: () => string = () => crypto.randomUUID(),
  nowIso: () => string = () => new Date().toISOString()
): Promise<Product> {
  const { uid, productId, input } = params;
  if (!uid) {
    throw new ValidationError('El usuario debe estar autenticado.');
  }
  const validated = validateProductInput(input);

  return engine.runTransaction(async (tx) => {
    const existing = await tx.getProduct(uid, productId);
    if (!existing) {
      throw new ProductNotFoundError(productId);
    }

    const timestamp = nowIso();
    const delta = roundQuantity(validated.quantity - existing.quantity);

    const updatedProduct: Product = {
      ...existing,
      name: validated.name,
      category: validated.category,
      location: validated.location,
      quantity: validated.quantity,
      unit: validated.unit,
      minQuantity: validated.minQuantity,
      notes: validated.notes ?? '',
      updatedAt: timestamp,
    };

    await tx.saveProduct(uid, updatedProduct);

    if (delta !== 0) {
      const movementType: MovementType = params.movementType ?? 'ajuste';
      const movement: Movement = {
        id: generateId(),
        uid,
        productId: existing.id,
        productName: updatedProduct.name,
        type: movementType,
        delta,
        previousQuantity: existing.quantity,
        newQuantity: validated.quantity,
        unit: updatedProduct.unit,
        note: (
          params.movementNote ??
          `Ajuste al editar producto (${existing.quantity} → ${validated.quantity} ${updatedProduct.unit})`
        )
          .trim()
          .slice(0, 300),
        createdAt: timestamp,
      };
      await tx.createMovement(uid, movement);
    }

    return updatedProduct;
  });
}
