import { describe, expect, it } from 'vitest';
import {
  ALLOWED_UNITS,
  BasicItem,
  DEFAULT_CONTAINERS,
  NegativeStockError,
  Product,
  ProductInput,
  ProductNotFoundError,
  ShoppingListItem,
  ValidationError,
} from '../types/inventory';
import {
  calculateBasicItemStatus,
  computeNewQuantity,
  createInMemoryTransactionalEngine,
  executeCreateProductTransaction,
  executeStockChangeTransaction,
  executeUpdateProductTransaction,
  filterProducts,
  getStockStatus,
  inferContainerType,
  normalizeString,
  validateBasicItemInput,
  validateContainerName,
  validateProductInput,
  validateShoppingItemInput,
} from '../domain/inventoryLogic';

describe('Operaciones de Inventario, Contenedores y Lista de la Compra — Mi Despensa', () => {
  const testUid = 'user-test-123';

  it('valida todas las unidades permitidas: ud, kg, g, l, ml, paquete y lata', () => {
    expect(ALLOWED_UNITS).toEqual(['ud', 'kg', 'g', 'l', 'ml', 'paquete', 'lata']);

    for (const unit of ALLOWED_UNITS) {
      const valid = validateProductInput({
        name: `Producto en ${unit}`,
        category: 'Conservas',
        location: 'Despensa 1',
        quantity: 2,
        unit,
        notes: 'Nota de prueba',
      });
      expect(valid.unit).toBe(unit);
    }
  });

  it('incluye contenedores por defecto tipo Nevera, Congelador, Despensa 1 y Despensa 2 y valida nuevos contenedores', () => {
    expect(DEFAULT_CONTAINERS).toEqual([
      'Nevera',
      'Congelador',
      'Despensa 1',
      'Despensa 2',
    ]);
    expect(inferContainerType('Nevera principal')).toBe('nevera');
    expect(inferContainerType('Despensa 1')).toBe('despensa');
    expect(inferContainerType('Despensa 2')).toBe('despensa');
    expect(inferContainerType('Congelador')).toBe('congelador');

    const existing = [
      { id: 'c1', name: 'Nevera' },
      { id: 'c2', name: 'Despensa 1' },
    ];
    expect(validateContainerName('Despensa 2', existing)).toBe('Despensa 2');
    expect(() => validateContainerName('despensa 1', existing)).toThrow(
      ValidationError
    );
  });

  it('impide crear productos con existencias negativas', () => {
    expect(() =>
      validateProductInput({
        name: 'Leche',
        category: 'Lácteos y huevos',
        location: 'Nevera',
        quantity: -1,
        unit: 'l',
      })
    ).toThrow(NegativeStockError);
  });

  it('valida artículos manuales para la lista de la compra', () => {
    const valid = validateShoppingItemInput({
      name: '  Huevos camperos  ',
      quantity: 2,
      unit: 'paquete',
      notes: '  Tamaño L  ',
    });
    expect(valid.name).toBe('Huevos camperos');
    expect(valid.quantity).toBe(2);
    expect(valid.unit).toBe('paquete');
    expect(valid.notes).toBe('Tamaño L');

    expect(() =>
      validateShoppingItemInput({
        name: '',
        quantity: 1,
        unit: 'ud',
      })
    ).toThrow(ValidationError);

    expect(() =>
      validateShoppingItemInput({
        name: 'Pan',
        quantity: 0,
        unit: 'ud',
      })
    ).toThrow(ValidationError);
  });

  it('crea un producto transaccionalmente en un contenedor y genera movimiento de compra inicial si quantity > 0', async () => {
    const store = createInMemoryTransactionalEngine();
    const product = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Aceite de oliva virgen extra',
      category: 'Aceites y condimentos',
      location: 'Despensa 1',
      quantity: 3,
      unit: 'l',
      notes: 'Garrafa de 1L',
    });

    expect(product.name).toBe('Aceite de oliva virgen extra');
    expect(product.location).toBe('Despensa 1');
    expect(product.quantity).toBe(3);
    expect(store.getProducts()).toHaveLength(1);

    const movements = store.getMovements();
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('compra');
    expect(movements[0].delta).toBe(3);
    expect(movements[0].previousQuantity).toBe(0);
    expect(movements[0].newQuantity).toBe(3);
  });

  it('incrementa (+) y decrementa (-) existencias mediante transacciones y registra el historial', async () => {
    const store = createInMemoryTransactionalEngine();
    const created = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Tomate triturado',
      category: 'Conservas',
      location: 'Despensa 2',
      quantity: 2,
      unit: 'lata',
    });

    const afterAdd = await executeStockChangeTransaction(store.engine, {
      uid: testUid,
      productId: created.id,
      delta: 1,
      type: 'compra',
      note: 'Compra rápida',
    });
    expect(afterAdd.product.quantity).toBe(3);
    expect(afterAdd.movement.type).toBe('compra');

    const afterConsume = await executeStockChangeTransaction(store.engine, {
      uid: testUid,
      productId: created.id,
      delta: -2,
      type: 'consumo',
      note: 'Salsa boloñesa',
    });
    expect(afterConsume.product.quantity).toBe(1);
    expect(afterConsume.movement.type).toBe('consumo');
    expect(afterConsume.movement.previousQuantity).toBe(3);
    expect(afterConsume.movement.newQuantity).toBe(1);
  });

  it('aborta la transacción y lanza NegativeStockError si se intenta dejar stock negativo', async () => {
    const store = createInMemoryTransactionalEngine();
    const created = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Arroz basmati',
      category: 'Legumbres y cereales',
      location: 'Despensa 1',
      quantity: 1,
      unit: 'paquete',
    });

    await expect(
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: -2,
        type: 'consumo',
      })
    ).rejects.toThrow(NegativeStockError);

    expect(store.getProducts()[0].quantity).toBe(1);
    expect(store.getMovements()).toHaveLength(1);
  });

  it('mantiene la consistencia de existencias ante múltiples operaciones transaccionales concurrentes', async () => {
    const store = createInMemoryTransactionalEngine();
    const created = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Leche sin lactosa',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 5,
      unit: 'l',
    });

    await Promise.all([
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: 2,
        type: 'compra',
      }),
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: -1,
        type: 'consumo',
      }),
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: -3,
        type: 'consumo',
      }),
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: 1,
        type: 'compra',
      }),
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: created.id,
        delta: -2,
        type: 'ajuste',
      }),
    ]);

    expect(store.getProducts()[0].quantity).toBe(2);
    expect(store.getMovements()).toHaveLength(6);
  });

  it('registra movimiento de ajuste y permite cambiar de contenedor al editar un producto', async () => {
    const store = createInMemoryTransactionalEngine();
    const created = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Yogures naturales',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 6,
      unit: 'ud',
    });

    const updatedInput: ProductInput = {
      name: 'Yogures naturales bio',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 3,
      unit: 'ud',
      notes: 'Ajuste tras recuento',
    };

    const updated = await executeUpdateProductTransaction(store.engine, {
      uid: testUid,
      productId: created.id,
      input: updatedInput,
      movementType: 'ajuste',
      movementNote: 'Recuento de nevera',
    });

    expect(updated.name).toBe('Yogures naturales bio');
    expect(updated.quantity).toBe(3);

    await store.renameContainerInProducts(testUid, 'Nevera', 'Nevera Cocina');
    expect(store.getProducts()[0].location).toBe('Nevera Cocina');
  });

  it('identifica si un producto está agotado (0) o con existencias disponibles', async () => {
    const store = createInMemoryTransactionalEngine();

    const agotado = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Harina de trigo',
      category: 'Panadería y desayuno',
      location: 'Despensa 1',
      quantity: 0,
      unit: 'kg',
    });
    const disponible = await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Agua mineral',
      category: 'Bebidas',
      location: 'Despensa 2',
      quantity: 12,
      unit: 'l',
    });

    expect(getStockStatus(agotado)).toBe('agotado');
    expect(getStockStatus(disponible)).toBe('ok');
  });

  it('filtra productos por contenedor (Nevera, Despensa 1, Despensa 2), categoría y búsqueda', async () => {
    const store = createInMemoryTransactionalEngine();
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Guisantes finos',
      category: 'Congelados',
      location: 'Congelador',
      quantity: 500,
      unit: 'g',
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Lentejas pardinas',
      category: 'Legumbres y cereales',
      location: 'Despensa 1',
      quantity: 1,
      unit: 'kg',
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Conserva de mejillones',
      category: 'Conservas',
      location: 'Despensa 2',
      quantity: 3,
      unit: 'lata',
    });

    const products = store.getProducts();
    expect(
      filterProducts(products, {
        search: '',
        category: 'Todas',
        location: 'Despensa 1',
      })
    ).toHaveLength(1);

    expect(
      filterProducts(products, {
        search: '',
        category: 'Todas',
        location: 'Despensa 2',
      })[0].name
    ).toBe('Conserva de mejillones');

    expect(computeNewQuantity(1.2, 0.3, 'kg')).toBe(1.5);
  });

  it('lanza ProductNotFoundError al operar o eliminar un producto inexistente', async () => {
    const store = createInMemoryTransactionalEngine();
    await expect(
      executeStockChangeTransaction(store.engine, {
        uid: testUid,
        productId: 'id-inexistente',
        delta: 1,
      })
    ).rejects.toThrow(ProductNotFoundError);

    await expect(store.deleteProduct(testUid, 'id-inexistente')).rejects.toThrow(
      ProductNotFoundError
    );
  });

  describe('Pestaña de Básicos — Control de Mínimos y Auto-Reposición', () => {
    it('normaliza cadenas eliminando acentos y espacios superfluos', () => {
      expect(normalizeString('  Leche Entera  ')).toBe('leche entera');
      expect(normalizeString('Café molido')).toBe('cafe molido');
      expect(normalizeString('Plátanos')).toBe('platanos');
    });

    it('valida datos de entrada para un producto básico indispensable', () => {
      const valid = validateBasicItemInput({
        name: '  Leche entera  ',
        minQuantity: 3,
        unit: 'l',
        category: 'Lácteos y huevos',
        preferredLocation: 'Nevera',
        notes: '  Desnatada o entera  ',
      });

      expect(valid.name).toBe('Leche entera');
      expect(valid.minQuantity).toBe(3);
      expect(valid.unit).toBe('l');
      expect(valid.category).toBe('Lácteos y huevos');
      expect(valid.preferredLocation).toBe('Nevera');
      expect(valid.notes).toBe('Desnatada o entera');

      // Nombre vacío
      expect(() =>
        validateBasicItemInput({
          name: '',
          minQuantity: 1,
          unit: 'l',
        })
      ).toThrow(ValidationError);

      // Cantidad mínima <= 0
      expect(() =>
        validateBasicItemInput({
          name: 'Huevos',
          minQuantity: 0,
          unit: 'ud',
        })
      ).toThrow(ValidationError);
    });

    it('calcula el estado del básico sumando stock de todos los contenedores', () => {
      const basicLeche: BasicItem = {
        id: 'b1',
        uid: testUid,
        name: 'Leche entera',
        minQuantity: 4,
        unit: 'l',
        category: 'Lácteos y huevos',
        preferredLocation: 'Nevera',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProducts: Product[] = [
        {
          id: 'p1',
          uid: testUid,
          name: 'Leche entera Pascual',
          category: 'Lácteos y huevos',
          location: 'Nevera',
          quantity: 2,
          unit: 'l',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'p2',
          uid: testUid,
          name: 'Leche Entera Central',
          category: 'Lácteos y huevos',
          location: 'Despensa 1',
          quantity: 1,
          unit: 'l',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockShoppingList: ShoppingListItem[] = [];

      // Total en contenedores = 2 (Nevera) + 1 (Despensa 1) = 3 l. Mínimo es 4 l.
      const status = calculateBasicItemStatus(basicLeche, mockProducts, mockShoppingList);

      expect(status.currentQuantity).toBe(3);
      expect(status.basicItem.minQuantity).toBe(4);
      expect(status.isUnderMin).toBe(true);
      expect(status.missingQuantity).toBe(1);
      expect(status.inShoppingList).toBe(false);
      expect(status.matchingProducts.map((p) => p.location)).toEqual(['Nevera', 'Despensa 1']);
    });

    it('detecta si el básico que falta ya está en la lista de la compra', () => {
      const basicCafe: BasicItem = {
        id: 'b2',
        uid: testUid,
        name: 'Café',
        minQuantity: 2,
        unit: 'paquete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProducts: Product[] = []; // No hay en ningún contenedor

      const mockShoppingList: ShoppingListItem[] = [
        {
          id: 's1',
          uid: testUid,
          name: 'Café molido natural',
          quantity: 2,
          unit: 'paquete',
          checked: false,
          notes: 'Básico',
          productId: null,
          createdAt: new Date().toISOString(),
        },
      ];

      const status = calculateBasicItemStatus(basicCafe, mockProducts, mockShoppingList);

      expect(status.currentQuantity).toBe(0);
      expect(status.isUnderMin).toBe(true);
      expect(status.missingQuantity).toBe(2);
      expect(status.inShoppingList).toBe(true);
    });

    it('no marca bajo mínimos si el stock en contenedores cubre el mínimo requerido', () => {
      const basicHuevos: BasicItem = {
        id: 'b3',
        uid: testUid,
        name: 'Huevos',
        minQuantity: 6,
        unit: 'ud',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProducts: Product[] = [
        {
          id: 'p3',
          uid: testUid,
          name: 'Docena de huevos camperos',
          category: 'Lácteos y huevos',
          location: 'Nevera',
          quantity: 12,
          unit: 'ud',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const status = calculateBasicItemStatus(basicHuevos, mockProducts, []);

      expect(status.currentQuantity).toBe(12);
      expect(status.isUnderMin).toBe(false);
      expect(status.missingQuantity).toBe(0);
    });
  });
});
