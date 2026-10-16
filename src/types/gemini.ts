import { Unit } from './inventory';

export type GeminiActionType =
  | 'consume'
  | 'add_stock'
  | 'create_product'
  | 'add_to_shopping_list';

export interface GeminiAction {
  id: string;
  type: GeminiActionType;
  productName: string;
  productId?: string | null;
  quantity: number;
  unit: Unit;
  location?: string; // Nombre del contenedor
  category?: string;
  note?: string;
  selected: boolean; // Para seleccionar/deseleccionar en la previsualización
}

export interface GeminiInterpretation {
  summary: string;
  actions: GeminiAction[];
}
