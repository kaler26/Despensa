import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  ALLOWED_UNITS,
  CATEGORIES,
  DEFAULT_CONTAINERS,
  MOVEMENT_TYPE_LABELS,
  MovementType,
  Product,
  ProductInput,
  StorageContainer,
  Unit,
  UNIT_LABELS,
} from '../types/inventory';

interface ProductFormModalProps {
  isOpen: boolean;
  initialProduct: Product | null;
  containers: StorageContainer[];
  defaultContainerName?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onCreateContainerInline: (name: string) => Promise<StorageContainer>;
  onSubmit: (
    input: ProductInput,
    movementType?: MovementType,
    movementNote?: string
  ) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  initialProduct,
  containers,
  defaultContainerName,
  isSubmitting,
  onClose,
  onCreateContainerInline,
  onSubmit,
}) => {
  const containerNames =
    containers.length > 0
      ? containers.map((c) => c.name)
      : [...DEFAULT_CONTAINERS];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [location, setLocation] = useState<string>(containerNames[0]);
  const [isAddingContainer, setIsAddingContainer] = useState<boolean>(false);
  const [newContainerName, setNewContainerName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<Unit>('ud');
  const [minQuantity, setMinQuantity] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('ajuste');
  const [movementNote, setMovementNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setIsAddingContainer(false);
    setNewContainerName('');

    if (initialProduct) {
      setName(initialProduct.name);
      setCategory(initialProduct.category);
      setLocation(initialProduct.location);
      setQuantity(String(initialProduct.quantity));
      setUnit(initialProduct.unit);
      setMinQuantity(String(initialProduct.minQuantity));
      setNotes(initialProduct.notes ?? '');
      setMovementType('ajuste');
      setMovementNote('');
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setLocation(
        defaultContainerName && defaultContainerName !== 'Todos'
          ? defaultContainerName
          : containerNames[0] ?? 'Nevera'
      );
      setQuantity('1');
      setUnit('ud');
      setMinQuantity('1');
      setNotes('');
      setMovementType('compra');
      setMovementNote('');
    }
  }, [isOpen, initialProduct, defaultContainerName]);

  if (!isOpen) return null;

  const parsedQuantity = Number(quantity);
  const parsedMinQuantity = Number(minQuantity);
  const quantityChanged =
    initialProduct !== null &&
    !Number.isNaN(parsedQuantity) &&
    parsedQuantity !== initialProduct.quantity;

  const handleQuickCreateContainer = async () => {
    if (!newContainerName.trim()) return;
    setFormError(null);
    try {
      const created = await onCreateContainerInline(newContainerName);
      setLocation(created.name);
      setNewContainerName('');
      setIsAddingContainer(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo crear el contenedor.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      setFormError(
        'La cantidad debe ser un número mayor o igual a 0. No se permiten existencias negativas.'
      );
      return;
    }
    if (Number.isNaN(parsedMinQuantity) || parsedMinQuantity < 0) {
      setFormError('La cantidad mínima debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      await onSubmit(
        {
          name,
          category,
          location,
          quantity: parsedQuantity,
          unit,
          minQuantity: parsedMinQuantity,
          notes,
        },
        quantityChanged ? movementType : undefined,
        quantityChanged && movementNote.trim() ? movementNote.trim() : undefined
      );
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al guardar el producto.';
      setFormError(msg);
    }
  };

  // Asegurar que la ubicación del producto en edición aparezca siempre en el selector
  const selectableContainers = Array.from(
    new Set([...containerNames, ...(location ? [location] : [])])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2
            id="modal-product-title"
            className="text-lg font-bold text-slate-900"
          >
            {initialProduct ? 'Editar alimento' : 'Nuevo alimento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label
              htmlFor="product-name"
              className="block text-sm font-semibold text-slate-700"
            >
              Nombre del alimento *
            </label>
            <input
              id="product-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Leche entera, Arroz redondo, Garbanzos..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
            />
          </div>

          {/* Contenedor y Categoría */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="product-location"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Contenedor / Ubicación *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingContainer((v) => !v)}
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Nuevo
                </button>
              </div>
              <select
                id="product-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
              >
                {selectableContainers.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              {isAddingContainer && (
                <div className="mt-2 flex gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
                  <input
                    type="text"
                    maxLength={50}
                    value={newContainerName}
                    onChange={(e) => setNewContainerName(e.target.value)}
                    placeholder="Ej. Despensa 3..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateContainer}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Crear
                  </button>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="product-category"
                className="block text-sm font-semibold text-slate-700"
              >
                Categoría *
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cantidad, Unidad y Cantidad Mínima */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="product-quantity"
                className="block text-sm font-semibold text-slate-700"
              >
                Cantidad actual *
              </label>
              <input
                id="product-quantity"
                type="number"
                required
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="product-unit"
                className="block text-sm font-semibold text-slate-700"
              >
                Unidad *
              </label>
              <select
                id="product-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
              >
                {ALLOWED_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="product-min-quantity"
                className="block text-sm font-semibold text-slate-700"
              >
                Cantidad mínima *
              </label>
              <input
                id="product-min-quantity"
                type="number"
                required
                min="0"
                step="any"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Si está editando y ha cambiado la cantidad, permitir especificar motivo en el historial */}
          {quantityChanged && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-emerald-900">
                Cambio de existencias detectado ({initialProduct?.quantity}{' '}
                {initialProduct?.unit} → {parsedQuantity} {unit}). Se registrará
                mediante transacción en el historial:
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-movement-type"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tipo de movimiento
                  </label>
                  <select
                    id="edit-movement-type"
                    value={movementType}
                    onChange={(e) =>
                      setMovementType(e.target.value as MovementType)
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {MOVEMENT_TYPE_LABELS[t]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-movement-note"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nota del movimiento (opcional)
                  </label>
                  <input
                    id="edit-movement-note"
                    type="text"
                    maxLength={200}
                    value={movementNote}
                    onChange={(e) => setMovementNote(e.target.value)}
                    placeholder="Ej. Recuento semanal"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas opcionales */}
          <div>
            <label
              htmlFor="product-notes"
              className="block text-sm font-semibold text-slate-700"
            >
              Notas (opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Marca preferida, envase, observaciones..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Guardando...'
                : initialProduct
                ? 'Guardar cambios'
                : 'Añadir alimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
