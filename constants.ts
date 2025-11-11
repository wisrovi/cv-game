import { Mission, GameObject, ShopItem } from './types';

export const PLAYER_INITIAL_SPEED = 180; // pixels per second
export const PLAYER_INTERACTION_RANGE = 50;
export const PLAYER_WIDTH = 35;
export const PLAYER_HEIGHT = 35;

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1600;
export const VIEWPORT_WIDTH = 1200;
export const VIEWPORT_HEIGHT = 800;


export const INITIAL_XP_TO_LEVEL_UP = 100;

export const gameObjects: GameObject[] = [
  // NPCs
  { id: 'npc_ada', x: 1150, y: 1450, width: 30, height: 45, type: 'npc', name: 'Ada, la Guía', color: '#AD1AAD', missionId: 1 },
  { id: 'npc_charles', x: 2100, y: 350, width: 30, height: 45, type: 'npc', name: 'Charles, el Ingeniero', color: '#D55E00', missionId: 2 },
  { id: 'npc_vendor', x: 1300, y: 1250, width: 40, height: 50, type: 'npc', name: 'Vendedor de Mejoras', color: '#0072B2' },

  // Buildings (Projects)
  { id: 'wiliutils_building', x: 200, y: 200, width: 250, height: 150, type: 'building', name: 'Campus Visión (wiliutils)', color: '#009E73' },
  { id: 'wkafka_building', x: 800, y: 150, width: 220, height: 180, type: 'building', name: 'Taller Audio (wkafka)', color: '#0072B2' },
  { id: 'wredis_building', x: 1400, y: 180, width: 200, height: 250, type: 'building', name: 'Redis Hub (wredis)', color: '#D55E00' },
  { id: 'wcontainer_building', x: 2000, y: 550, width: 250, height: 180, type: 'building', name: 'Puerto GPU (wcontainer)', color: '#CC79A7' },
  { id: 'facial_rec_building', x: 200, y: 600, width: 220, height: 180, type: 'building', name: 'Lab. Facial (facial_recognition)', color: '#F0E442' },
  { id: 'wyolo_building', x: 800, y: 800, width: 280, height: 190, type: 'building', name: 'Centro YOLO (wyoloservice)', color: '#56B4E9' },
  { id: 'wml_building', x: 1500, y: 950, width: 250, height: 250, type: 'building', name: 'Centro Datos (wml)', color: '#8B4513' },
  { id: 'wapi_building', x: 2100, y: 1300, width: 200, height: 150, type: 'building', name: 'Mercado API (wapi)', color: '#607D8B' },
  { id: 'wauth_building', x: 200, y: 1100, width: 200, height: 130, type: 'building', name: 'Fortaleza Auth (wauth)', color: '#444444' },
  { id: 'wdeploy_building', x: 1400, y: 1400, width: 220, height: 140, type: 'building', name: 'Plataforma Deploy (wdeploy)', color: '#663399' },
  
  // Obstacles
  { id: 'rock1', x: 600, y: 600, width: 80, height: 80, type: 'obstacle', color: '#616161' },
  { id: 'rock2', x: 640, y: 660, width: 60, height: 60, type: 'obstacle', color: '#616161' },
  { id: 'trees1', x: 1700, y: 600, width: 120, height: 180, type: 'obstacle', color: '#2E7D32' },
  { id: 'trees2', x: 1800, y: 200, width: 80, height: 120, type: 'obstacle', color: '#2E7D32' },

  // Mission specific objects
  { id: 'log_panel_1', x: 225, y: 360, width: 25, height: 25, type: 'object', name: 'Panel de Logs', color: '#00FFFF' },
  { id: 'chip_wkafka_1', x: 840, y: 340, width: 20, height: 20, type: 'object', name: 'Chip de Configuración', color: '#FFD700' },
  { id: 'panel_redis_map_1', x: 1450, y: 440, width: 25, height: 25, type: 'object', name: 'Mapa del Clúster', color: '#1E90FF' },
  { id: 'repair_module_1', x: 2020, y: 740, width: 30, height: 30, type: 'object', name: 'Módulo de Reparación', color: '#FF4500' },
  { id: 'facial_scan_terminal', x: 250, y: 790, width: 30, height: 30, type: 'object', name: 'Terminal de Escaneo', color: '#F0E442' },
  { id: 'yolo_data_drive', x: 850, y: 1000, width: 25, height: 25, type: 'object', name: 'Disco de Datos YOLO', color: '#56B4E9' },
  { id: 'ml_model_core', x: 1550, y: 1210, width: 35, height: 35, type: 'object', name: 'Núcleo del Modelo ML', color: '#8B4513' },
  { id: 'api_key_card', x: 2150, y: 1460, width: 20, height: 20, type: 'object', name: 'Tarjeta de Clave API', color: '#607D8B' },
  { id: 'auth_token_disk', x: 250, y: 1240, width: 25, height: 25, type: 'object', name: 'Disco de Token', color: '#E0E0E0' },
  { id: 'deployment_script', x: 1450, y: 1550, width: 30, height: 30, type: 'object', name: 'Script de Despliegue', color: '#9370DB' },
];

export const missions: Mission[] = [
  {
    "id": 1,
    "titulo": "Primer panel de logs",
    "descripcion": "Explora el campus y encuentra el primer panel con logs de wiliutils.",
    "recompensa_gemas": 1,
    "color_gema": "#00aaff",
    "recompensa_monedas": 10,
    "recompensa_xp": 10,
    "referencia": "https://github.com/wisrovi/wiliutils",
    "status": "disponible",
    "pasos": [
      { "descripcion": "Habla con Ada, la Guía, para empezar tu viaje.", "tipo": "interactuar", "objetoId": "npc_ada" },
      { "descripcion": "Ve al Campus de Visión y busca el Panel de Logs de wiliutils.", "tipo": "interactuar", "objetoId": "log_panel_1" }
    ],
    "contenido_educativo": "Wiliutils es una biblioteca de utilidades para sistemas distribuidos que implementa patrones de registro optimizados para entornos de alta concurrencia.",
    "paso_actual": 0
  },
  {
    "id": 2,
    "titulo": "Chip de configuración de wkafka",
    "descripcion": "Obtén el chip de configuración de un nodo wkafka.",
    "recompensa_gemas": 1,
    "color_gema": "#00aaff",
    "recompensa_monedas": 20,
    "recompensa_xp": 20,
    "referencia": "https://github.com/wisrovi/wkafka",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Habla con Charles, el Ingeniero.", "tipo": "interactuar", "objetoId": "npc_charles" },
      { "descripcion": "Dirígete al Taller de Audio y recoge el Chip de Configuración WKafka.", "tipo": "recoger", "objetoId": "chip_wkafka_1", "itemId": "chip_wkafka_1" },
      { "descripcion": "Entrega el chip en el Taller de Audio (acércate al edificio).", "tipo": "entregar", "requiredItem": "chip_wkafka_1", "zona": "wkafka_building" }
    ],
    "contenido_educativo": "WKafka es una implementación optimizada de Apache Kafka, diseñada para procesamiento de streams de datos en tiempo real con latencias inferiores a 10ms.",
    "paso_actual": 0
  },
    {
    "id": 3,
    "titulo": "Mapa de clúster Redis",
    "descripcion": "Lee el panel del Redis Hub y aprende sobre su arquitectura de caché distribuida.",
    "recompensa_gemas": 2,
    "color_gema": "#2ecc71",
    "recompensa_monedas": 30,
    "recompensa_xp": 30,
    "referencia": "https://github.com/wisrovi/wredis",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Viaja al Redis Hub. Busca el edificio con la estructura hexagonal.", "tipo": "info" },
      { "descripcion": "Interactúa con el Panel del Mapa del Clúster.", "tipo": "interactuar", "objetoId": "panel_redis_map_1" }
    ],
    "contenido_educativo": "WRedis extiende Redis con capacidades avanzadas de clustering y persistencia, permitiendo escalado horizontal con particionado automático.",
    "paso_actual": 0
  },
  {
    "id": 4,
    "titulo": "Reparar contenedor defectuoso",
    "descripcion": "Encuentra y repara el módulo dañado de wcontainer en el puerto GPU.",
    "recompensa_gemas": 2,
    "color_gema": "#2ecc71",
    "recompensa_monedas": 40,
    "recompensa_xp": 40,
    "referencia": "https://github.com/wisrovi/wcontainer",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Ve al Puerto GPU.", "tipo": "info" },
      { "descripcion": "Interactúa con el Módulo de Reparación para arreglar el contenedor.", "tipo": "interactuar", "objetoId": "repair_module_1" }
    ],
    "contenido_educativo": "Wcontainer es una plataforma de orquestación especializada en cargas de trabajo de IA/ML, que optimiza la asignación de recursos GPU/TPU.",
    "paso_actual": 0
  },
  {
    "id": 5,
    "titulo": "Calibración del Reconocimiento Facial",
    "descripcion": "Ayuda a calibrar el sistema de reconocimiento facial en el laboratorio.",
    "recompensa_gemas": 3,
    "color_gema": "#f1c40f",
    "recompensa_monedas": 50,
    "recompensa_xp": 50,
    "referencia": "https://github.com/wisrovi/facial_recognition",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Habla con Ada sobre la nueva tarea de calibración.", "tipo": "interactuar", "objetoId": "npc_ada" },
      { "descripcion": "Ve al Laboratorio Facial e interactúa con el Terminal de Escaneo.", "tipo": "interactuar", "objetoId": "facial_scan_terminal" }
    ],
    "contenido_educativo": "facial_recognition es un proyecto que utiliza redes neuronales convolucionales para la detección y verificación de rostros en tiempo real.",
    "paso_actual": 0
  },
  {
    "id": 6,
    "titulo": "Recuperar Datos de YOLO",
    "descripcion": "Recupera un disco de datos crucial del Centro YOLO para Charles.",
    "recompensa_gemas": 3,
    "color_gema": "#f1c40f",
    "recompensa_monedas": 60,
    "recompensa_xp": 60,
    "referencia": "https://github.com/wisrovi/wyoloservice",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Habla con Charles sobre un disco de datos perdido.", "tipo": "interactuar", "objetoId": "npc_charles" },
      { "descripcion": "Encuentra y recoge el Disco de Datos YOLO cerca del Centro YOLO.", "tipo": "recoger", "objetoId": "yolo_data_drive", "itemId": "yolo_data_drive" },
      { "descripcion": "Entrega el disco de datos a Charles.", "tipo": "entregar", "requiredItem": "yolo_data_drive", "zona": "npc_charles" }
    ],
    "contenido_educativo": "wyoloservice es un microservicio de detección de objetos en tiempo real basado en el modelo YOLO (You Only Look Once).",
    "paso_actual": 0
  },
  {
    "id": 7,
    "titulo": "Activar el Núcleo de Modelo ML",
    "descripcion": "Activa el núcleo de un nuevo modelo de Machine Learning en el Centro de Datos.",
    "recompensa_gemas": 4,
    "color_gema": "#e74c3c",
    "recompensa_monedas": 70,
    "recompensa_xp": 70,
    "referencia": "https://github.com/wisrovi/wml",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Dirígete al Centro de Datos (wml).", "tipo": "info" },
      { "descripcion": "Interactúa con el Núcleo del Modelo ML para iniciar su entrenamiento.", "tipo": "interactuar", "objetoId": "ml_model_core" }
    ],
    "contenido_educativo": "wml es un repositorio que contiene diversos modelos y experimentos de Machine Learning, desde regresiones hasta redes neuronales profundas.",
    "paso_actual": 0
  },
  {
    "id": 8,
    "titulo": "Clave de API Segura",
    "descripcion": "Obtén una tarjeta de clave de API del Mercado API.",
    "recompensa_gemas": 4,
    "color_gema": "#e74c3c",
    "recompensa_monedas": 80,
    "recompensa_xp": 80,
    "referencia": "https://github.com/wisrovi/wapi",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Habla con el Vendedor de Mejoras sobre la seguridad de las APIs.", "tipo": "interactuar", "objetoId": "npc_vendor" },
      { "descripcion": "Recoge la Tarjeta de Clave API del Mercado API.", "tipo": "recoger", "objetoId": "api_key_card", "itemId": "api_key_card" }
    ],
    "contenido_educativo": "wapi es un proyecto que demuestra la creación de APIs RESTful seguras y escalables utilizando FastAPI y Python.",
    "paso_actual": 0
  },
  {
    "id": 9,
    "titulo": "El Token de Autenticación",
    "descripcion": "Consigue un token de autenticación de la Fortaleza Auth y entrégaselo a Ada.",
    "recompensa_gemas": 5,
    "color_gema": "#9b59b6",
    "recompensa_monedas": 90,
    "recompensa_xp": 90,
    "referencia": "https://github.com/wisrovi/wauth",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Recoge el Disco de Token de la Fortaleza Auth.", "tipo": "recoger", "objetoId": "auth_token_disk", "itemId": "auth_token_disk" },
      { "descripcion": "Lleva el Disco de Token a Ada como prueba de acceso.", "tipo": "entregar", "requiredItem": "auth_token_disk", "zona": "npc_ada" }
    ],
    "contenido_educativo": "wauth es un servicio centralizado de autenticación y autorización basado en JWT (JSON Web Tokens) y OAuth2.",
    "paso_actual": 0
  },
  {
    "id": 10,
    "titulo": "Script de Despliegue Final",
    "descripcion": "Ejecuta el script final en la Plataforma de Despliegue.",
    "recompensa_gemas": 5,
    "color_gema": "#9b59b6",
    "recompensa_monedas": 100,
    "recompensa_xp": 100,
    "referencia": "https://github.com/wisrovi/wdeploy",
    "status": "bloqueada",
    "pasos": [
      { "descripcion": "Habla con Charles para recibir las últimas instrucciones.", "tipo": "interactuar", "objetoId": "npc_charles" },
      { "descripcion": "Ve a la Plataforma de Despliegue y activa el Script de Despliegue.", "tipo": "interactuar", "objetoId": "deployment_script" }
    ],
    "contenido_educativo": "wdeploy es un conjunto de scripts y configuraciones de CI/CD para automatizar el despliegue de aplicaciones en la nube utilizando Docker y Kubernetes.",
    "paso_actual": 0
  }
];

export const shopItems: ShopItem[] = [
    { id: 'speed_boost_1', name: 'Aumento de Velocidad', description: 'Aumenta tu velocidad de movimiento en un 33%.', cost: 100, effect: { type: 'SPEED_BOOST', value: 1.33 } },
    { id: 'interaction_range_1', name: 'Escáner de Largo Alcance', description: 'Aumenta tu rango de interacción un 50%.', cost: 120, effect: { type: 'INTERACTION_RANGE_BOOST', value: 1.5 } },
    { id: 'xp_boost_1', name: 'Módulo de Aprendizaje', description: 'Gana un 20% más de XP permanentemente.', cost: 200, effect: { type: 'XP_BOOST', value: 1.2 } },
];