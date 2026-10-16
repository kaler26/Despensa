import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Filter,
  History,
  LogOut,
  Package,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  CATEGORIES,
  Movement,
  MovementType,
  Product,
  ProductInput,
  ShoppingListItem,
  ShoppingListItemInput,
  StorageContainer,
  Unit,
  UNIT_STEP,
} from './types/inventory';
import { filterProducts } from './domain/inventoryLogic';
import {
  addShoppingListItem,
  changeProductStock,
  clearCheckedShoppingListItems,
  createContainer,
  createProduct,
  removeContainer,
  removeProduct,
  removeShoppingListItem,
  renameContainer,
  subscribeToContainers,
  subscribeToMovements,
  subscribeToProducts,
  subscribeToShoppingList,
  toggleShoppingListItem,
  updateProduct,
  updateShoppingListItemQuantity,
} from './services/inventoryService';
import { ProductCard } from './components/ProductCard';
import { ProductFormModal } from './components/ProductFormModal';
import { StockMovementModal } from './components/StockMovementModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { MovementsHistoryView } from './components/MovementsHistoryView';
import { ShoppingListView } from './components/ShoppingListView';
import { LoginView } from './components/LoginView';
import {
  ContainerManagerModal,
  renderContainerIcon,
} from './components/ContainerManagerModal';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { GeminiAction } from './types/gemini';

type ActiveTab = 'inventario' | 'compra' | 'historial';

export const App: React.FC = () => {
  const { user, loading: authLoading, signOut, isFirebaseReady } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [containers, setContainers] = useState<StorageContainer[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Navegación principal
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventario');

  // Buscador y filtros
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [locationFilter, setLocationFilter] = useState<string>('Todos');

  // Estados de modales y operaciones en curso
  const [updatingProductIds, setUpdatingProductIds] = useState<Set<string>>(
    new Set()
  );
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingForm, setIsSavingForm] = useState<boolean>(false);

  const [isContainerManagerOpen, setIsContainerManagerOpen] =
    useState<boolean>(false);

  const [movementModalProduct, setMovementModalProduct] =
    useState<Product | null>(null);
  const [isSavingMovement, setIsSavingMovement] = useState<boolean>(false);

  const [deleteTargetProduct, setDeleteTargetProduct] =
    useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

<<<<<<< HEAD
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);

=======
>>>>>>> c5902575bd9a24afcf921e3ee247063444fe1018
  // Suscripción en tiempo real a productos, contenedores, lista de la compra e historial
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setMovements([]);
      setContainers([]);
      setShoppingList([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setErrorBanner(null);

    const unsubContainers = subscribeToContainers(
      user.uid,
      user.isDemo,
      (items) => {
        setContainers(items);
      },
      (err) => {
        setErrorBanner(
          `Error al cargar contenedores: ${err.message || 'Error desconocido'}`
        );
      }
    );

    const unsubProducts = subscribeToProducts(
      user.uid,
      user.isDemo,
      (items) => {
        setProducts(items);
        setDataLoading(false);
      },
      (err) => {
        setErrorBanner(
          `Error al cargar el inventario: ${err.message || 'Error desconocido'}`
        );
        setDataLoading(false);
      }
    );

    const unsubShopping = subscribeToShoppingList(
      user.uid,
      user.isDemo,
      (items) => {
        setShoppingList(items);
      },
      (err) => {
        setErrorBanner(
          `Error al cargar la lista de la compra: ${
            err.message || 'Error desconocido'
          }`
        );
      }
    );

    const unsubMovements = subscribeToMovements(
      user.uid,
      user.isDemo,
      (items) => {
        setMovements(items);
      },
      (err) => {
        setErrorBanner(
          `Error al cargar el historial: ${err.message || 'Error desconocido'}`
        );
      }
    );

    return () => {
      unsubContainers();
      unsubProducts();
      unsubShopping();
      unsubMovements();
    };
  }, [user]);

  // Auto-ocultar toast informativo
  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 3200);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        search,
        category: categoryFilter,
        location: locationFilter,
      }),
    [products, search, categoryFilter, locationFilter]
  );

  const pendingShoppingCount = useMemo(
    () => shoppingList.filter((item) => !item.checked).length,
    [shoppingList]
  );

  const availableCategories = useMemo(() => {
    const dynamic = new Set<string>(CATEGORIES);
    products.forEach((p) => dynamic.add(p.category));
    return ['Todas', ...Array.from(dynamic)];
  }, [products]);

  const availableContainerNames = useMemo(() => {
    const dynamic = new Set<string>(containers.map((c) => c.name));
    products.forEach((p) => dynamic.add(p.location));
    return Array.from(dynamic);
  }, [containers, products]);

  const setProductBusy = (productId: string, busy: boolean) => {
    setUpdatingProductIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const handleQuickStockChange = async (
    product: Product,
    delta: number,
    type: MovementType,
    note?: string
  ) => {
    if (!user) return;
    setErrorBanner(null);
    setProductBusy(product.id, true);
    try {
      const result = await changeProductStock(
        user.uid,
        product.id,
        delta,
        user.isDemo,
        type,
        note
      );
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      setFeedbackToast(
        `${product.name}: ${sign} ${product.unit} (Total: ${result.product.quantity} ${product.unit})`
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la cantidad del producto.'
      );
    } finally {
      setProductBusy(product.id, false);
    }
  };

  const handleAddShoppingItem = async (input: ShoppingListItemInput) => {
    if (!user) return;
    setErrorBanner(null);
    const item = await addShoppingListItem(
      user.uid,
      input,
      shoppingList,
      user.isDemo
    );
    setFeedbackToast(
      `"${item.name}" (${item.quantity} ${item.unit}) en la lista de la compra.`
    );
  };

  const handleQuickAddProductToShoppingList = async (product: Product) => {
    if (!user) return;
    setErrorBanner(null);
    try {
      const step = UNIT_STEP[product.unit] ?? 1;
      const item = await addShoppingListItem(
        user.uid,
        {
          name: product.name,
          quantity: step,
          unit: product.unit,
          notes: product.location,
        },
        shoppingList,
        user.isDemo
      );
      setFeedbackToast(
        `"${item.name}" añadido a la lista de la compra (${item.quantity} ${item.unit}).`
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudo añadir a la lista de la compra.'
      );
    }
  };

  const handleToggleShoppingItem = async (itemId: string, checked: boolean) => {
    if (!user) return;
    try {
      await toggleShoppingListItem(user.uid, itemId, checked, user.isDemo);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el artículo.'
      );
    }
  };

  const handleUpdateShoppingQuantity = async (
    itemId: string,
    newQuantity: number,
    _unit: Unit
  ) => {
    if (!user) return;
    try {
      await updateShoppingListItemQuantity(
        user.uid,
        itemId,
        newQuantity,
        user.isDemo
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar la cantidad en la lista.'
      );
    }
  };

  const handleRemoveShoppingItem = async (itemId: string) => {
    if (!user) return;
    try {
      await removeShoppingListItem(user.uid, itemId, user.isDemo);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudo quitar de la lista de la compra.'
      );
    }
  };

  const handleClearCheckedShoppingItems = async () => {
    if (!user) return;
    try {
      await clearCheckedShoppingListItems(
        user.uid,
        shoppingList,
        user.isDemo
      );
      setFeedbackToast('Artículos comprados eliminados de la lista.');
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'No se pudieron borrar los artículos comprados.'
      );
    }
  };

  const handleSaveProductForm = async (
    input: ProductInput,
    movementType?: MovementType,
    movementNote?: string
  ) => {
    if (!user) return;
    setErrorBanner(null);
    setIsSavingForm(true);
    try {
      if (editingProduct) {
        await updateProduct(
          user.uid,
          editingProduct.id,
          input,
          user.isDemo,
          movementType,
          movementNote
        );
        setFeedbackToast(`"${input.name}" actualizado correctamente.`);
      } else {
        await createProduct(user.uid, input, user.isDemo);
        setFeedbackToast(
          `"${input.name}" añadido en ${input.location}.`
        );
      }
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleCreateContainer = async (name: string) => {
    if (!user) throw new Error('Sesión no iniciada');
    const created = await createContainer(
      user.uid,
      name,
      containers,
      user.isDemo
    );
    setFeedbackToast(`Contenedor "${created.name}" creado.`);
    return created;
  };

  const handleRenameContainer = async (
    containerId: string,
    newName: string
  ) => {
    if (!user) return;
    const oldTarget = containers.find((c) => c.id === containerId);
    await renameContainer(
      user.uid,
      containerId,
      newName,
      containers,
      user.isDemo
    );
    if (oldTarget && locationFilter === oldTarget.name) {
      setLocationFilter(newName.trim());
    }
    setFeedbackToast(`Contenedor renombrado a "${newName.trim()}".`);
  };

  const handleDeleteContainer = async (containerId: string) => {
    if (!user) return;
    const oldTarget = containers.find((c) => c.id === containerId);
    await removeContainer(
      user.uid,
      containerId,
      containers,
      products,
      user.isDemo
    );
    if (oldTarget && locationFilter === oldTarget.name) {
      setLocationFilter('Todos');
    }
    setFeedbackToast('Contenedor eliminado.');
  };

  const handleConfirmCustomMovement = async (
    product: Product,
    delta: number,
    type: MovementType,
    note: string
  ) => {
    if (!user) return;
    setIsSavingMovement(true);
    try {
      await handleQuickStockChange(
        product,
        delta,
        type,
        note.trim() ? note.trim() : undefined
      );
    } finally {
      setIsSavingMovement(false);
    }
  };

  const handleConfirmDelete = async (product: Product) => {
    if (!user) return;
    setErrorBanner(null);
    setIsDeleting(true);
    try {
      await removeProduct(user.uid, product.id, user.isDemo);
      setDeleteTargetProduct(null);
      setFeedbackToast(`"${product.name}" eliminado del inventario.`);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Error al eliminar el producto.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyGeminiActions = async (actions: GeminiAction[]) => {
    if (!user) return;
    setErrorBanner(null);

    let appliedCount = 0;
    const errors: string[] = [];

    for (const action of actions) {
      try {
        if (action.type === 'consume' || action.type === 'add_stock') {
          let targetProduct = action.productId
            ? products.find((p) => p.id === action.productId)
            : null;

          if (!targetProduct) {
            const normalizedSearch = action.productName.toLowerCase().trim();
            targetProduct =
              products.find(
                (p) => p.name.toLowerCase().trim() === normalizedSearch
              ) ||
              products.find((p) =>
                p.name.toLowerCase().includes(normalizedSearch)
              ) ||
              null;
          }

          if (targetProduct) {
            const delta =
              action.type === 'consume'
                ? -Math.abs(action.quantity)
                : Math.abs(action.quantity);
            const movementType: MovementType =
              action.type === 'consume' ? 'consumo' : 'compra';
            await changeProductStock(
              user.uid,
              targetProduct.id,
              delta,
              user.isDemo,
              movementType,
              action.note || 'Asistente IA'
            );
            appliedCount++;
          } else if (action.type === 'add_stock') {
            await createProduct(
              user.uid,
              {
                name: action.productName,
                category: action.category || 'Otros',
                location:
                  action.location || containers[0]?.name || 'Despensa 1',
                quantity: Math.abs(action.quantity),
                unit: action.unit,
                notes: action.note || 'Añadido con Asistente IA',
              },
              user.isDemo
            );
            appliedCount++;
          } else {
            errors.push(
              `No se encontró "${action.productName}" para descontar existencias.`
            );
          }
        } else if (action.type === 'create_product') {
          await createProduct(
            user.uid,
            {
              name: action.productName,
              category: action.category || 'Otros',
              location: action.location || containers[0]?.name || 'Despensa 1',
              quantity: Math.max(0, action.quantity),
              unit: action.unit,
              notes: action.note || 'Añadido con Asistente IA',
            },
            user.isDemo
          );
          appliedCount++;
        } else if (action.type === 'add_to_shopping_list') {
          await addShoppingListItem(
            user.uid,
            {
              name: action.productName,
              quantity: Math.max(0.1, action.quantity),
              unit: action.unit,
              notes: action.location || action.note || 'Asistente IA',
            },
            shoppingList,
            user.isDemo
          );
          appliedCount++;
        }
      } catch (err: unknown) {
        errors.push(
          `${action.productName}: ${
            err instanceof Error ? err.message : 'Error al procesar'
          }`
        );
      }
    }

    if (appliedCount > 0) {
      setFeedbackToast(
        `Se han aplicado ${appliedCount} acción(es) con éxito.`
      );
    }
    if (errors.length > 0) {
      setErrorBanner(`Avisos del Asistente: ${errors.join('; ')}`);
    }
  };

  if (authLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6"
        role="status"
        aria-live="polite"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Cargando Mi Despensa...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'Todas' ||
    locationFilter !== 'Todos';

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 pb-24 sm:pb-12">
      {/* Cabecera superior */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs sm:h-10 sm:w-10">
              <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  Mi Despensa
                </h1>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
                    user.isDemo
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.isDemo && !isFirebaseReady
                    ? 'Local'
                    : user.isDemo
                    ? 'Demo'
                    : 'Cloud'}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                {user.displayName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsGeminiModalOpen(true)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:from-teal-700 hover:to-emerald-700 sm:min-h-[44px] sm:px-3.5 sm:text-sm"
              title="Abrir Asistente IA (voz o texto)"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span>IA</span>
              <span className="hidden sm:inline">Asistente</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsFormOpen(true);
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 sm:min-h-[44px] sm:px-3.5 sm:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>Añadir</span>
              <span className="hidden sm:inline">alimento</span>
            </button>

            <button
              type="button"
              onClick={signOut}
              aria-label="Cerrar sesión"
              title="Cambiar cuenta o cerrar sesión"
              className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:min-h-[44px] sm:min-w-[44px]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Pestañas de navegación para Escritorio */}
        <nav
          aria-label="Secciones principales"
          className="mx-auto hidden max-w-5xl gap-2 px-4 pb-2.5 sm:flex"
        >
          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'inventario'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            Inventario ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compra')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'compra'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Lista de la compra
            {pendingShoppingCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                {pendingShoppingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'historial'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Historial ({movements.length})
          </button>
        </nav>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-5xl px-3 pt-3 space-y-4 sm:px-4 sm:pt-4 sm:space-y-5">
        {/* Notificación de error si ocurre */}
        {errorBanner && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle
                className="h-5 w-5 shrink-0 text-rose-700"
                aria-hidden="true"
              />
              <span className="font-medium">{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="Cerrar mensaje de error"
              className="rounded-lg p-1 text-rose-700 hover:bg-rose-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Toast de confirmación de operación transaccional */}
        {feedbackToast && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-2xs"
          >
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Tarjetas de resumen rápido */}
        <section
          aria-label="Resumen del estado de la despensa"
          className="grid grid-cols-3 gap-2 sm:gap-4"
        >
          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className="flex min-w-0 flex-col items-start rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-2xs transition hover:border-emerald-300 sm:p-3.5"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 sm:gap-1.5 sm:text-xs">
              <Package className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" aria-hidden="true" />
              <span className="truncate">Productos</span>
            </div>
            <span className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compra')}
            className="flex min-w-0 flex-col items-start rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-left shadow-2xs transition hover:border-emerald-400 sm:p-3.5"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-900 sm:gap-1.5 sm:text-xs">
              <ShoppingCart
                className="h-3.5 w-3.5 shrink-0 text-emerald-700 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
              <span className="truncate">Lista compra</span>
            </div>
            <span className="mt-1 text-xl font-extrabold text-emerald-950 sm:text-2xl">
              {pendingShoppingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsContainerManagerOpen(true)}
            className="flex min-w-0 flex-col items-start rounded-2xl border border-sky-200 bg-sky-50/60 p-2.5 text-left shadow-2xs transition hover:border-sky-400 sm:p-3.5"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-900 sm:gap-1.5 sm:text-xs">
              <Archive
                className="h-3.5 w-3.5 shrink-0 text-sky-600 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
              <span className="truncate">Contenedores</span>
            </div>
            <span className="mt-1 text-xl font-extrabold text-sky-950 sm:text-2xl">
              {availableContainerNames.length}
            </span>
          </button>
        </section>

        {/* Estado de carga de datos */}
        {dataLoading ? (
          <div
            className="space-y-3 py-8 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">
              Sincronizando alimentos...
            </p>
          </div>
        ) : (
          <>
            {/* VISTA 1: INVENTARIO COMPLETO CON CONTENEDORES, BUSCADOR Y FILTROS */}
            {activeTab === 'inventario' && (
              <section aria-label="Inventario de alimentos" className="space-y-4">
                {/* Selector visual de Contenedores (Nevera, Congelador, Despensa 1, Despensa 2...) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Contenedores
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsContainerManagerOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Gestionar contenedores</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLocationFilter('Todos')}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        locationFilter === 'Todos'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Todos</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                          locationFilter === 'Todos'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {products.length}
                      </span>
                    </button>

                    {availableContainerNames.map((contName) => {
                      const count = products.filter(
                        (p) => p.location === contName
                      ).length;
                      const active = locationFilter === contName;
                      return (
                        <button
                          key={contName}
                          type="button"
                          onClick={() => setLocationFilter(contName)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            active
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40'
                          }`}
                        >
                          {renderContainerIcon(
                            contName,
                            active ? 'h-3.5 w-3.5 text-white' : 'h-3.5 w-3.5 text-emerald-700'
                          )}
                          <span>{contName}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                              active
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Panel de búsqueda y filtro por categoría */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                      <label htmlFor="inventory-search" className="sr-only">
                        Buscar alimento por nombre, contenedor o notas
                      </label>
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="inventory-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, contenedor o nota..."
                        className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          aria-label="Limpiar búsqueda"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label htmlFor="filter-category" className="sr-only">
                        Filtrar por categoría
                      </label>
                      <div className="relative">
                        <Filter
                          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <select
                          id="filter-category"
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat === 'Todas' ? 'Todas las categorías' : cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                      <span>
                        Mostrando <strong>{filteredProducts.length}</strong> de{' '}
                        {products.length} alimentos
                        {locationFilter !== 'Todos' && (
                          <> en <strong>{locationFilter}</strong></>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setCategoryFilter('Todas');
                          setLocationFilter('Todos');
                        }}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        Ver todos
                      </button>
                    </div>
                  )}
                </div>

                {/* Listado de tarjetas de alimentos */}
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <ClipboardList
                      className="h-10 w-10 text-slate-400"
                      aria-hidden="true"
                    />
                    <h2 className="mt-3 text-base font-bold text-slate-800">
                      No hay alimentos en esta vista
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {hasActiveFilters
                        ? 'Prueba a cambiar de contenedor, categoría o búsqueda.'
                        : 'Añade tu primer producto para empezar a gestionar tu despensa.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isUpdating={updatingProductIds.has(product.id)}
                        onQuickIncrement={(p, step) =>
                          handleQuickStockChange(p, step, 'compra')
                        }
                        onQuickDecrement={(p, step) =>
                          handleQuickStockChange(p, -step, 'consumo')
                        }
                        onOpenMovementModal={(p) => setMovementModalProduct(p)}
                        onAddToShoppingList={handleQuickAddProductToShoppingList}
                        onEdit={(p) => {
                          setEditingProduct(p);
                          setIsFormOpen(true);
                        }}
                        onDeleteRequest={(p) => setDeleteTargetProduct(p)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* VISTA 2: LISTA DE LA COMPRA MANUAL */}
            {activeTab === 'compra' && (
              <ShoppingListView
                items={shoppingList}
                onAddItem={handleAddShoppingItem}
                onToggleItem={handleToggleShoppingItem}
                onUpdateQuantity={handleUpdateShoppingQuantity}
                onRemoveItem={handleRemoveShoppingItem}
                onClearChecked={handleClearCheckedShoppingItems}
              />
            )}

            {/* VISTA 3: HISTORIAL DE COMPRAS, CONSUMOS Y AJUSTES */}
            {activeTab === 'historial' && (
              <MovementsHistoryView movements={movements} />
            )}
          </>
        )}
      </main>

      {/* Barra de navegación inferior Mobile-First */}
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-xs sm:hidden"
      >
        <button
          type="button"
          onClick={() => setActiveTab('inventario')}
          className={`flex flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-xs font-semibold ${
            activeTab === 'inventario'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="h-5 w-5" aria-hidden="true" />
          <span className="mt-0.5">Inventario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compra')}
          className={`relative flex flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-xs font-semibold ${
            activeTab === 'compra'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <span className="mt-0.5">Lista compra</span>
          {pendingShoppingCount > 0 && (
            <span className="absolute right-6 top-1 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {pendingShoppingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={`flex flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-xs font-semibold ${
            activeTab === 'historial'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="h-5 w-5" aria-hidden="true" />
          <span className="mt-0.5">Historial</span>
        </button>
      </nav>

      {/* Botón flotante Asistente IA (especialmente cómodo en móvil) */}
      <button
        type="button"
        onClick={() => setIsGeminiModalOpen(true)}
        aria-label="Abrir Asistente IA Gemini"
        title="Hablar o escribir al Asistente IA"
        className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/25 hover:scale-105 active:scale-95 transition sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        <Sparkles className="h-6 w-6 text-amber-300" />
      </button>

      {/* Modales */}
      <GeminiAssistantModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        products={products}
        containers={containers}
        onApplyActions={handleApplyGeminiActions}
      />

      <ProductFormModal
        isOpen={isFormOpen}
        initialProduct={editingProduct}
        containers={containers}
        defaultContainerName={locationFilter}
        isSubmitting={isSavingForm}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onCreateContainerInline={handleCreateContainer}
        onSubmit={handleSaveProductForm}
      />

      <ContainerManagerModal
        isOpen={isContainerManagerOpen}
        containers={containers}
        products={products}
        onClose={() => setIsContainerManagerOpen(false)}
        onCreateContainer={async (name) => {
          await handleCreateContainer(name);
        }}
        onRenameContainer={handleRenameContainer}
        onDeleteContainer={handleDeleteContainer}
      />

      <StockMovementModal
        product={movementModalProduct}
        isSubmitting={isSavingMovement}
        onClose={() => setMovementModalProduct(null)}
        onConfirmMovement={handleConfirmCustomMovement}
      />

      <ConfirmDeleteModal
        product={deleteTargetProduct}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTargetProduct(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
export default App;
