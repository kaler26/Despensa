import React from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Edit3,
  Minus,
  Plus,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Product, UNIT_STEP } from '../types/inventory';
import { getStockStatus } from '../domain/inventoryLogic';
import { renderContainerIcon } from './ContainerManagerModal';

interface ProductCardProps {
  product: Product;
  isUpdating: boolean;
  onQuickIncrement: (product: Product, step: number) => void;
  onQuickDecrement: (product: Product, step: number) => void;
  onOpenMovementModal: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isUpdating,
  onQuickIncrement,
  onQuickDecrement,
  onOpenMovementModal,
  onEdit,
  onDeleteRequest,
}) => {
  const stockStatus = getStockStatus(product);
  const step = UNIT_STEP[product.unit] ?? 1;

  // Si la cantidad actual es menor que el paso estándar (ej. quedan 0.3 kg y el paso es 0.5 kg),
  // el botón '-' descuenta exactamente lo que queda para llegar a 0 sin dar error negativo.
  const decrementStep =
    product.quantity > 0 && product.quantity < step ? product.quantity : step;

  return (
    <article
      aria-label={`Producto ${product.name}`}
      className={`rounded-2xl border bg-white p-4 shadow-xs transition-all ${
        stockStatus === 'agotado'
          ? 'border-rose-300 ring-1 ring-rose-200/70'
          : stockStatus === 'bajo'
          ? 'border-amber-300 ring-1 ring-amber-200/70'
          : 'border-slate-200 hover:border-emerald-300'
      }`}
    >
      {/* Fila superior: Nombre, insignias de estado y acciones de edición/borrado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
              {product.name}
            </h3>
            {stockStatus === 'agotado' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Agotado
              </span>
            )}
            {stockStatus === 'bajo' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Stock bajo
              </span>
            )}
          </div>

          {/* Contenedor y Categoría */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-900 border border-sky-200/70">
              {renderContainerIcon(product.location, 'h-3 w-3 text-sky-700')}
              {product.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-200/60">
              <Tag className="h-3 w-3" aria-hidden="true" />
              {product.category}
            </span>
          </div>
        </div>

        {/* Acciones de editar / borrar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(product)}
            aria-label={`Editar ${product.name}`}
            title="Editar producto"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(product)}
            aria-label={`Eliminar ${product.name}`}
            title="Eliminar producto"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Notas si existen */}
      {product.notes && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          {product.notes}
        </p>
      )}

      {/* Controles principales de existencias: cantidad, unidad y botones grandes - y + */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
        <button
          type="button"
          disabled={product.quantity <= 0 || isUpdating}
          onClick={() => onQuickDecrement(product, decrementStep)}
          aria-label={`Disminuir existencias de ${product.name} en ${decrementStep} ${product.unit}`}
          className="inline-flex min-h-[48px] min-w-[52px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-slate-800 shadow-2xs transition active:scale-95 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-extrabold tracking-tight ${
                stockStatus === 'agotado'
                  ? 'text-rose-700'
                  : stockStatus === 'bajo'
                  ? 'text-amber-800'
                  : 'text-slate-900'
              }`}
              data-testid={`quantity-${product.id}`}
            >
              {product.quantity}
            </span>
            <span className="text-sm font-semibold text-slate-600">
              {product.unit}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Mínimo: {product.minQuantity} {product.unit} (paso ±{step} {product.unit})
          </span>
        </div>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onQuickIncrement(product, step)}
          aria-label={`Aumentar existencias de ${product.name} en ${step} ${product.unit}`}
          className="inline-flex min-h-[48px] min-w-[52px] items-center justify-center rounded-xl bg-emerald-600 px-3 text-white shadow-2xs transition active:scale-95 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>

      {/* Acción rápida secundaria: Movimiento detallado */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenMovementModal(product)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          Registrar compra / consumo / ajuste
        </button>
      </div>
    </article>
  );
};
