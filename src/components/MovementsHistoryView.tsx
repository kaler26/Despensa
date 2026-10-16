import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Movement,
  MOVEMENT_TYPE_LABELS,
  MovementType,
} from '../types/inventory';

interface MovementsHistoryViewProps {
  movements: Movement[];
}

export const MovementsHistoryView: React.FC<MovementsHistoryViewProps> = ({
  movements,
}) => {
  const [selectedType, setSelectedType] = useState<string>('todos');

  const filtered =
    selectedType === 'todos'
      ? movements
      : movements.filter((m) => m.type === selectedType);

  const getTypeStyle = (type: MovementType) => {
    switch (type) {
      case 'compra':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <ArrowUpRight className="h-4 w-4 text-emerald-700" aria-hidden="true" />,
          deltaClass: 'text-emerald-700',
        };
      case 'consumo':
        return {
          badge: 'bg-sky-100 text-sky-800 border-sky-200',
          icon: <ArrowDownRight className="h-4 w-4 text-sky-700" aria-hidden="true" />,
          deltaClass: 'text-sky-700',
        };
      default:
        return {
          badge: 'bg-amber-100 text-amber-900 border-amber-200',
          icon: <SlidersHorizontal className="h-4 w-4 text-amber-700" aria-hidden="true" />,
          deltaClass: 'text-amber-800',
        };
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <section aria-label="Historial de movimientos de inventario" className="space-y-4">
      {/* Filtro por tipo de movimiento */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
        <span className="text-xs font-semibold text-slate-600 mr-1">
          Filtrar por tipo:
        </span>
        <button
          type="button"
          onClick={() => setSelectedType('todos')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            selectedType === 'todos'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Todos ({movements.length})
        </button>
        {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((type) => {
          const count = movements.filter((m) => m.type === type).length;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {MOVEMENT_TYPE_LABELS[type]} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de movimientos */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <History className="h-10 w-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            Sin movimientos registrados
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Todas las compras, consumos y ajustes de inventario aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((mov) => {
            const style = getTypeStyle(mov.type);
            const sign = mov.delta > 0 ? '+' : '';
            return (
              <li
                key={mov.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    {style.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {mov.productName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}
                      >
                        {MOVEMENT_TYPE_LABELS[mov.type] ?? mov.type}
                      </span>
                    </div>
                    {mov.note && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {mov.note}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatDateTime(mov.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <span
                    className={`text-base font-extrabold ${style.deltaClass}`}
                  >
                    {sign}
                    {mov.delta} {mov.unit}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {mov.previousQuantity} → {mov.newQuantity} {mov.unit}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
