import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  ALLOWED_UNITS,
  BasicItem,
  BasicItemInput,
  CATEGORIES,
  DEFAULT_CONTAINERS,
  StorageContainer,
  Unit,
  UNIT_LABELS,
} from '../types/inventory';

interface BasicItemFormModalProps {
  isOpen: boolean;
  initialItem: BasicItem | null;
  containers: StorageContainer[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: BasicItemInput) => Promise<void>;
}

export const BasicItemFormModal: React.FC<BasicItemFormModalProps> = ({
  isOpen,
  initialItem,
  containers,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const containerNames =
    containers.length > 0
      ? containers.map((c) => c.name)
      : [...DEFAULT_CONTAINERS];

  const [name, setName] = useState('');
  const [minQuantity, setMinQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('ud');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [preferredLocation, setPreferredLocation] = useState<string>(
    containerNames[0] || 'Nevera'
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (initialItem) {
      setName(initialItem.name);
      setMinQuantity(String(initialItem.minQuantity));
      setUnit(initialItem.unit);
      setCategory(initialItem.category);
      setPreferredLocation(
        initialItem.preferredLocation || containerNames[0] || 'Nevera'
      );
      setNotes(initialItem.notes || '');
    } else {
      setName('');
      setMinQuantity('1');
      setUnit('ud');
      setCategory(CATEGORIES[0]);
      setPreferredLocation(containerNames[0] || 'Nevera');
      setNotes('');
    }
  }, [isOpen, initialItem, containers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedMin = parseFloat(minQuantity.replace(',', '.'));
    if (Number.isNaN(parsedMin) || parsedMin <= 0) {
      setFormError('La cantidad mínima debe ser un número mayor que 0.');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        minQuantity: parsedMin,
        unit,
        category,
        preferredLocation: preferredLocation || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Error al guardar el producto básico.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="basic-form-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="basic-form-title" className="text-lg font-bold text-slate-900">
              {initialItem ? 'Editar Producto Básico' : 'Nuevo Producto Básico'}
            </h2>
            <p className="text-xs text-slate-500">
              Define las existencias mínimas para que la app vigile los contenedores
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {formError}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="basic-name"
              className="block text-sm font-semibold text-slate-700"
            >
              Nombre del alimento básico *
            </label>
            <input
              id="basic-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Huevos, Leche entera, Aceite..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              La app buscará en los contenedores alimentos con este nombre para sumar su cantidad.
            </p>
          </div>

          {/* Cantidad mínima y Unidad */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="basic-min-qty"
                className="block text-sm font-semibold text-slate-700"
              >
                Cantidad mínima requerida *
              </label>
              <input
                id="basic-min-qty"
                type="number"
                required
                min="0.1"
                step="any"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="basic-unit"
                className="block text-sm font-semibold text-slate-700"
              >
                Unidad *
              </label>
              <select
                id="basic-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
              >
                {ALLOWED_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoría y Contenedor habitual */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="basic-category"
                className="block text-sm font-semibold text-slate-700"
              >
                Categoría *
              </label>
              <select
                id="basic-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="basic-location"
                className="block text-sm font-semibold text-slate-700"
              >
                Contenedor preferido (opcional)
              </label>
              <select
                id="basic-location"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
              >
                {containerNames.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label
              htmlFor="basic-notes"
              className="block text-sm font-semibold text-slate-700"
            >
              Notas u observaciones (opcional)
            </label>
            <input
              id="basic-notes"
              type="text"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Comprar en docenas, marca preferida..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[42px] rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isSubmitting
                ? 'Guardando...'
                : initialItem
                ? 'Guardar cambios'
                : 'Añadir básico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
