export interface Paso {
  descripcion: string;
  tipo: 'info' | 'interactuar' | 'recoger' | 'entregar';
  objetoId?: string;
  itemId?: string;
  requiredItem?: string;
  zona?: string;
}

export interface Mission {
  id: number;
  titulo: string;
  descripcion: string;
  recompensa_gemas: number;
  color_gema: string;
  recompensa_monedas: number;
  recompensa_xp: number;
  referencia: string;
  status: 'disponible' | 'bloqueada' | 'completada';
  pasos: Paso[];
  contenido_educativo: string;
  paso_actual: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    effect: {
        type: 'SPEED_BOOST' | 'JUMP_JETS' | 'INTERACTION_RANGE_BOOST' | 'XP_BOOST';
        value: number;
    }
}

export interface PlayerState {
  x: number;
  y: number;
  level: number;
  xp: number;
  coins: number;
  gems: { [color: string]: number };
  inventory: InventoryItem[];
  speed: number;
  interactionTarget: GameObject | null;
  upgrades: string[];
  xpBoost: number; // XP multiplier, starts at 1
  interactionRange: number; // Base interaction range multiplier
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'npc' | 'object' | 'obstacle';
  color: string;
  name?: string;
  missionId?: number;
}

export interface Dialogue {
    npcName: string;
    text: string;
    missionContent: string;
}

export interface ChatMessage {
    sender: 'user' | 'gemini';
    text: string;
    sources?: { uri: string; title: string }[];
}