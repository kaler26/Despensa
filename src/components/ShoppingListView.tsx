import React, { useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  ALLOWED_UNITS,
  ShoppingListItem,
  ShoppingListItemInput,
  Unit,
  UNIT_LABELS,
  UNIT_STEP,
} from '../types/inventory';

interface ShoppingListViewProps {
  items: ShoppingListItem[];
  onAddItem: (input: ShoppingListItemInput) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onUpdateQuantity: (
    itemId: string,
    newQuantity: number,
    unit?: Unit
  ) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onClearChecked: () => Promise<void>;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  items,
  onAddItem,
  onToggleItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearChecked,
}) => {
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<Unit>('ud');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const pendingItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedQty = Number(quantity);
    if (!name.trim()) {
      setFormError('Escribe el nombre del artículo que quieres comprar.');
      return;
    }
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      setFormError('La cantidad debe ser mayor que 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddItem({
        name: name.trim(),
        quantity: parsedQty,
        unit,
        notes: notes.trim() || undefined,
      });
      setName('');
      setQuantity('1');
      setUnit('ud');
      setNotes('');
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'No se pudo añadir el artículo a la lista.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-label="Lista de la compra manual" className="space-y-4">
      {/* Formulario manual para añadir artículos a la lista de la compra */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Añadir a la lista de la compra
            </h2>
            <p className="text-xs text-slate-500">
              Apunta a mano lo que necesites comprar o añádelo desde cualquier producto del inventario.
            </p>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label
                htmlFor="shopping-item-name"
                className="block text-xs font-semibold text-slate-700"
              >
                Artículo *
              </label>
              <input
                id="shopping-item-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Leche entera, Huevos, Papel de cocina..."
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:col-span-4">
              <div>
                <label
                  htmlFor="shopping-item-qty"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Cantidad
                </label>
                <input
                  id="shopping-item-qty"
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="shopping-item-unit"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Unidad
                </label>
                <select
                  id="shopping-item-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600"
                >
                  {ALLOWED_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="shopping-item-notes" className="sr-only">
              Nota opcional (marca, tienda, formato)
            </label>
            <input
              id="shopping-item-notes"
              type="text"
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nota opcional (ej. marca, formato o supermercado)..."
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </form>
      </div>

      {/* Lista de artículos pendientes de comprar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800">
            Pendientes de comprar ({pendingItems.length})
          </h3>
        </div>

        {pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ShoppingBag
              className="h-10 w-10 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-2.5 text-sm font-bold text-slate-800">
              Tu lista de la compra está vacía
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Usa el formulario superior o el botón «Añadir a la lista» en cualquier producto del inventario.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Artículos pendientes de comprar">
            {pendingItems.map((item) => {
              const step = UNIT_STEP[item.unit] ?? 1;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-emerald-300"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleItem(item.id, true)}
                      aria-label={`Marcar ${item.name} como comprado`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-transparent transition hover:border-emerald-600"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                        {item.name}
                      </p>
                      {item.notes && (
                        <p className="truncate text-xs text-slate-500">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Controles rápidos de cantidad y eliminar */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={item.quantity <= step}
                      onClick={() =>
                        onUpdateQuantity(
                          item.id,
                          Math.max(step, item.quantity - step),
                          item.unit
                        )
                      }
                      aria-label={`Disminuir cantidad de ${item.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <span className="min-w-[54px] text-center text-xs font-extrabold text-slate-900 sm:text-sm">
                      {item.quantity} {item.unit}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + step, item.unit)
                      }
                      aria-label={`Aumentar cantidad de ${item.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Eliminar ${item.name} de la lista`}
                      title="Quitar de la lista"
                      className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Artículos ya comprados / tachados */}
      {checkedItems.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Comprados ({checkedItems.length})
            </h3>
            <button
              type="button"
              onClick={onClearChecked}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Borrar comprados</span>
            </button>
          </div>

          <ul className="space-y-2" aria-label="Artículos ya comprados">
            {checkedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 text-slate-500"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id, false)}
                    aria-label={`Desmarcar ${item.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-600 bg-emerald-600 text-white"
                  >
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium line-through">
                      {item.name}
                    </p>
                    {item.notes && (
                      <p className="truncate text-xs text-slate-400 line-through">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold line-through">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Eliminar ${item.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
