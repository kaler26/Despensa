import { describe, expect, it } from 'vitest';
import {
  ALLOWED_UNITS,
  DEFAULT_CONTAINERS,
  NegativeStockError,
  ProductInput,
  ProductNotFoundError,
  ValidationError,
} from '../types/inventory';
import {
  computeNewQuantity,
  createInMemoryTransactionalEngine,
  executeCreateProductTransaction,
  executeStockChangeTransaction,
  executeUpdateProductTransaction,
  filterProducts,
  getLowStockProducts,
  getStockStatus,
  inferContainerType,
  validateContainerName,
  validateProductInput,
} from '../domain/inventoryLogic';

describe('Operaciones de Inventario y Contenedores — Mi Despensa', () => {
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
        minQuantity: 1,
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

  it('impide crear productos con existencias negativas o cantidad mínima negativa', () => {
    expect(() =>
      validateProductInput({
        name: 'Leche',
        category: 'Lácteos y huevos',
        location: 'Nevera',
        quantity: -1,
        unit: 'l',
        minQuantity: 2,
      })
    ).toThrow(NegativeStockError);

    expect(() =>
      validateProductInput({
        name: 'Leche',
        category: 'Lácteos y huevos',
        location: 'Nevera',
        quantity: 2,
        unit: 'l',
        minQuantity: -1,
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
      minQuantity: 1,
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
      minQuantity: 2,
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
      minQuantity: 1,
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
      minQuantity: 2,
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
      minQuantity: 4,
    });

    const updatedInput: ProductInput = {
      name: 'Yogures naturales bio',
      category: 'Lácteos y huevos',
      location: 'Nevera',
      quantity: 3,
      unit: 'ud',
      minQuantity: 4,
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

  it('detecta automáticamente productos agotados y por debajo del mínimo', async () => {
    const store = createInMemoryTransactionalEngine();

    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Harina de trigo',
      category: 'Panadería y desayuno',
      location: 'Despensa 1',
      quantity: 0,
      unit: 'kg',
      minQuantity: 1,
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Café molido',
      category: 'Panadería y desayuno',
      location: 'Despensa 2',
      quantity: 200,
      unit: 'g',
      minQuantity: 250,
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Agua mineral',
      category: 'Bebidas',
      location: 'Despensa 2',
      quantity: 12,
      unit: 'l',
      minQuantity: 4,
    });

    const all = store.getProducts();
    const lowStock = getLowStockProducts(all);

    expect(lowStock).toHaveLength(2);
    expect(lowStock[0].name).toBe('Harina de trigo');
    expect(getStockStatus(lowStock[0])).toBe('agotado');
    expect(lowStock[1].name).toBe('Café molido');
    expect(getStockStatus(lowStock[1])).toBe('bajo');
  });

  it('filtra productos por contenedor (Nevera, Despensa 1, Despensa 2), categoría y búsqueda', async () => {
    const store = createInMemoryTransactionalEngine();
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Guisantes finos',
      category: 'Congelados',
      location: 'Congelador',
      quantity: 500,
      unit: 'g',
      minQuantity: 200,
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Lentejas pardinas',
      category: 'Legumbres y cereales',
      location: 'Despensa 1',
      quantity: 1,
      unit: 'kg',
      minQuantity: 0.5,
    });
    await executeCreateProductTransaction(store.engine, testUid, {
      name: 'Conserva de mejillones',
      category: 'Conservas',
      location: 'Despensa 2',
      quantity: 3,
      unit: 'lata',
      minQuantity: 2,
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
});
