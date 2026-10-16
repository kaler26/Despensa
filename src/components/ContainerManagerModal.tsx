import React, { useState } from 'react';
import {
  Archive,
  Box,
  Check,
  Edit3,
  Plus,
  Refrigerator,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react';
import { Product, StorageContainer } from '../types/inventory';
import { inferContainerType } from '../domain/inventoryLogic';

interface ContainerManagerModalProps {
  isOpen: boolean;
  containers: StorageContainer[];
  products: Product[];
  onClose: () => void;
  onCreateContainer: (name: string) => Promise<void>;
  onRenameContainer: (containerId: string, newName: string) => Promise<void>;
  onDeleteContainer: (containerId: string) => Promise<void>;
}

export function renderContainerIcon(name: string, className = 'h-4 w-4') {
  const type = inferContainerType(name);
  switch (type) {
    case 'nevera':
      return <Refrigerator className={className} aria-hidden="true" />;
    case 'congelador':
      return <Snowflake className={className} aria-hidden="true" />;
    case 'despensa':
      return <Archive className={className} aria-hidden="true" />;
    default:
      return <Box className={className} aria-hidden="true" />;
  }
}

export const ContainerManagerModal: React.FC<ContainerManagerModalProps> = ({
  isOpen,
  containers,
  products,
  onClose,
  onCreateContainer,
  onRenameContainer,
  onDeleteContainer,
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await onCreateContainer(newName);
      setNewName('');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear el contenedor.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRename = async (containerId: string) => {
    setError(null);
    setBusy(true);
    try {
      await onRenameContainer(containerId, editingName);
      setEditingId(null);
      setEditingName('');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo renombrar el contenedor.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (containerId: string) => {
    setError(null);
    setBusy(true);
    try {
      await onDeleteContainer(containerId);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el contenedor.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-containers-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2
              id="modal-containers-title"
              className="text-lg font-bold text-slate-900"
            >
              Contenedores de tu hogar
            </h2>
            <p className="text-xs text-slate-600">
              Crea y organiza tus espacios (ej. Nevera, Despensa 1, Despensa 2, Congelador...)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestor de contenedores"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-800"
          >
            {error}
          </div>
        )}

        {/* Formulario para añadir nuevo contenedor */}
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <div className="flex-1">
            <label htmlFor="new-container-name" className="sr-only">
              Nombre del nuevo contenedor
            </label>
            <input
              id="new-container-name"
              type="text"
              maxLength={50}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Despensa 3, Nevera garaje, Armario..."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            <span>Añadir</span>
          </button>
        </form>

        {/* Lista de contenedores actuales */}
        <ul className="mt-5 space-y-2.5">
          {containers.map((cont) => {
            const count = products.filter((p) => p.location === cont.name).length;
            const isEditing = editingId === cont.id;

            return (
              <li
                key={cont.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      maxLength={50}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      aria-label={`Nuevo nombre para ${cont.name}`}
                      className="flex-1 rounded-xl border border-emerald-500 bg-white px-3 py-1.5 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSaveRename(cont.id)}
                      aria-label="Guardar nombre"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar edición"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-2xs border border-slate-200">
                        {renderContainerIcon(cont.name, 'h-4 w-4')}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {cont.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {count} {count === 1 ? 'alimento' : 'alimentos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingId(cont.id);
                          setEditingName(cont.name);
                        }}
                        aria-label={`Renombrar contenedor ${cont.name}`}
                        title="Renombrar contenedor"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-900"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={busy || containers.length <= 1}
                        onClick={() => handleDelete(cont.id)}
                        aria-label={`Eliminar contenedor ${cont.name}`}
                        title={
                          count > 0
                            ? 'Vacía el contenedor antes de eliminarlo'
                            : 'Eliminar contenedor'
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
