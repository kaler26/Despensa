import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react';
import { BasicItem, Product, ShoppingListItem } from '../types/inventory';
import { calculateBasicItemStatus } from '../domain/inventoryLogic';

interface BasicsViewProps {
  basics: BasicItem[];
  products: Product[];
  shoppingList: ShoppingListItem[];
  onAddBasic: () => void;
  onEditBasic: (item: BasicItem) => void;
  onDeleteBasic: (item: BasicItem) => void;
  onQuickAddToShopping: (basic: BasicItem, qty: number) => Promise<void>;
  onSyncAllWithShopping: () => Promise<void>;
  isSyncing: boolean;
}

export const BasicsView: React.FC<BasicsViewProps> = ({
  basics,
  products,
  shoppingList,
  onAddBasic,
  onEditBasic,
  onDeleteBasic,
  onQuickAddToShopping,
  onSyncAllWithShopping,
  isSyncing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'todos' | 'bajos' | 'ok'>('todos');

  // Calcular el estado de todos los básicos frente al inventario real
  const statuses = useMemo(() => {
    return basics.map((basic) => ({
      basic,
      status: calculateBasicItemStatus(basic, products, shoppingList),
    }));
  }, [basics, products, shoppingList]);

  const metrics = useMemo(() => {
    const total = statuses.length;
    const underMin = statuses.filter((s) => s.status.isUnderMin).length;
    const ok = total - underMin;
    return { total, underMin, ok };
  }, [statuses]);

  const filteredStatuses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return statuses.filter(({ basic, status }) => {
      const matchesSearch =
        !term ||
        basic.name.toLowerCase().includes(term) ||
        basic.category.toLowerCase().includes(term) ||
        (basic.preferredLocation &&
          basic.preferredLocation.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      if (filterState === 'bajos') return status.isUnderMin;
      if (filterState === 'ok') return !status.isUnderMin;
      return true;
    });
  }, [statuses, searchTerm, filterState]);

  return (
    <section aria-labelledby="basics-heading" className="space-y-4">
      {/* Cabecera y métricas resumen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2
                id="basics-heading"
                className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
              >
                Productos Básicos y Mínimos
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Alimentos imprescindibles en casa. Si las existencias en los
              contenedores bajan del mínimo, se añaden a la compra.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncAllWithShopping}
              disabled={isSyncing || metrics.underMin === 0}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
              title="Comprobar y enviar todos los básicos que faltan a la lista de la compra"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`}
              />
              <span>Sincronizar compra</span>
            </button>

            <button
              type="button"
              onClick={onAddBasic}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nuevo básico</span>
            </button>
          </div>
        </div>

        {/* Barra de métricas */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:gap-4 sm:pt-4">
          <div
            onClick={() => setFilterState('todos')}
            className={`cursor-pointer rounded-xl p-2.5 sm:p-3 text-center transition ${
              filterState === 'todos'
                ? 'bg-slate-100 border border-slate-300'
                : 'bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total básicos
            </span>
            <span className="mt-0.5 text-base font-extrabold text-slate-900 sm:text-lg">
              {metrics.total}
            </span>
          </div>

          <div
            onClick={() => setFilterState('ok')}
            className={`cursor-pointer rounded-xl p-2.5 sm:p-3 text-center transition ${
              filterState === 'ok'
                ? 'bg-emerald-100/80 border border-emerald-300'
                : 'bg-emerald-50 hover:bg-emerald-100/60'
            }`}
          >
            <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Suficientes
            </span>
            <span className="mt-0.5 text-base font-extrabold text-emerald-700 sm:text-lg">
              {metrics.ok}
            </span>
          </div>

          <div
            onClick={() => setFilterState('bajos')}
            className={`cursor-pointer rounded-xl p-2.5 sm:p-3 text-center transition ${
              filterState === 'bajos'
                ? 'bg-amber-100/80 border border-amber-300'
                : 'bg-amber-50 hover:bg-amber-100/60'
            }`}
          >
            <span className="block text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
              Bajo mínimos
            </span>
            <span className="mt-0.5 text-base font-extrabold text-amber-700 sm:text-lg">
              {metrics.underMin}
            </span>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto básico por nombre, categoría o contenedor..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
        />
      </div>

      {/* Lista de tarjetas de básicos */}
      {filteredStatuses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900">
            {basics.length === 0
              ? 'No hay productos básicos configurados'
              : 'No se encontraron coincidencias'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {basics.length === 0
              ? 'Añade alimentos como leche, huevos o café para que la aplicación vigile las existencias en los contenedores y los añada a la compra si se agotan.'
              : 'Prueba con otro término de búsqueda o limpia los filtros.'}
          </p>
          {basics.length === 0 && (
            <button
              type="button"
              onClick={onAddBasic}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir primer básico</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredStatuses.map(({ basic, status }) => {
            const percentage = Math.min(
              100,
              Math.round((status.currentQuantity / basic.minQuantity) * 100)
            );

            return (
              <div
                key={basic.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300"
              >
                <div>
                  {/* Fila superior: Nombre y Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                        {basic.name}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {basic.category}
                        </span>
                        {basic.preferredLocation && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                            📍 {basic.preferredLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge de estado */}
                    <div>
                      {status.isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Agotado</span>
                        </span>
                      ) : status.isUnderMin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Bajo mínimos</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Suficiente</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso de existencias */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        En despensa:{' '}
                        <strong
                          className={
                            status.isUnderMin
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {status.currentQuantity} {basic.unit}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        Mínimo:{' '}
                        <strong>
                          {basic.minQuantity} {basic.unit}
                        </strong>
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all duration-300 ${
                          status.isOutOfStock
                            ? 'bg-rose-500'
                            : status.isUnderMin
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalle de productos coincidentes en contenedores */}
                  <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Localización en contenedores:
                    </span>
                    {status.matchingProducts.length === 0 ? (
                      <span className="text-slate-400 italic">
                        No hay existencias en ningún contenedor.
                      </span>
                    ) : (
                      <ul className="space-y-0.5">
                        {status.matchingProducts.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between"
                          >
                            <span>
                              • <strong>{p.location}</strong>: {p.name}
                            </span>
                            <span className="font-medium text-slate-800">
                              {p.quantity} {p.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Aviso de lista de la compra */}
                  {status.inShoppingList && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-sky-700">
                      <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                      <span>Ya está apuntado en la Lista de la Compra</span>
                    </div>
                  )}

                  {basic.notes && (
                    <p className="mt-1.5 text-[11px] text-slate-400 italic">
                      "{basic.notes}"
                    </p>
                  )}
                </div>

                {/* Fila de acciones */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditBasic(basic)}
                      aria-label={`Editar básico ${basic.name}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      title="Editar básico"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBasic(basic)}
                      aria-label={`Eliminar básico ${basic.name}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Eliminar básico"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Botón rápido para mandar a la compra si falta */}
                  <button
                    type="button"
                    onClick={() =>
                      onQuickAddToShopping(
                        basic,
                        status.missingQuantity > 0
                          ? status.missingQuantity
                          : basic.minQuantity
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
                      status.inShoppingList
                        ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>
                      {status.inShoppingList
                        ? 'Añadir más a la compra'
                        : 'Añadir a la compra'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
