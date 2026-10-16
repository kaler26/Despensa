import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Product } from '../types/inventory';

interface ConfirmDeleteModalProps {
  product: Product | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (product: Product) => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  product,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-desc"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="confirm-delete-title"
              className="text-base font-bold text-slate-900"
            >
              ¿Eliminar &ldquo;{product.name}&rdquo;?
            </h2>
            <p
              id="confirm-delete-desc"
              className="mt-1.5 text-sm text-slate-600"
            >
              Esta acción eliminará el producto ({product.quantity}{' '}
              {product.unit} en {product.location}) de tu inventario. El
              historial de movimientos previos se conservará.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm(product)}
            className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar producto'}
          </button>
        </div>
      </div>
    </div>
  );
};
