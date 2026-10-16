import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  Mic,
  MicOff,
  Package,
  PackagePlus,
  RefreshCw,
  Send,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  X,
} from 'lucide-react';
import { Product, StorageContainer, UNIT_LABELS } from '../types/inventory';
import { GeminiAction, GeminiInterpretation } from '../types/gemini';
import {
  clearGeminiApiKey,
  getGeminiApiKey,
  hasGeminiApiKey,
  interpretVoiceOrTextCommand,
  saveGeminiApiKey,
} from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  containers: StorageContainer[];
  onApplyActions: (actions: GeminiAction[]) => Promise<void>;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  products,
  containers,
  onApplyActions,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isConfiguringKey, setIsConfiguringKey] = useState<boolean>(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isInterpreting, setIsInterpreting] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [interpretation, setInterpretation] =
    useState<GeminiInterpretation | null>(null);
  const [actionsList, setActionsList] = useState<GeminiAction[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isSupported: speechSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Al abrir el modal, comprobar la clave
  useEffect(() => {
    if (!isOpen) return;
    const keyConfigured = hasGeminiApiKey();
    setHasKey(keyConfigured);
    setIsConfiguringKey(!keyConfigured);
    setApiKeyInput(getGeminiApiKey() || '');
    setPrompt('');
    setInterpretation(null);
    setActionsList([]);
    setErrorMessage(null);
    resetTranscript();
  }, [isOpen, resetTranscript]);

  // Actualizar el prompt con el reconocimiento de voz en directo
  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  // Detener el micrófono si se cierra el modal
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setErrorMessage('Por favor, introduce una API Key válida.');
      return;
    }
    saveGeminiApiKey(apiKeyInput.trim());
    setHasKey(true);
    setIsConfiguringKey(false);
    setErrorMessage(null);
  };

  const handleClearKey = () => {
    clearGeminiApiKey();
    setApiKeyInput('');
    setHasKey(false);
    setIsConfiguringKey(true);
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setErrorMessage(null);
      startListening();
    }
  };

  const handleInterpret = async (textToInterpret?: string) => {
    const text = (textToInterpret ?? prompt).trim();
    if (!text) {
      setErrorMessage('Escribe o dicta una orden antes de continuar.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsInterpreting(true);
    setErrorMessage(null);

    try {
      const result = await interpretVoiceOrTextCommand(text, {
        products,
        containers,
      });

      setInterpretation(result);
      setActionsList(result.actions);

      if (result.actions.length === 0) {
        setErrorMessage(
          'Gemini no pudo detectar ninguna acción concreta. Prueba a especificar las cantidades o el contenedor.'
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al consultar con Gemini.'
      );
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleToggleAction = (actionId: string) => {
    setActionsList((prev) =>
      prev.map((act) =>
        act.id === actionId ? { ...act, selected: !act.selected } : act
      )
    );
  };

  const handleApply = async () => {
    const selectedActions = actionsList.filter((a) => a.selected);
    if (selectedActions.length === 0) {
      setErrorMessage('No hay ninguna acción seleccionada para aplicar.');
      return;
    }

    setIsApplying(true);
    setErrorMessage(null);

    try {
      await onApplyActions(selectedActions);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Error al aplicar las acciones en el inventario.'
      );
    } finally {
      setIsApplying(false);
    }
  };

  const exampleChips = [
    'Nos hemos bebido 1 litro de leche',
    'He comprado 3 latas de atún para Despensa 1',
    'Gastamos los huevos y el aceite, apúntalos a la compra',
    'Apunta café y plátanos a la lista de la compra',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-assistant-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3.5 text-white sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
              <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="gemini-assistant-title"
                className="text-base font-bold sm:text-lg"
              >
                Asistente Inteligente (Gemini)
              </h2>
              <p className="text-[11px] text-emerald-100 sm:text-xs">
                Añade o quita productos de viva voz o con texto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsConfiguringKey((prev) => !prev)}
              aria-label="Ajustes de API Key de Gemini"
              title="Ajustes de clave Gemini"
              className={`rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white transition ${
                isConfiguringKey ? 'bg-white/20 text-white' : ''
              }`}
            >
              <Key className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar asistente"
              className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de error global */}
        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Vista de Configuración de API Key */}
          {isConfiguringKey ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <Key className="h-4 w-4" />
                <span>Configurar clave de Gemini API</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para que el asistente entienda tus órdenes se conecta con{' '}
                <strong>Gemini Flash</strong>. Puedes obtener una clave de API{' '}
                <strong>gratuita</strong> en Google AI Studio.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                <span>Obtener API Key gratuita en Google AI Studio</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <form onSubmit={handleSaveKey} className="space-y-3 pt-1">
                <div>
                  <label
                    htmlFor="gemini-key"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tu Gemini API Key
                  </label>
                  <input
                    id="gemini-key"
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono shadow-2xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar clave
                    </button>
                  )}
                  {hasKey && (
                    <button
                      type="button"
                      onClick={() => setIsConfiguringKey(false)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Guardar clave
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Si aún no hay interpretación de acciones, mostrar entrada de voz y texto */}
          {!interpretation && (
            <div className="space-y-4">
              {/* Botón de Voz */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={!speechSupported || isInterpreting}
                  aria-label={isListening ? 'Detener micrófono' : 'Pulsar para hablar'}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 shadow-md ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-200 scale-105'
                      : speechSupported
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>

                <p className="mt-3 text-xs font-semibold text-slate-800">
                  {isListening
                    ? '🎙️ Te estoy escuchando... Di lo que quieres hacer'
                    : speechSupported
                    ? 'Toca el micrófono para hablar'
                    : 'Reconocimiento de voz no soportado; escribe tu orden abajo.'}
                </p>
                {isListening && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Toca de nuevo para terminar de hablar
                  </p>
                )}
                {speechError && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {speechError}
                  </p>
                )}
              </div>

              {/* Área de texto para escribir o editar la orden */}
              <div>
                <label
                  htmlFor="gemini-prompt"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  O escribe tu orden con tus propias palabras:
                </label>
                <div className="relative">
                  <textarea
                    id="gemini-prompt"
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej. Nos hemos terminado 1 brick de leche y apunta huevos a la compra..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  />
                  {prompt && (
                    <button
                      type="button"
                      onClick={() => setPrompt('')}
                      className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Borrar texto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sugerencias de ejemplo */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Ejemplos rápidos para probar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {exampleChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(chip);
                        handleInterpret(chip);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-xs text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition"
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vista previa / Confirmación de acciones propuestas por Gemini */}
          {interpretation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Acciones interpretadas</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    {interpretation.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInterpretation(null);
                    setActionsList([]);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Volver a redactar</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {actionsList.map((action) => {
                  const isConsume = action.type === 'consume';
                  const isAddStock = action.type === 'add_stock';
                  const isCreate = action.type === 'create_product';
                  const isShopping = action.type === 'add_to_shopping_list';

                  return (
                    <div
                      key={action.id}
                      onClick={() => handleToggleAction(action.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition select-none ${
                        action.selected
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={action.selected}
                        onChange={() => {}} // Manejado por el contenedor
                        className="mt-1 h-4 w-4 rounded-sm text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isConsume && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                              <TrendingDown className="h-3 w-3" />
                              Consumir / Restar
                            </span>
                          )}
                          {isAddStock && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <PackagePlus className="h-3 w-3" />
                              Sumar existencias
                            </span>
                          )}
                          {isCreate && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                              <Package className="h-3 w-3" />
                              Nuevo alimento
                            </span>
                          )}
                          {isShopping && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                              <ShoppingCart className="h-3 w-3" />
                              Añadir a la compra
                            </span>
                          )}

                          <span className="font-bold text-slate-900 text-sm">
                            {action.quantity} {action.unit} de {action.productName}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {action.location && (
                            <span>📍 Contenedor: <strong>{action.location}</strong></span>
                          )}
                          {action.category && (
                            <span>🏷️ Categoría: {action.category}</span>
                          )}
                          {action.note && action.note !== 'Asistente IA' && (
                            <span className="italic">"{action.note}"</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pie de página con botones */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isInterpreting || isApplying}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>

          {!interpretation ? (
            <button
              type="button"
              onClick={() => handleInterpret()}
              disabled={isInterpreting || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isInterpreting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gemini está procesando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Interpretar orden</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={
                isApplying ||
                actionsList.filter((a) => a.selected).length === 0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Aplicando cambios...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>
                    Confirmar y aplicar (
                    {actionsList.filter((a) => a.selected).length})
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
