import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerState, GameObject, Mission, Dialogue, ShopItem } from './types';
import {
  gameObjects as initialGameObjects,
  missions as initialMissions,
  shopItems,
  PLAYER_INITIAL_SPEED,
  PLAYER_INTERACTION_RANGE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  INITIAL_XP_TO_LEVEL_UP,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT
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
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
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
    const [isDevMode, setIsDevMode] = useState(false);
    const [titleClickCount, setTitleClickCount] = useState(0);
    const [isTitleClicked, setIsTitleClicked] = useState(false);


    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameLoopRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());
    const notificationTimeoutRef = useRef<number | null>(null);
    const titleClickTimeoutRef = useRef<number | null>(null);


    const isGamePaused = dialogue || isShopOpen || isInventoryOpen || isMenuOpen || isChatOpen;
    const isPausedRef = useRef(isGamePaused);
    isPausedRef.current = isGamePaused;
    
    const gameObjectsRef = useRef(gameObjects);
    gameObjectsRef.current = gameObjects;

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
                const generatedText = await generateNpcDialogue(target.name!, activeMission.contenido_educativo);
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
    }, [playerState, missions, dialogue, advanceMissionStep, showNotification]);

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
    
    const handleTitleClick = () => {
        if (playerState.upgrades.includes('teleporter_module') && !isGamePaused) {
            // Visual feedback
            setIsTitleClicked(true);
            setTimeout(() => setIsTitleClicked(false), 150);
    
            // Reset timer
            if (titleClickTimeoutRef.current) {
                clearTimeout(titleClickTimeoutRef.current);
            }
    
            const newCount = titleClickCount + 1;
            setTitleClickCount(newCount);
    
            if (newCount >= 7) {
                if (!isDevMode) {
                    setIsDevMode(true);
                    showNotification("Modo desarrollador: Teletransporte activado (Tecla 'T')");
                }
                setTitleClickCount(0); // Reset on success
            } else {
                // Set a new timer to reset the count
                titleClickTimeoutRef.current = window.setTimeout(() => {
                    setTitleClickCount(0);
                }, 2000); // 2 seconds to make the next click
            }
        }
    };

    const handleTeleport = useCallback(() => {
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

        const performTeleportToTarget = (target: GameObject) => {
            const checkCollision = (x: number, y: number) => {
                for (const obj of gameObjects) {
                    if (obj.type === 'obstacle' || obj.type === 'building') {
                        if (x < obj.x + obj.width && x + PLAYER_WIDTH > obj.x && y < obj.y + obj.height && y + PLAYER_HEIGHT > obj.y) {
                            return true;
                        }
                    }
                }
                return false;
            };

            const landingSpots = [
                { x: target.x + target.width / 2 - PLAYER_WIDTH / 2, y: target.y + target.height + 15 },
                { x: target.x + target.width / 2 - PLAYER_WIDTH / 2, y: target.y - PLAYER_HEIGHT - 15 },
                { x: target.x + target.width + 15, y: target.y + target.height / 2 - PLAYER_HEIGHT / 2 },
                { x: target.x - PLAYER_WIDTH - 15, y: target.y + target.height / 2 - PLAYER_HEIGHT / 2 }
            ];

            for (const spot of landingSpots) {
                const clampedX = Math.max(0, Math.min(spot.x, WORLD_WIDTH - PLAYER_WIDTH));
                const clampedY = Math.max(0, Math.min(spot.y, WORLD_HEIGHT - PLAYER_HEIGHT));
                if (!checkCollision(clampedX, clampedY)) {
                    setPlayerState(prev => ({ ...prev, x: clampedX, y: clampedY }));
                    return true;
                }
            }
            return false;
        };

        if (performTeleportToTarget(targetObject)) {
            showNotification(`Teletransportado a ${targetObject.name || 'objetivo'} (${missionPurpose}).`);
        } else {
            showNotification("No se pudo encontrar un punto de aterrizaje seguro cerca del objetivo.");
        }
    }, [missions, gameObjects, showNotification]);

    useEffect(() => {
        const gameLoop = (currentTime: number) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            
            if (!isPausedRef.current) {
                setPlayerState(prev => {
                    let dx = 0;
                    let dy = 0;
                    
                    if (keysPressed.current['w'] || keysPressed.current['ArrowUp']) dy -= 1;
                    if (keysPressed.current['s'] || keysPressed.current['ArrowDown']) dy += 1;
                    if (keysPressed.current['a'] || keysPressed.current['ArrowLeft']) dx -= 1;
                    if (keysPressed.current['d'] || keysPressed.current['ArrowRight']) dx += 1;
        
                    let newX = prev.x;
                    let newY = prev.y;
        
                    if (dx !== 0 || dy !== 0) {
                        const magnitude = Math.sqrt(dx * dx + dy * dy);
                        const moveX = (dx / magnitude) * prev.speed * deltaTime;
                        const moveY = (dy / magnitude) * prev.speed * deltaTime;
                        
                        newX += moveX;
                        newY += moveY;
                    }
        
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
                    
                    let closestTarget: GameObject | null = null;
                    let minDistance = Infinity;
                    for (const obj of gameObjectsRef.current) {
                        if (obj.type === 'npc' || obj.type === 'object') {
                            const dist = Math.hypot((obj.x + obj.width / 2) - (newX + PLAYER_WIDTH / 2), (obj.y + obj.height / 2) - (newY + PLAYER_HEIGHT / 2));
                            if (dist < prev.interactionRange && dist < minDistance) {
                                minDistance = dist;
                                closestTarget = obj;
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
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isChatOpen) return;
            
            if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                handleInteraction();
            } else if (e.key.toLowerCase() === 't') {
                if (isDevMode) {
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
                 keysPressed.current[e.key.toLowerCase()] = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if(notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
            if(titleClickTimeoutRef.current) clearTimeout(titleClickTimeoutRef.current);
        };
    }, [handleInteraction, dialogue, isShopOpen, isInventoryOpen, isMenuOpen, isChatOpen, isDevMode, handleTeleport]);
    
    const activeMission = missions.find(m => m.status === 'disponible');
    const xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, playerState.level - 1);

    const cameraX = Math.max(0, Math.min(playerState.x - VIEWPORT_WIDTH / 2, WORLD_WIDTH - VIEWPORT_WIDTH));
    const cameraY = Math.max(0, Math.min(playerState.y - VIEWPORT_HEIGHT / 2, WORLD_HEIGHT - VIEWPORT_HEIGHT));

    let missionTarget: GameObject | null = null;
    if (activeMission) {
        const currentStep = activeMission.pasos[activeMission.paso_actual];
        if (currentStep) {
            const targetId = currentStep.tipo === 'entregar' ? currentStep.zona : currentStep.objetoId;
            if (targetId) {
                missionTarget = gameObjects.find(obj => obj.id === targetId) || null;
            }
        }
    }
    
    const playerLevelTier = Math.min(3, Math.floor(playerState.level / 5) + 1);

    return (
        <div className="app-container">
            <div className="game-viewport" style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}>
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
                            {(obj.type === 'npc' || obj.type === 'building') && <span className="object-name">{obj.name}</span>}
                        </div>
                    ))}

                    <div className={`player player-level-${playerLevelTier}`} style={{ left: playerState.x, top: playerState.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}>
                        <div className="player-body">
                            <div className="player-cockpit"></div>
                        </div>
                        <div className="player-shadow"></div>
                    </div>
                    
                    {playerState.interactionTarget && !isGamePaused && (
                        <div className="interaction-prompt" style={{ left: playerState.interactionTarget.x, top: playerState.interactionTarget.y - 40, width: playerState.interactionTarget.width }}>
                            <InteractIcon className="icon" /> [E] {playerState.interactionTarget.name}
                        </div>
                    )}
                    <div className="vignette"></div>
                </div>
            </div>
            
             <div className="top-bar">
                <div 
                    className={`game-title ${playerState.upgrades.includes('teleporter_module') ? 'activatable' : ''} ${isTitleClicked ? 'clicked' : ''}`}
                    onClick={handleTitleClick} 
                    style={{cursor: playerState.upgrades.includes('teleporter_module') ? 'pointer' : 'default'}}
                >
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
                    {showHud && (
                       <div className="hud-box">
                            <h4>Controles</h4>
                            <p className="controls-text"><b>WASD/Flechas:</b> Mover<br/><b>E:</b> Interactuar<br/><b>I:</b> Inventario / <b>M:</b> Misiones<br/><b>Esc:</b> Cerrar</p>
                            <p className="controls-text hint">Pulsa <b>'H'</b> para minimizar la ayuda.</p>
                        </div>
                    )}
                    <MissionArrow 
                        playerX={playerState.x + PLAYER_WIDTH / 2}
                        playerY={playerState.y + PLAYER_HEIGHT / 2}
                        targetX={missionTarget ? missionTarget.x + missionTarget.width / 2 : null}
                        targetY={missionTarget ? missionTarget.y + missionTarget.height / 2 : null}
                        isMinimized={!showHud}
                    />
                </div>

                <div className="hud-column right">
                    {activeMission && (
                        <div className={`mission-tracker hud-box ${!showHud ? 'minimized' : ''}`}>
                            <h3>{activeMission.titulo}</h3>
                            <p>{activeMission.pasos[activeMission.paso_actual]?.descripcion || "¡Misión completada!"}</p>
                        </div>
                    )}
                </div>
            </div>
            
            {dialogue && (
                <div className="dialogue-overlay" onClick={() => setDialogue(null)}>
                    <div className="dialogue-box">
                        <h3>{dialogue.npcName}</h3>
                        <p>{dialogue.text}</p>
                        <small>Haz clic o pulsa 'E' / 'Esc' para cerrar</small>
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
                                <button onClick={() => { setIsMenuOpen(false); setMenuView('main'); }} style={{marginTop: '20px'}}>Cerrar</button>
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