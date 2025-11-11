import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerState, GameObject, Mission, Dialogue, ShopItem, Interior } from './types';
import {
  gameObjects as initialGameObjects,
  missions as initialMissions,
  shopItems,
  interiors,
  PLAYER_INITIAL_SPEED,
  PLAYER_INTERACTION_RANGE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  INITIAL_XP_TO_LEVEL_UP,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  GAME_VERSION
} from './constants';
import { generateNpcDialogue } from './services/geminiService';
import { CoinIcon, GemIcon, XPIcon, InteractIcon, SettingsIcon, CheckIcon, LockIcon } from './components/Icons';
import MissionChat from './components/MissionChat';
import './App.css';

interface MissionArrowProps {
    playerX: number;
    playerY: number;
    targetX: number | null;
    targetY: number | null;
    isMinimized: boolean;
}

const MissionArrow: React.FC<MissionArrowProps> = ({ playerX, playerY, targetX, targetY, isMinimized }) => {
    if (targetX === null || targetY === null) return null;

    const angle = Math.atan2(targetY - playerY, targetX - playerX) * (180 / Math.PI);

    return (
        <div className={`mission-arrow-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="mission-arrow" style={{ transform: `rotate(${angle}deg)` }}>
                ➤
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [playerState, setPlayerState] = useState<PlayerState>({
        x: 1100,
        y: 1450,
        level: 1,
        xp: 0,
        coins: 50,
        gems: {},
        inventory: [],
        speed: PLAYER_INITIAL_SPEED,
        interactionTarget: null,
        upgrades: [],
        xpBoost: 1,
        interactionRange: PLAYER_INTERACTION_RANGE,
    });

    const [missions, setMissions] = useState<Mission[]>(initialMissions);
    const [gameObjects, setGameObjects] = useState<GameObject[]>(initialGameObjects);
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'missions'>('main');
    const [showHud, setShowHud] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMission, setChatMission] = useState<Mission | null>(null);
    const [currentInterior, setCurrentInterior] = useState<Interior | null>(null);
    
    // Developer Mode State
    const [devOptionsUnlocked, setDevOptionsUnlocked] = useState(false);
    const [teleporterEnabled, setTeleporterEnabled] = useState(false);
    const [versionClickCount, setVersionClickCount] = useState(0);
    const [isTeleporting, setIsTeleporting] = useState(false);
    const [teleportPhase, setTeleportPhase] = useState<'idle' | 'out' | 'in'>('idle');


    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameLoopRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());
    const notificationTimeoutRef = useRef<number | null>(null);
    const versionClickTimeoutRef = useRef<number | null>(null);


    const isGamePaused = dialogue || isShopOpen || isInventoryOpen || isMenuOpen || isChatOpen;
    const isPausedRef = useRef(isGamePaused);
    isPausedRef.current = isGamePaused;
    
    useEffect(() => {
        // When the game is paused (e.g., a modal opens), clear any pressed keys
        // to prevent the player from moving unexpectedly when the game resumes.
        if (isGamePaused) {
            keysPressed.current = {};
        }
    }, [isGamePaused]);
    
    const gameObjectsRef = useRef(gameObjects);
    gameObjectsRef.current = gameObjects;
    
    // Load dev settings from localStorage on initial load
    useEffect(() => {
        try {
            const unlocked = localStorage.getItem('devOptionsUnlocked') === 'true';
            const teleporter = localStorage.getItem('teleporterEnabled') === 'true';
            setDevOptionsUnlocked(unlocked);
            if (unlocked) {
                setTeleporterEnabled(teleporter);
            }
        } catch (error) {
            console.warn("Could not read developer settings from localStorage", error);
        }
    }, []);

    const showNotification = useCallback((message: string, duration: number = 3000) => {
        setNotification(message);
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = window.setTimeout(() => {
            setNotification(null);
        }, duration);
    }, []);

    const openMissionChat = (mission: Mission) => {
        if (mission.status === 'completada') {
            setChatMission(mission);
            setIsChatOpen(true);
            setIsMenuOpen(false);
        }
    };
    
    const addInventoryItem = (itemId: string, name: string, quantity: number = 1) => {
        setPlayerState(prev => {
            const newInventory = [...prev.inventory];
            const existingItem = newInventory.find(i => i.id === itemId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                newInventory.push({ id: itemId, name, quantity });
            }
            return { ...prev, inventory: newInventory };
        });
    };

    const removeInventoryItem = (itemId: string, quantity: number = 1) => {
        setPlayerState(prev => {
            const newInventory = [...prev.inventory];
            const itemIndex = newInventory.findIndex(i => i.id === itemId);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= quantity;
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return { ...prev, inventory: newInventory };
        });
    };
    
    const hasInventoryItem = (itemId: string) => playerState.inventory.some(i => i.id === itemId);

    const advanceMissionStep = useCallback((missionId: number) => {
        const mission = missions.find(m => m.id === missionId);
        if (!mission) return;

        const isCompletingMission = mission.paso_actual >= mission.pasos.length - 1;

        if (isCompletingMission) {
            showNotification(`¡Misión "${mission.titulo}" completada!`);
            setPlayerState(p => {
                 const newGems = { ...p.gems, [mission.color_gema]: (p.gems[mission.color_gema] || 0) + mission.recompensa_gemas };
                 let newXp = p.xp + mission.recompensa_xp * p.xpBoost;
                 const xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, p.level - 1);
                 let newLevel = p.level;
                 if (newXp >= xpToLevelUp) {
                     newLevel++;
                     newXp -= xpToLevelUp;
                     showNotification(`¡Subiste de nivel! Nivel ${newLevel}`);
                 }
                 return { ...p, coins: p.coins + mission.recompensa_monedas, xp: newXp, level: newLevel, gems: newGems };
            });
            setMissions(prevMissions => prevMissions.map(m => {
                if (m.id === missionId) return { ...m, status: 'completada', paso_actual: m.paso_actual + 1 };
                if (m.id === missionId + 1) return { ...m, status: 'disponible' }; // Unlock next mission
                return m;
            }));
        } else {
            setMissions(prevMissions => prevMissions.map(m => {
                if (m.id === missionId) {
                    const newPaso = m.paso_actual + 1;
                    showNotification(`Nuevo objetivo: ${m.pasos[newPaso].descripcion}`);
                    return { ...m, paso_actual: newPaso };
                }
                return m;
            }));
        }
    }, [missions, playerState.xpBoost, showNotification]);

    const handleInteraction = useCallback(async () => {
        if (dialogue) { setDialogue(null); return; }
        
        const target = playerState.interactionTarget;
        if (!target) return;

        // --- Interior Logic ---
        if (currentInterior) {
            // Trying to exit
            const exit = currentInterior.exit;
            const dist = Math.hypot(
                (exit.x + exit.width / 2) - (playerState.x + PLAYER_WIDTH / 2),
                (exit.y + exit.height / 2) - (playerState.y + PLAYER_HEIGHT / 2)
            );

            if (dist < playerState.interactionRange) {
                const building = gameObjects.find(b => b.id === currentInterior.buildingId);
                if (building && building.door) {
                    setPlayerState(prev => ({
                        ...prev,
                        x: building.x + building.door.x,
                        y: building.y + building.door.y + building.door.height,
                    }));
                }
                setCurrentInterior(null);
            }
            return;
        }

        // --- Exterior Logic ---
        if (target.type === 'building' && target.door) {
            const door = target.door;
            const doorWorldX = target.x + door.x;
            const doorWorldY = target.y + door.y;

            const dist = Math.hypot(
                (doorWorldX + door.width / 2) - (playerState.x + PLAYER_WIDTH / 2),
                (doorWorldY + door.height / 2) - (playerState.y + PLAYER_HEIGHT / 2)
            );

            if (dist < playerState.interactionRange) {
                const interior = interiors.find(i => i.buildingId === target.id);
                if (interior) {
                    setCurrentInterior(interior);
                    setPlayerState(prev => ({
                        ...prev,
                        x: interior.exit.x,
                        y: interior.exit.y + interior.exit.height,
                        interactionTarget: null
                    }));
                }
                return;
            }
        }

        if (target.id === 'npc_vendor') {
            setIsShopOpen(true);
            return;
        }

        const activeMission = missions.find(m => m.status === 'disponible');
        if (!activeMission) return;

        const currentStep = activeMission.pasos[activeMission.paso_actual];
        if (!currentStep) return;

        let actionTaken = false;

        if (currentStep.tipo === 'interactuar' && currentStep.objetoId === target.id) {
            if (target.type === 'npc') {
                setDialogue({ npcName: target.name!, text: "Generando diálogo...", missionContent: activeMission.contenido_educativo });
                const generatedText = await generateNpcDialogue(target.name!, activeMission);
                setDialogue({ npcName: target.name!, text: generatedText, missionContent: activeMission.contenido_educativo });
            }
            actionTaken = true;
        } else if (currentStep.tipo === 'recoger' && currentStep.objetoId === target.id) {
            showNotification(`¡Has recogido ${target.name}!`);
            addInventoryItem(currentStep.itemId!, target.name!, 1);
            setGameObjects(prev => prev.filter(obj => obj.id !== target.id));
            actionTaken = true;
        } else if (currentStep.tipo === 'entregar') {
            const isTargetNpc = currentStep.zona?.startsWith('npc_');
            const zone = gameObjects.find(g => g.id === currentStep.zona);
            let inZone = false;
            
            if (isTargetNpc && playerState.interactionTarget?.id === currentStep.zona) {
                 inZone = true;
            } else if (zone && playerState.x < zone.x + zone.width && playerState.x + PLAYER_WIDTH > zone.x &&
                playerState.y < zone.y + zone.height && playerState.y + PLAYER_HEIGHT > zone.y) {
                inZone = true;
            }

            if(inZone) {
                if (currentStep.requiredItem && hasInventoryItem(currentStep.requiredItem)) {
                    removeInventoryItem(currentStep.requiredItem);
                    showNotification(`Has entregado el objeto a ${zone?.name || 'la zona'}.`);
                    actionTaken = true;
                } else {
                    showNotification(`Necesitas el objeto requerido.`);
                }
            }
        }

        if (actionTaken) {
            advanceMissionStep(activeMission.id);
        }
    }, [playerState, missions, dialogue, advanceMissionStep, showNotification, currentInterior]);

    const buyShopItem = (item: ShopItem) => {
        if (playerState.coins >= item.cost && !playerState.upgrades.includes(item.id)) {
            setPlayerState(p => {
                const newUpgrades = [...p.upgrades, item.id];
                let newSpeed = p.speed;
                let newInteractionRange = p.interactionRange;
                let newXpBoost = p.xpBoost;

                if (item.effect.type === 'SPEED_BOOST') newSpeed *= item.effect.value;
                if (item.effect.type === 'INTERACTION_RANGE_BOOST') newInteractionRange *= item.effect.value;
                if (item.effect.type === 'XP_BOOST') newXpBoost *= item.effect.value;

                return {
                    ...p,
                    coins: p.coins - item.cost,
                    upgrades: newUpgrades,
                    speed: newSpeed,
                    interactionRange: newInteractionRange,
                    xpBoost: newXpBoost,
                };
            });
            showNotification(`¡Has comprado ${item.name}!`);
        }
    };
    
    const handleVersionClick = () => {
        if (versionClickTimeoutRef.current) {
            clearTimeout(versionClickTimeoutRef.current);
        }
    
        const newCount = versionClickCount + 1;
        setVersionClickCount(newCount);
    
        if (newCount >= 7) {
            if (!devOptionsUnlocked) {
                setDevOptionsUnlocked(true);
                localStorage.setItem('devOptionsUnlocked', 'true');
                showNotification("¡Opciones de desarrollador desbloqueadas!");
            }
            setVersionClickCount(0); // Reset on success
        } else {
            versionClickTimeoutRef.current = window.setTimeout(() => {
                setVersionClickCount(0);
            }, 1500); // 1.5 seconds to make the next click
        }
    };

    const handleTeleporterToggle = () => {
        const newSetting = !teleporterEnabled;
        setTeleporterEnabled(newSetting);
        localStorage.setItem('teleporterEnabled', String(newSetting));
        showNotification(`Teletransporte ${newSetting ? 'activado' : 'desactivado'}.`);
    };

    const handleTeleport = useCallback(() => {
        if(currentInterior) {
            showNotification("No se puede usar el teletransporte en interiores.");
            return;
        }

        let missionToTarget = missions.find(m => m.status === 'disponible');
        let missionPurpose = "objetivo de misión actual";

        if (!missionToTarget) {
            missionToTarget = missions.find(m => m.status === 'bloqueada');
            missionPurpose = "inicio de la siguiente misión";
        }

        if (!missionToTarget) {
            showNotification("¡Felicidades! Has completado todas las misiones.");
            return;
        }

        const currentStep = missionToTarget.pasos[missionToTarget.paso_actual];
        const targetId = currentStep.tipo === 'entregar' ? currentStep.zona : currentStep.objetoId;

        if (!targetId) {
            showNotification("El siguiente paso no tiene un objetivo físico.");
            return;
        }
        const targetObject = gameObjects.find(obj => obj.id === targetId);

        if (!targetObject) {
            showNotification("No se pudo encontrar el objetivo de la misión.");
            return;
        }

        const findSafeLandingSpot = (target: GameObject): {x: number, y: number} | null => {
            const checkCollision = (x: number, y: number) => {
                const playerLeft = x;
                const playerRight = x + PLAYER_WIDTH;
                const playerTop = y;
                const playerBottom = y + PLAYER_HEIGHT;

                for (const obj of gameObjects) {
                    if (obj.type === 'obstacle' || obj.type === 'building') {
                        const objLeft = obj.x;
                        const objRight = obj.x + obj.width;
                        const objTop = obj.y;
                        const objBottom = obj.y + obj.height;

                        if (playerLeft < objRight && playerRight > objLeft && playerTop < objBottom && playerBottom > objTop) {
                            return true;
                        }
                    }
                }
                return false;
            };

            const centerX = target.x + target.width / 2;
            const centerY = target.y + target.height / 2;
            let radius = Math.max(target.width, target.height) / 2 + PLAYER_WIDTH;
            const maxRadius = radius + 200;
            const angleStep = Math.PI / 12;

            while (radius < maxRadius) {
                for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
                    const potentialX = centerX + Math.cos(angle) * radius - PLAYER_WIDTH / 2;
                    const potentialY = centerY + Math.sin(angle) * radius - PLAYER_HEIGHT / 2;
                    
                    const clampedX = Math.max(0, Math.min(potentialX, WORLD_WIDTH - PLAYER_WIDTH));
                    const clampedY = Math.max(0, Math.min(potentialY, WORLD_HEIGHT - PLAYER_HEIGHT));

                    if (!checkCollision(clampedX, clampedY)) {
                        return { x: clampedX, y: clampedY };
                    }
                }
                radius += 20;
            }

            return null;
        };

        const safeSpot = findSafeLandingSpot(targetObject);

        if (safeSpot) {
            setTeleportPhase('out');
            setTimeout(() => {
                setIsTeleporting(true);
            }, 200);

            setTimeout(() => {
                setPlayerState(prev => ({ ...prev, x: safeSpot.x, y: safeSpot.y }));
                setTeleportPhase('in');
                showNotification(`Teletransportado a ${targetObject.name || 'objetivo'} (${missionPurpose}).`);
            }, 500);

            setTimeout(() => {
                setIsTeleporting(false);
                setTeleportPhase('idle');
            }, 1000);
        } else {
            showNotification("No se pudo encontrar un punto de aterrizaje seguro cerca del objetivo.");
        }
    }, [missions, gameObjects, showNotification, currentInterior]);

    useEffect(() => {
        const gameLoop = (currentTime: number) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            
            if (!isPausedRef.current) {
                setPlayerState(prev => {
                    let dx = 0;
                    let dy = 0;
                    
                    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
                    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
                    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
                    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
        
                    let newX = prev.x;
                    let newY = prev.y;
        
                    if (dx !== 0 || dy !== 0) {
                        const magnitude = Math.sqrt(dx * dx + dy * dy);
                        const moveX = (dx / magnitude) * prev.speed * deltaTime;
                        const moveY = (dy / magnitude) * prev.speed * deltaTime;
                        
                        newX += moveX;
                        newY += moveY;
                    }
                    
                    let closestTarget: GameObject | null = null;
                    
                    if (currentInterior) {
                        newX = Math.max(0, Math.min(newX, currentInterior.width - PLAYER_WIDTH));
                        newY = Math.max(0, Math.min(newY, currentInterior.height - PLAYER_HEIGHT));
                        const exit = currentInterior.exit;
                        const dist = Math.hypot((exit.x + exit.width / 2) - (newX + PLAYER_WIDTH / 2), (exit.y + exit.height / 2) - (newY + PLAYER_HEIGHT / 2));
                        if(dist < prev.interactionRange) {
                            closestTarget = { id: 'exit_door', name: 'Salir', type: 'object', ...exit };
                        }
                    } else {
                        const checkCollision = (x: number, y: number) => {
                            for (const obj of gameObjectsRef.current) {
                                if (obj.type === 'obstacle' || obj.type === 'building') {
                                    if (x < obj.x + obj.width && x + PLAYER_WIDTH > obj.x && y < obj.y + obj.height && y + PLAYER_HEIGHT > obj.y) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        };
            
                        if (checkCollision(newX, newY)) {
                            if (!checkCollision(prev.x, newY)) newX = prev.x;
                            else if (!checkCollision(newX, prev.y)) newY = prev.y;
                            else { newX = prev.x; newY = prev.y; }
                        }
            
                        newX = Math.max(0, Math.min(newX, WORLD_WIDTH - PLAYER_WIDTH));
                        newY = Math.max(0, Math.min(newY, WORLD_HEIGHT - PLAYER_HEIGHT));
                        
                        let minDistance = Infinity;
                        for (const obj of gameObjectsRef.current) {
                            if (obj.type === 'npc' || obj.type === 'object' || obj.type === 'building') {
                                const targetCenterX = obj.type === 'building' && obj.door ? obj.x + obj.door.x + obj.door.width / 2 : obj.x + obj.width / 2;
                                const targetCenterY = obj.type === 'building' && obj.door ? obj.y + obj.door.y + obj.door.height / 2 : obj.y + obj.height / 2;
                                
                                const dist = Math.hypot(targetCenterX - (newX + PLAYER_WIDTH / 2), targetCenterY - (newY + PLAYER_HEIGHT / 2));
                                
                                if (dist < prev.interactionRange && dist < minDistance) {
                                    minDistance = dist;
                                    closestTarget = obj;
                                }
                            }
                        }
                    }
                    
                    return { ...prev, x: newX, y: newY, interactionTarget: closestTarget };
                });
            }
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [currentInterior]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isChatOpen) return;
            
            if (e.key === ' ') {
                e.preventDefault();
                handleInteraction();
            } else if (e.key.toLowerCase() === 't') {
                if (teleporterEnabled) {
                    e.preventDefault();
                    handleTeleport();
                }
            } else if (e.key.toLowerCase() === 'i') {
                setIsInventoryOpen(prev => !prev);
            } else if (e.key.toLowerCase() === 'h') {
                setShowHud(prev => !prev);
            } else if (e.key.toLowerCase() === 'm') {
                setIsMenuOpen(true);
                setMenuView('missions');
            } else if (e.key === 'Escape') {
                if (dialogue) setDialogue(null);
                if (isShopOpen) setIsShopOpen(false);
                if (isInventoryOpen) setIsInventoryOpen(false);
                if (isMenuOpen) { setIsMenuOpen(false); setMenuView('main'); }
            } else {
                const key = e.key.toLowerCase();
                // Prevent default for movement keys to avoid scrolling the page
                if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                    e.preventDefault();
                }
                keysPressed.current[key] = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
        const handleBlur = () => { keysPressed.current = {}; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            if(notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
            if(versionClickTimeoutRef.current) clearTimeout(versionClickTimeoutRef.current);
        };
    }, [handleInteraction, dialogue, isShopOpen, isInventoryOpen, isMenuOpen, isChatOpen, teleporterEnabled, handleTeleport]);
    
    const activeMission = missions.find(m => m.status === 'disponible');
    const xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, playerState.level - 1);

    const cameraX = Math.max(0, Math.min(playerState.x - VIEWPORT_WIDTH / 2, WORLD_WIDTH - VIEWPORT_WIDTH));
    const cameraY = Math.max(0, Math.min(playerState.y - VIEWPORT_HEIGHT / 2, WORLD_HEIGHT - VIEWPORT_HEIGHT));

    let missionTarget: GameObject | null = null;
    if (activeMission && !currentInterior) {
        const currentStep = activeMission.pasos[activeMission.paso_actual];
        if (currentStep) {
            const targetId = currentStep.tipo === 'entregar' ? currentStep.zona : currentStep.objetoId;
            if (targetId) {
                missionTarget = gameObjects.find(obj => obj.id === targetId) || null;
            }
        }
    }
    
    const playerLevelTier = Math.min(3, Math.floor(playerState.level / 5) + 1);
    const playerClasses = `player player-level-${playerLevelTier} ${teleportPhase !== 'idle' ? `teleport-${teleportPhase}` : ''}`;

    return (
        <div className="app-container">
            {isTeleporting && <div className="teleport-overlay"></div>}
            <div className="game-viewport" style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}>
                {currentInterior ? (
                    <div className="interior-view" style={{ width: currentInterior.width, height: currentInterior.height }}>
                        <div className="interior-exit-door" style={{ left: currentInterior.exit.x, top: currentInterior.exit.y, width: currentInterior.exit.width, height: currentInterior.exit.height }}></div>
                        <div className={playerClasses} style={{ left: playerState.x, top: playerState.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}>
                            <div className="player-body">
                                <div className="player-cockpit"></div>
                            </div>
                            <div className="player-shadow"></div>
                        </div>
                        {playerState.interactionTarget && !isGamePaused && (
                           <div className="interaction-prompt" style={{ left: playerState.interactionTarget.x, top: playerState.interactionTarget.y - 40, width: playerState.interactionTarget.width }}>
                                <InteractIcon className="icon" /> [Espacio] {playerState.interactionTarget.name}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="game-world" style={{ 
                        width: WORLD_WIDTH, 
                        height: WORLD_HEIGHT,
                        transform: `translate(${-cameraX}px, ${-cameraY}px)`
                    }}>
                        <div className="background-animated"></div>
                        <div className="particles">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="particle" style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDuration: `${25 + Math.random() * 25}s`,
                              animationDelay: `${Math.random() * 20}s`,
                            }}>
                                <div className="particle-content" style={{ transform: `scale(${0.3 + Math.random() * 0.4})`}}>
                                    <div className="particle-body">
                                        <div className="particle-head"></div>
                                    </div>
                                </div>
                            </div>
                          ))}
                        </div>
                        
                        {gameObjects.map(obj => (
                            <div key={obj.id} id={obj.id} className={`game-object ${obj.type}`} style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, backgroundColor: obj.type !== 'npc' ? obj.color : undefined }}>
                               {(obj.type === 'npc') && (
                                    <>
                                      <div className="npc-body">
                                          <div className="npc-head"></div>
                                      </div>
                                    </>
                                )}
                                {obj.type === 'building' && obj.door && <div className="building-door" style={{ left: obj.door.x, top: obj.door.y, width: obj.door.width, height: obj.door.height }} />}
                                {(obj.type === 'npc' || obj.type === 'building') && <span className="object-name">{obj.name}</span>}
                            </div>
                        ))}

                        <div className={playerClasses} style={{ left: playerState.x, top: playerState.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}>
                            <div className="player-body">
                                <div className="player-cockpit"></div>
                            </div>
                            <div className="player-shadow"></div>
                        </div>
                        
                        {playerState.interactionTarget && !isGamePaused && (
                             <div className="interaction-prompt" style={{
                                left: playerState.interactionTarget.x + (playerState.interactionTarget.door?.x || 0),
                                top: playerState.interactionTarget.y + (playerState.interactionTarget.door?.y || 0) - 40
                            }}>
                                <InteractIcon className="icon" /> [Espacio] {playerState.interactionTarget.type === 'building' ? 'Entrar' : playerState.interactionTarget.name}
                            </div>
                        )}
                        <div className="vignette"></div>
                    </div>
                )}
            </div>
            
             <div className="top-bar">
                <div className="game-title">
                    Wisrovi's Interactive CV
                </div>
                <div className="top-bar-right">
                    <div className="player-stats-top">
                        <div className="player-level">Nv. {playerState.level}</div>
                        <div className="xp-bar-container-top" title={`${Math.round(playerState.xp)} / ${Math.round(xpToLevelUp)} XP`}>
                            <div className="xp-bar-top">
                                <div className="xp-fill-top" style={{ width: `${(playerState.xp / xpToLevelUp) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="currency-top">
                            <CoinIcon className="icon" /> {playerState.coins}
                            {Object.entries(playerState.gems).map(([color, amount]) => (
                                <div key={color} className="gem-display"><GemIcon className="icon" color={color} /> {amount}</div>
                            ))}
                        </div>
                    </div>
                    <button className="hud-button" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menú">
                        <SettingsIcon />
                    </button>
                </div>
            </div>
            
            <div className="ui-container">
                <div className="hud-column left">
                    <MissionArrow 
                        playerX={playerState.x + PLAYER_WIDTH / 2}
                        playerY={playerState.y + PLAYER_HEIGHT / 2}
                        targetX={missionTarget ? missionTarget.x + missionTarget.width / 2 : null}
                        targetY={missionTarget ? missionTarget.y + missionTarget.height / 2 : null}
                        isMinimized={!showHud}
                    />
                </div>

                <div className="hud-column right">
                    {activeMission && !currentInterior && (
                        <div className={`mission-tracker hud-box ${!showHud ? 'minimized' : ''}`}>
                            <h3>{activeMission.titulo}</h3>
                            <p>{activeMission.pasos[activeMission.paso_actual]?.descripcion || "¡Misión completada!"}</p>
                        </div>
                    )}
                </div>
            </div>

            {showHud && (
               <div className="controls-overlay">
                   <div className="hud-box">
                        <h4>Controles</h4>
                        <p className="controls-text"><b>WASD/Flechas:</b> Mover<br/><b>Espacio:</b> Interactuar<br/><b>I:</b> Inventario / <b>M:</b> Misiones<br/><b>Esc:</b> Cerrar</p>
                        <p className="controls-text hint">Pulsa <b>'H'</b> para ocultar la ayuda.</p>
                    </div>
                </div>
            )}
            
            {dialogue && (
                <div className="dialogue-overlay" onClick={() => setDialogue(null)}>
                    <div className="dialogue-box">
                        <h3>{dialogue.npcName}</h3>
                        <p>{dialogue.text}</p>
                        <small>Haz clic o pulsa 'Espacio' / 'Esc' para cerrar</small>
                    </div>
                </div>
            )}
            
            {isShopOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Tienda de Mejoras</h3>
                        <div className="item-list">
                            {shopItems.map(item => (
                                <div key={item.id} className="list-item">
                                    <div>
                                        <b>{item.name}</b>
                                        <p>{item.description}</p>
                                    </div>
                                    <button onClick={() => buyShopItem(item)} disabled={playerState.coins < item.cost || playerState.upgrades.includes(item.id)}>
                                        {playerState.upgrades.includes(item.id) ? 'Comprado' : `${item.cost} Monedas`}
                                    </button>
                                </div>
                            ))}
                        </div>
                         <button onClick={() => setIsShopOpen(false)} style={{marginTop: '20px'}}>Cerrar</button>
                    </div>
                </div>
            )}

            {isInventoryOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Inventario</h3>
                        <div className="item-list">
                        {playerState.inventory.length > 0 ? (
                           playerState.inventory.map(item => <div className="list-item" key={item.id}><p>{item.name} <span>x{item.quantity}</span></p></div>)
                        ) : <p>Tu inventario está vacío.</p>}
                        </div>
                         <button onClick={() => setIsInventoryOpen(false)} style={{marginTop: '20px'}}>Cerrar</button>
                    </div>
                </div>
            )}

            {isMenuOpen && (
                <div className="modal-overlay">
                    <div className="modal-box wide">
                        {menuView === 'main' && (
                            <>
                                <h3>Menú del Juego</h3>
                                <div className="menu-options">
                                    <button onClick={() => setMenuView('missions')}>Lista de Misiones</button>
                                </div>

                                {devOptionsUnlocked && (
                                    <div className="dev-options">
                                        <h4>Opciones de Desarrollador</h4>
                                        <div className="toggle-switch">
                                            <label>
                                                <span>Activar Teletransporte (T)</span>
                                                <input type="checkbox" checked={teleporterEnabled} onChange={handleTeleporterToggle} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => { setIsMenuOpen(false); setMenuView('main'); }} style={{marginTop: '20px'}}>Cerrar</button>
                                <p className="game-version" onClick={handleVersionClick}>v{GAME_VERSION}</p>
                            </>
                        )}
                        {menuView === 'missions' && (
                            <>
                                <h3>Lista de Misiones</h3>
                                <div className="mission-list item-list">
                                    {missions.map(mission => (
                                        <div key={mission.id} className={`list-item mission-item ${mission.status}`} onClick={() => openMissionChat(mission)}>
                                            <div className="mission-status-icon">
                                                {mission.status === 'completada' && <CheckIcon />}
                                                {mission.status === 'bloqueada' && <LockIcon />}
                                                {mission.status === 'disponible' && <div className="status-dot available"></div>}
                                            </div>
                                            <div>
                                                <b>{mission.titulo}</b>
                                                <p>{mission.descripcion}</p>
                                                 {mission.status === 'completada' && <small className="chat-prompt">Haz clic para chatear sobre este proyecto</small>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setMenuView('main')} style={{marginTop: '20px'}}>Volver</button>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {isChatOpen && chatMission && <MissionChat mission={chatMission} onClose={() => setIsChatOpen(false)} />}
            
            {notification && <div className="notification">{notification}</div>}
        </div>
    );
};

export default App;