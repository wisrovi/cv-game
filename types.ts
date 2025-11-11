export interface GameObject {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'npc' | 'building' | 'obstacle' | 'object';
    name?: string;
    color?: string;
    missionId?: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
}

export interface PlayerState {
    x: number;
    y: number;
    level: number;
    xp: number;
    coins: number;
    gems: { [key: string]: number };
    inventory: InventoryItem[];
    speed: number;
    interactionTarget: GameObject | null;
    upgrades: string[];
    xpBoost: number;
    interactionRange: number;
}

export interface MissionStep {
    descripcion: string;
    tipo: 'interactuar' | 'recoger' | 'entregar' | 'info';
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
    status: 'disponible' | 'completada' | 'bloqueada';
    pasos: MissionStep[];
    contenido_educativo: string;
    paso_actual: number;
}

export interface Dialogue {
    npcName: string;
    text: string;
    missionContent: string;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    effect: {
        type: 'SPEED_BOOST' | 'INTERACTION_RANGE_BOOST' | 'XP_BOOST';
        value: number;
    };
}

export interface ChatMessage {
    sender: 'user' | 'gemini';
    text: string;
    sources?: { uri: string; title: string }[];
}
