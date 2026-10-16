import {
  ALLOWED_UNITS,
  CATEGORIES,
  DEFAULT_CONTAINERS,
  Product,
  StorageContainer,
  Unit,
} from '../types/inventory';
import { GeminiAction, GeminiInterpretation } from '../types/gemini';

const STORAGE_KEY = 'mi_despensa_gemini_api_key';

export const getGeminiApiKey = (): string | null => {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local && local.trim().length > 0) {
    return local.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return null;
};

export const saveGeminiApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const clearGeminiApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasGeminiApiKey = (): boolean => {
  return Boolean(getGeminiApiKey());
};

const sanitizeUnit = (rawUnit: string): Unit => {
  const u = rawUnit.toLowerCase().trim();
  if ((ALLOWED_UNITS as readonly string[]).includes(u)) {
    return u as Unit;
  }
  if (u.includes('litro') || u === 'litros') return 'l';
  if (u.includes('kilo') || u === 'kilos') return 'kg';
  if (u.includes('gramo') || u === 'gramos' || u === 'gr') return 'g';
  if (u.includes('mili') || u === 'ml') return 'ml';
  if (u.includes('paquet') || u.includes('bolsa') || u.includes('caja')) return 'paquete';
  if (u.includes('lata') || u.includes('bote')) return 'lata';
  return 'ud';
};

export interface InterpretContext {
  products: Product[];
  containers: StorageContainer[];
}

export const interpretVoiceOrTextCommand = async (
  prompt: string,
  context: InterpretContext
): Promise<GeminiInterpretation> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'No se ha configurado ninguna API Key de Gemini. Introduce tu clave en los ajustes del asistente.'
    );
  }

  const containerNames =
    context.containers.length > 0
      ? context.containers.map((c) => c.name)
      : [...DEFAULT_CONTAINERS];

  // Resumen compacto del inventario actual para que Gemini pueda emparejar nombres e IDs
  const inventorySnapshot = context.products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    location: p.location,
    quantity: p.quantity,
    unit: p.unit,
  }));

  const systemInstructions = `Eres el asistente de IA inteligente de la aplicación "Mi Despensa".
Tu objetivo es interpretar órdenes en lenguaje natural del usuario (en español) para gestionar su despensa y lista de la compra.

INFORMACIÓN DEL SISTEMA:
- Contenedores disponibles: ${JSON.stringify(containerNames)}
- Unidades permitidas: ${JSON.stringify(ALLOWED_UNITS)}
- Categorías permitidas: ${JSON.stringify(CATEGORIES)}
- Inventario actual (productos existentes): ${JSON.stringify(inventorySnapshot)}

REGLAS DE INTERPRETACIÓN:
1. TIPOS DE ACCIÓN POSIBLES:
   - "consume": Cuando el usuario dice que ha gastado, comido, bebido, terminado, usado o quitado algo de la despensa.
     * Si coincide con un producto existente en el inventario, usa su "productId", su "productName", su "location" y su "unit".
   - "add_stock": Cuando el usuario compró, añadió o sumó existencias de un producto QUE YA EXISTE en el inventario.
     * Usa su "productId", "location" y "unit".
   - "create_product": Cuando el usuario compró o quiere añadir un alimento NUEVO que no existe en el inventario actual.
     * Asigna un "location" válido de la lista de contenedores disponibles (ej. lácteos/frescos en Nevera, congelados en Congelador, legumbres/conservas en Despensa 1 o la primera despensa).
     * Asigna una categoría adecuada de las permitidas.
   - "add_to_shopping_list": Cuando el usuario pide expresamente apuntar, añadir a la compra o a la lista de la compra (ej. "apunta huevos", "compra café").

2. MULTI-ACCIONES:
   Un único comando puede tener múltiples acciones. Por ejemplo:
   "Gastamos el litro de leche y apunta huevos y aceite a la lista de la compra" -> 1 acción "consume" y 2 acciones "add_to_shopping_list".

3. UNIDADES Y CANTIDADES:
   - "unit" DEBE ser una de: "ud", "kg", "g", "l", "ml", "paquete", "lata".
   - "quantity" DEBE ser un número mayor que 0. Si no se especifica, deduce un valor lógico (ej. 1 ud, 1 l, 6 ud para huevos, 1 paquete).
   - "notes" o "note": motivo breve o texto de origen.

4. FORMATO DE RESPUESTA:
   Responde ÚNICAMENTE en JSON válido con el siguiente esquema:
   {
     "summary": "Resumen breve en español de las acciones que se realizarán (ej. 'Consumir 1 l de leche y añadir 2 productos a la compra')",
     "actions": [
       {
         "type": "consume" | "add_stock" | "create_product" | "add_to_shopping_list",
         "productId": "id-del-producto-si-existe-o-null",
         "productName": "Nombre claro del producto",
         "quantity": 1,
         "unit": "ud",
         "location": "Nevera",
         "category": "Lácteos y huevos",
         "note": "Nota opcional"
       }
     ]
   }`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemInstructions}\n\nCOMANDO DEL USUARIO:\n"${prompt.trim()}"`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  // Intentamos con gemini-2.5-flash y si falla probamos gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg =
          errorData?.error?.message ||
          `Error ${response.status} al consultar la API de Gemini (${model})`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini devolvió una respuesta vacía.');
      }

      const parsed = JSON.parse(rawText) as {
        summary?: string;
        actions?: Array<{
          type: GeminiAction['type'];
          productId?: string | null;
          productName?: string;
          quantity?: number;
          unit?: string;
          location?: string;
          category?: string;
          note?: string;
        }>;
      };

      const actions: GeminiAction[] = (parsed.actions || []).map(
        (action, idx) => ({
          id: `gemini-act-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          type: action.type,
          productId: action.productId || null,
          productName: action.productName?.trim() || 'Producto',
          quantity: Math.max(0.1, Number(action.quantity) || 1),
          unit: sanitizeUnit(action.unit || 'ud'),
          location: action.location || containerNames[0] || 'Despensa 1',
          category: action.category || 'Otros',
          note: action.note || 'Asistente IA',
          selected: true,
        })
      );

      return {
        summary:
          parsed.summary ||
          (actions.length > 0
            ? `Se han detectado ${actions.length} acción(es)`
            : 'No se detectaron acciones claras.'),
        actions,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Si el error fue de autenticación/clave inválida, no reintentamos con otro modelo
      if (
        lastError.message.includes('API key not valid') ||
        lastError.message.includes('API_KEY_INVALID')
      ) {
        throw new Error(
          'La API Key de Gemini no es válida. Por favor, revísala en los ajustes del asistente.'
        );
      }
    }
  }

  throw lastError || new Error('No se pudo conectar con el servicio de Gemini.');
};
