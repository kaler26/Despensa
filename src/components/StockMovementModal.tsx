import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  MOVEMENT_TYPE_LABELS,
  MovementType,
  Product,
  UNIT_STEP,
} from '../types/inventory';
import { roundQuantity } from '../domain/inventoryLogic';

interface StockMovementModalProps {
  product: Product | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirmMovement: (
    product: Product,
    delta: number,
    type: MovementType,
    note: string
  ) => Promise<void>;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  product,
  isSubmitting,
  onClose,
  onConfirmMovement,
}) => {
  const [type, setType] = useState<MovementType>('compra');
  const [amount, setAmount] = useState<string>('1');
  const [direction, setDirection] = useState<'add' | 'subtract'>('add');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const defaultStep = UNIT_STEP[product.unit] ?? 1;
    setType('compra');
    setDirection('add');
    setAmount(String(defaultStep));
    setNote('');
    setError(null);
  }, [product]);

  if (!product) return null;

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    if (newType === 'compra') {
      setDirection('add');
    } else if (newType === 'consumo') {
      setDirection('subtract');
    }
  };

  const parsedAmount = Number(amount);
  const signedDelta =
    type === 'compra'
      ? Math.abs(parsedAmount)
      : type === 'consumo'
      ? -Math.abs(parsedAmount)
      : direction === 'add'
      ? Math.abs(parsedAmount)
      : -Math.abs(parsedAmount);

  const previewQuantity = Number.isNaN(parsedAmount)
    ? product.quantity
    : roundQuantity(product.quantity + signedDelta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Introduce una cantidad mayor que 0.');
      return;
    }
    if (previewQuantity < 0) {
      setError(
        `No se permiten existencias negativas. Actualmente tienes ${product.quantity} ${product.unit}.`
      );
      return;
    }

    try {
      await onConfirmMovement(product, signedDelta, type, note);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el movimiento.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-movement-title"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2
              id="modal-movement-title"
              className="text-lg font-bold text-slate-900"
            >
              Registrar movimiento
            </h2>
            <p className="text-xs text-slate-600">
              {product.name} ({product.location}) — Stock actual:{' '}
              <strong>
                {product.quantity} {product.unit}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de movimiento"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Tipo de operación
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition ${
                      type === t
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {MOVEMENT_TYPE_LABELS[t]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Si es ajuste manual, permitir elegir si suma o resta */}
          {type === 'ajuste' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Sentido del ajuste
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('add')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    direction === 'add'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  + Añadir al stock
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('subtract')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    direction === 'subtract'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  - Descontar del stock
                </button>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <label
              htmlFor="movement-amount"
              className="block text-sm font-semibold text-slate-700"
            >
              Cantidad ({product.unit}) *
            </label>
            <input
              id="movement-amount"
              type="number"
              required
              min="0.001"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
            <p
              className={`mt-1.5 text-xs font-medium ${
                previewQuantity < 0 ? 'text-rose-700' : 'text-slate-600'
              }`}
            >
              Stock resultante:{' '}
              <strong>
                {previewQuantity} {product.unit}
              </strong>
            </p>
          </div>

          {/* Nota */}
          <div>
            <label
              htmlFor="movement-note"
              className="block text-sm font-semibold text-slate-700"
            >
              Nota o motivo (opcional)
            </label>
            <input
              id="movement-note"
              type="text"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Compra semanal, receta familiar, recuento..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || previewQuantity < 0}
              className="min-h-[44px] rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
