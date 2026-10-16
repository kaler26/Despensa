export const ALLOWED_UNITS = [
  'ud',
  'kg',
  'g',
  'l',
  'ml',
  'paquete',
  'lata',
] as const;

export type Unit = (typeof ALLOWED_UNITS)[number];

export const UNIT_LABELS: Record<Unit, string> = {
  ud: 'ud (unidades)',
  kg: 'kg (kilogramos)',
  g: 'g (gramos)',
  l: 'l (litros)',
  ml: 'ml (mililitros)',
  paquete: 'paquete(s)',
  lata: 'lata(s)',
};

export const UNIT_STEP: Record<Unit, number> = {
  ud: 1,
  kg: 0.5,
  g: 100,
  l: 1,
  ml: 250,
  paquete: 1,
  lata: 1,
};

export const CATEGORIES = [
  'Lácteos y huevos',
  'Frutas y verduras',
  'Carnes y pescados',
  'Legumbres y cereales',
  'Conservas',
  'Panadería y desayuno',
  'Bebidas',
  'Congelados',
  'Aceites y condimentos',
  'Snacks y frutos secos',
  'Otros',
] as const;

export type Category = (typeof CATEGORIES)[number] | string;

export const DEFAULT_CONTAINERS = [
  'Nevera',
  'Congelador',
  'Despensa 1',
  'Despensa 2',
] as const;

export type ContainerType = 'nevera' | 'congelador' | 'despensa' | 'armario' | 'otro';

export interface StorageContainer {
  id: string;
  uid: string;
  name: string;
  type: ContainerType;
  createdAt: string;
}

export const MOVEMENT_TYPES = [
  'compra',
  'consumo',
  'ajuste',
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  compra: 'Compra / Entrada',
  consumo: 'Consumo',
  ajuste: 'Ajuste de inventario',
};

export interface Product {
  id: string;
  uid: string;
  name: string;
  category: string;
  location: string; // Nombre del contenedor (ej. "Nevera", "Despensa 1", "Despensa 2")
  quantity: number;
  unit: Unit;
  minQuantity: number;
  notes: string;
  createdAt: string; // ISO string en cliente
  updatedAt: string; // ISO string en cliente
}

export interface ProductInput {
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: Unit;
  minQuantity: number;
  notes?: string;
}

export interface Movement {
  id: string;
  uid: string;
  productId: string;
  productName: string;
  type: MovementType;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  unit: Unit;
  note: string;
  createdAt: string; // ISO string en cliente
}

export type StockStatus = 'agotado' | 'bajo' | 'ok';

export interface InventoryFilter {
  search: string;
  category: string;
  location: string;
}

export class NegativeStockError extends Error {
  constructor(
    public readonly currentQuantity: number,
    public readonly attemptedDelta: number,
    public readonly unit: Unit
  ) {
    super(
      `No se permiten existencias negativas. Stock actual: ${currentQuantity} ${unit}, cambio solicitado: ${attemptedDelta} ${unit}.`
    );
    this.name = 'NegativeStockError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`El producto con ID "${productId}" no existe.`);
    this.name = 'ProductNotFoundError';
  }
}
