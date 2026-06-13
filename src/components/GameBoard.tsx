import React, { useState, useEffect, useRef } from 'react';
import { Player, Task, ConfettiTrap, GameState } from '../types';
import { Sparkles, MapPin, HandMetal, AlertOctagon, Bell, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Maximize2, Minimize2, AlertCircle, Hand, ChevronUp, ChevronDown } from 'lucide-react';

const WALLS = [
  // Library Walls (Right and Bottom)
  { x: 420, y: 30, w: 15, h: 120 },
  { x: 420, y: 210, w: 15, h: 120 },
  { x: 30, y: 320, w: 150, h: 15 },
  { x: 240, y: 320, w: 195, h: 15 },

  // Kitchen Walls (Left and Bottom)
  { x: 765, y: 30, w: 15, h: 120 },
  { x: 765, y: 210, w: 15, h: 120 },
  { x: 765, y: 320, w: 175, h: 15 },
  { x: 1000, y: 320, w: 170, h: 15 },

  // Playroom Walls (Right and Top)
  { x: 420, y: 470, w: 15, h: 100 },
  { x: 420, y: 630, w: 15, h: 140 },
  { x: 30, y: 465, w: 150, h: 15 },
  { x: 240, y: 465, w: 195, h: 15 },

  // Garden Walls (Left and Top)
  { x: 765, y: 470, w: 15, h: 100 },
  { x: 765, y: 630, w: 15, h: 140 },
  { x: 765, y: 465, w: 175, h: 15 },
  { x: 1000, y: 465, w: 170, h: 15 },
];

const PORTALS = [
  { id: 'portal_library', name: 'Kütüphane Geçidi', room: 'Library', x: 75, y: 75 },
  { id: 'portal_kitchen', name: 'Mutfak Geçidi', room: 'Kitchen', x: 1125, y: 75 },
  { id: 'portal_playroom', name: 'Oyun Odası Geçidi', room: 'Playroom', x: 75, y: 725 },
  { id: 'portal_garden', name: 'Bahçe Geçidi', room: 'Garden', x: 1125, y: 725 },
  { id: 'portal_entrance', name: 'Giriş Holü Geçidi', room: 'Entrance Hall', x: 600, y: 500 },
];

const FURNITURE = [
  // Library Spot Furniture
  { id: 'lib_shelf_1', name: 'Kitaplık 1', x: 80, y: 50, w: 100, h: 32, emoji: '📚', color: '#1e1b4b', label: 'Eski Romanlar' },
  { id: 'lib_shelf_2', name: 'Kitaplık 2', x: 260, y: 50, w: 100, h: 32, emoji: '📚', color: '#1a1835', label: 'Tarih Arşivi' },
  { id: 'lib_table', name: 'Okuma Masası', x: 160, y: 160, w: 120, h: 60, emoji: '📖🕯️', color: '#451a03', label: 'Deri Harita' },

  // Kitchen Spot Furniture
  { id: 'kit_counter_1', name: 'Tezgah 1', x: 790, y: 50, w: 120, h: 32, emoji: '🍳🍕', color: '#27272a', label: 'Fırın & Ocak' },
  { id: 'kit_counter_2', name: 'Tezgah 2', x: 990, y: 50, w: 120, h: 32, emoji: '🍵🍓', color: '#27272a', label: 'Meyve Hazırlık' },
  { id: 'kit_dining', name: 'Yemek Masası', x: 885, y: 160, w: 130, h: 60, emoji: '🍽️🧀🍷', color: '#78350f', label: 'Büyük Masa' },

  // Playroom Spot Furniture
  { id: 'play_table', name: 'Bilardo Masası', x: 130, y: 540, w: 130, h: 65, emoji: '🎱🟢🏓', color: '#064e3b', label: 'Oyun Masası' },
  { id: 'play_sofa', name: 'Kadife Koltuk', x: 70, y: 670, w: 90, h: 42, emoji: '🛋️', color: '#4c1d95', label: 'Sohbet Alanı' },
  { id: 'play_trophy', name: 'Kupa Dolabı', x: 290, y: 670, w: 60, h: 42, emoji: '🏆🤖', color: '#172554', label: 'Ödüller' },

  // Garden Sector Furniture
  { id: 'gard_fountain', name: 'Mermer Havuz', x: 910, y: 640, w: 80, h: 80, emoji: '⛲💦🕊️', color: '#0f766e', label: 'Süslü Havuz' },
  { id: 'gard_table', name: 'Piknik Masası', x: 870, y: 530, w: 140, h: 60, emoji: '🌻🍉🥛', color: '#5f123b', label: 'Bahçe Masası' }
];

function checkCollision(x: number, y: number, radius = 14) {
  for (const wall of WALLS) {
    if (
      x + radius > wall.x &&
      x - radius < wall.x + wall.w &&
      y + radius > wall.y &&
      y - radius < wall.y + wall.h
    ) {
      return true;
    }
  }
  for (const f of FURNITURE) {
    if (
      x + radius > f.x &&
      x - radius < f.x + f.w &&
      y + radius > f.y &&
      y - radius < f.y + f.h
    ) {
      return true;
    }
  }
  return false;
}

interface GameBoardProps {
  state: GameState;
  localPlayerId: string;
  onMove: (x: number, y: number) => void;
  onPlaceTrap: (x: number, y: number) => void;
  onTripTrap: (trapId: string) => void;
  onTag: (targetPlayerId: string) => void;
  onGuessTagger: (targetPlayerId: string) => void;
  onStartMeeting: (reportedPlayerId: string | null) => void;
  onInteractTask: (task: Task) => void;
  onSabotageTask: (taskId: string) => void;
  onLeaveRoom: () => void;
}

export default function GameBoard({
  state,
  localPlayerId,
  onMove,
  onPlaceTrap,
  onTripTrap,
  onTag,
  onGuessTagger,
  onStartMeeting,
  onInteractTask,
  onSabotageTask,
  onLeaveRoom,
}: GameBoardProps) {
  const localPlayer = state.players[localPlayerId];
  
  // Track continuous local position for smooth client-side interpolation
  const [localX, setLocalX] = useState(600);
  const [localY, setLocalY] = useState(400);

  const [showGuessModal, setShowGuessModal] = useState(false);
  const [selectedGuessId, setSelectedGuessId] = useState<string | null>(null);
  
  // Collapsible Tasks List panel state
  const [isTasksPanelCollapsed, setIsTasksPanelCollapsed] = useState(false);

  // Responsive device orientation monitoring
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Touch analog circular controller states
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });
  const joystickVector = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      docEl.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleJoystickStart = (clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    updateJoystickOffset(clientX - centerX, clientY - centerY);
  };

  const handleJoystickMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    updateJoystickOffset(clientX - centerX, clientY - centerY);
  };

  const handleJoystickEnd = () => {
    setJoystickKnob({ x: 0, y: 0 });
    joystickVector.current = { x: 0, y: 0 };
  };

  const updateJoystickOffset = (offsetX: number, offsetY: number) => {
    const maxRadius = 45; // limit dragging radius
    const dist = Math.hypot(offsetX, offsetY);
    let targetX = offsetX;
    let targetY = offsetY;

    if (dist > maxRadius) {
      targetX = (offsetX / dist) * maxRadius;
      targetY = (offsetY / dist) * maxRadius;
    }

    setJoystickKnob({ x: targetX, y: targetY });
    
    // speed scale from -1 to 1 based on translation deflection
    joystickVector.current = {
      x: targetX / maxRadius,
      y: targetY / maxRadius,
    };
  };

  // Position reference to bypass React interval closures and avoid stale coordinates
  const localPosRef = useRef({ x: localX, y: localY });
  localPosRef.current = { x: localX, y: localY };

  // Track position relative to Central Golden Bell
  const [isNearBell, setIsNearBell] = useState(false);

  // States for interactive keys held down
  const keysPressed = useRef<Record<string, boolean>>({});

  // Trap freeze timer
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeTimer, setFreezeTimer] = useState(0);

  // Target task or tag-spot within range
  const [closestTask, setClosestTask] = useState<Task | null>(null);
  const [closestPlayerToTag, setClosestPlayerToTag] = useState<Player | null>(null);
  const [closestTagSpot, setClosestTagSpot] = useState<any | null>(null);

  // Portal and Role announcement states
  const portalCooldownRef = useRef<number>(0);
  const [teleportMessage, setTeleportMessage] = useState('');
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);

  // Sync initial local coordinates when game transition occurs or if session is restored
  useEffect(() => {
    if (localPlayer) {
      setLocalX(localPlayer.x);
      setLocalY(localPlayer.y);
    }
  }, [state.phase]); // Trigger whenever game state restarts or joins

  // Role announcement trigger on match start
  useEffect(() => {
    if (state.phase === 'PLAYING' && localPlayer) {
      setShowRoleOverlay(true);
      const timer = setTimeout(() => {
        setShowRoleOverlay(false);
      }, 7000); // Auto close after 7 seconds
      return () => clearTimeout(timer);
    } else {
      setShowRoleOverlay(false);
    }
  }, [state.phase, localPlayerId, !!localPlayer]);

  // Handle stepping on magic portals
  useEffect(() => {
    if (!localPlayer || localPlayer.isEliminated || state.phase !== 'PLAYING') return;
    if (localPlayer.role !== 'TAGGER' && localPlayer.role !== 'DETECTIVE') return;

    const now = Date.now();
    if (now < portalCooldownRef.current) return;

    // Check if player stands on any portal position (distance < 24 px)
    const steppedPortal = PORTALS.find(p => {
      const dx = localX - p.x;
      const dy = localY - p.y;
      return Math.sqrt(dx * dx + dy * dy) < 24;
    });

    if (steppedPortal) {
      const remainingPortals = PORTALS.filter(p => p.id !== steppedPortal.id);
      const randomPortal = remainingPortals[Math.floor(Math.random() * remainingPortals.length)];

      // Teleport local state coordinates immediately
      setLocalX(randomPortal.x);
      setLocalY(randomPortal.y);
      localPosRef.current = { x: randomPortal.x, y: randomPortal.y };

      // Sync position downstream to other networked clients instantly!
      onMove(randomPortal.x, randomPortal.y);

      // Set cooldown to prevent back-and-forth bounce loops
      portalCooldownRef.current = now + 4000;

      // Pulse a pretty alert notification message
      setTeleportMessage(`🌀 Gizemli geçidi kullandın! ${randomPortal.room} odasındasın!`);
      const timer = setTimeout(() => {
        setTeleportMessage('');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [localX, localY, localPlayer, state.phase]);

  // Listen to keyboard press events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysPressed.current[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysPressed.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main high-frequency motion loop (40 FPS, local calculations)
  useEffect(() => {
    if (!localPlayer || isFrozen || state.phase !== 'PLAYING') return;

    const interval = setInterval(() => {
      let speed = localPlayer.isEliminated ? 6 : 4.5; // ghosts get a speed boost to float quickly!
      let dx = 0;
      let dy = 0;

      // Listen for keyboard controls
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= speed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += speed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += speed;

      // Combine with touch analog joystick input
      if (joystickVector.current.x !== 0 || joystickVector.current.y !== 0) {
        dx += joystickVector.current.x * speed;
        dy += joystickVector.current.y * speed;
      }

      if (dx !== 0 || dy !== 0) {
        if (localPlayer.isEliminated) {
          // Spectral ghosts ignore walls completely!
          setLocalX(prevX => {
            let targetX = prevX + dx;
            if (targetX < 30) targetX = 30;
            if (targetX > 1170) targetX = 1170;
            return targetX;
          });

          setLocalY(prevY => {
            let targetY = prevY + dy;
            if (targetY < 30) targetY = 30;
            if (targetY > 770) targetY = 770;
            return targetY;
          });
        } else {
          // Slide Collision: Check X path first, then Y path independently
          setLocalX(prevX => {
            let targetX = prevX + dx;
            if (targetX < 30) targetX = 30;
            if (targetX > 1170) targetX = 1170;
            
            if (checkCollision(targetX, localPosRef.current.y)) {
              return prevX; // Don't move on X
            }
            return targetX;
          });

          setLocalY(prevY => {
            let targetY = prevY + dy;
            if (targetY < 30) targetY = 30;
            if (targetY > 770) targetY = 770;
            
            if (checkCollision(localPosRef.current.x, targetY)) {
              return prevY; // Don't move on Y
            }
            return targetY;
          });
        }
      }
    }, 25); // 40 Hz loop for smooth analog movement feeling

    return () => clearInterval(interval);
  }, [localPlayer, isFrozen, state.phase]);

  // Handle touch buttons / joystick movement for mobile devices
  const moveDirectly = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (!localPlayer || isFrozen || state.phase !== 'PLAYING') return;
    const speed = localPlayer.isEliminated ? 30 : 20;

    let dx = 0;
    let dy = 0;
    if (dir === 'UP') dy = -speed;
    if (dir === 'DOWN') dy = speed;
    if (dir === 'LEFT') dx = -speed;
    if (dir === 'RIGHT') dx = speed;

    if (localPlayer.isEliminated) {
      setLocalX(prevX => {
        let nextX = prevX + dx;
        if (nextX < 30) nextX = 30;
        if (nextX > 1170) nextX = 1170;
        return nextX;
      });

      setLocalY(prevY => {
        let nextY = prevY + dy;
        if (nextY < 30) nextY = 30;
        if (nextY > 770) nextY = 770;
        return nextY;
      });
    } else {
      setLocalX(prevX => {
        let nextX = prevX + dx;
        if (nextX < 30) nextX = 30;
        if (nextX > 1170) nextX = 1170;
        if (checkCollision(nextX, localPosRef.current.y)) return prevX;
        return nextX;
      });

      setLocalY(prevY => {
        let nextY = prevY + dy;
        if (nextY < 30) nextY = 30;
        if (nextY > 770) nextY = 770;
        if (checkCollision(localPosRef.current.x, nextY)) return prevY;
        return nextY;
      });
    }
  };

  // Sync positions to server at 16Hz (every 60ms) to conserve network traffic and avoid visual lag
  const lastSentPos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!localPlayer || state.phase !== 'PLAYING') return;

    const syncInterval = setInterval(() => {
      const hasMovedDiff = Math.abs(localX - lastSentPos.current.x) > 1 || Math.abs(localY - lastSentPos.current.y) > 1;
      if (hasMovedDiff) {
        onMove(Math.round(localX), Math.round(localY));
        lastSentPos.current = { x: localX, y: localY };
      }
    }, 60);

    return () => clearInterval(syncInterval);
  }, [localX, localY, localPlayer, state.phase]);

  // Spatial range-checks helper (Tasks, Traps, Tags, tag spots, emergency golden bell)
  useEffect(() => {
    if (!localPlayer || state.phase !== 'PLAYING') return;

    // 1. Calculate closest interactable Task (Detectives solve incomplete tasks, Taggers sabotage tasks with progress)
    let bestTask: Task | null = null;
    let minTaskDist = 85; // Max interact reach is 85px
    const isTagger = localPlayer.role === 'TAGGER';

    for (const task of state.tasks) {
      const matchCondition = isTagger ? (task.progress > 0) : (task.progress < 100);
      if (matchCondition) {
        const dx = localX - task.x;
        const dy = localY - task.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minTaskDist) {
          bestTask = task;
          minTaskDist = dist;
        }
      }
    }
    setClosestTask(bestTask);

    // 2. Detective tripping confetti trap check (Detective only)
    if (localPlayer.role === 'DETECTIVE' && !localPlayer.isEliminated) {
      for (const trap of state.traps) {
        const dx = localX - trap.x;
        const dy = localY - trap.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 42) {
          // Trip this sparkly trap!
          onTripTrap(trap.id);
          setIsFrozen(true);
          setFreezeTimer(4.5); // Freeze for 4.5 seconds
          break;
        }
      }
    }

    // 3. Tagger taggable player check
    let tagTarget: Player | null = null;
    if (localPlayer.role === 'TAGGER' && !localPlayer.isEliminated) {
      let minTagDist = 85;
      for (const player of Object.values(state.players)) {
        if (player.id !== localPlayerId && player.role !== 'TAGGER' && !player.isEliminated && player.isConnected) {
          const dx = localX - player.x;
          const dy = localY - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minTagDist) {
            tagTarget = player;
            minTagDist = dist;
          }
        }
      }
    }
    setClosestPlayerToTag(tagTarget);

    // 4. Checking closest Tag Spot (dead player remains) on the floor to Report!
    let reportTarget: any = null;
    let minReportDist = 90;
    if (state.tagSpots) {
      for (const tSpot of state.tagSpots) {
        const dx = localX - tSpot.x;
        const dy = localY - tSpot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minReportDist) {
          reportTarget = tSpot;
          minReportDist = dist;
        }
      }
    }
    setClosestTagSpot(reportTarget);

    // 5. Check closeness to the Central Golden Emergency Bell
    const bellDx = localX - 600;
    const bellDy = localY - 390;
    const distToBell = Math.sqrt(bellDx * bellDx + bellDy * bellDy);
    setIsNearBell(distToBell < 75);

  }, [localX, localY, state.tasks, state.traps, state.players, localPlayer, localPlayerId, state.tagSpots]);

  // Handle freeze countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFrozen && freezeTimer > 0) {
      timer = setInterval(() => {
        setFreezeTimer(prev => {
          if (prev <= 0.25) {
            setIsFrozen(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 0.25;
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isFrozen, freezeTimer]);

  // Helper to place trap at local coordinates
  const handlePlaceConfettiTrap = () => {
    if (localPlayer && localPlayer.role === 'TAGGER') {
      onPlaceTrap(Math.round(localX), Math.round(localY));
    }
  };

  return (
    <div id="game_canvas_container" className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900 select-none">
      
      {/* Detective Guess Tagger Overlay/Modal */}
      {showGuessModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 text-center shadow-2xl shadow-indigo-500/30 overflow-hidden">
            
            {/* Ambient Background Accents */}
            <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-violet-500/10 blur-xl" />

            <h2 className="text-2xl font-black text-white tracking-tight mb-1 flex items-center justify-center gap-1.5">
              <span>🔮</span> EBE TAHMİNİ YAP <span>🧐</span>
            </h2>
            <p className="text-slate-400 text-[10px] tracking-widest uppercase font-mono mb-4 text-indigo-300 font-bold">
              DEDEKTİF ÖZEL YETENEĞİ
            </p>

            <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-2xl text-[11px] sm:text-xs text-slate-200 leading-normal mb-5 text-left">
              💡 <strong className="text-amber-400">OYUNUN KADERİNİ BELİRLE:</strong>
              <br />• Eğer ebeyi <strong className="text-emerald-400 font-bold">doğru tahmin edersen</strong>, ekip oyunu anında kazanır!
              <br />• Eğer <strong className="text-red-400 font-bold font-mono">yanlış tahmin edersen</strong>, hem sen hem de seçtiğin kişi elenerek hayalet olursunuz!
            </div>

            <div className="text-slate-300 text-xs font-bold mb-2 text-left uppercase tracking-wider pl-1">
              KONAĞIN ŞÜPHELİLERİ:
            </div>

            {/* List of other living players */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 mb-6">
              {Object.values(state.players)
                .filter(p => p.id !== localPlayerId && !p.isEliminated)
                .map((p) => {
                  const isSelected = selectedGuessId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedGuessId(p.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition active:scale-98 text-left cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-900/50 border-indigo-400 shadow shadow-indigo-500/20' 
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-sm font-bold shadow-inner"
                          style={{ backgroundColor: p.color }}
                        >
                          👤
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-100">{p.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {p.isBot ? '🤖 Yapay Zeka' : '👤 Gerçek Oyuncu'}
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700 bg-transparent'
                      }`}>
                        {isSelected && <span className="text-[9px] text-white font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}

              {Object.values(state.players).filter(p => p.id !== localPlayerId && !p.isEliminated).length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs font-bold">
                  Senden başka kimse kalmadı! Huh? 😳
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGuessModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs tracking-wide transition active:scale-95 cursor-pointer font-sans"
              >
                Vazgeç
              </button>
              <button
                disabled={!selectedGuessId}
                onClick={() => {
                  if (selectedGuessId) {
                    onGuessTagger(selectedGuessId);
                    setShowGuessModal(false);
                  }
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs tracking-wider transition active:scale-95 cursor-pointer shadow font-sans ${
                  selectedGuessId
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-700/25'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                }`}
              >
                GÜNAHSIZ OLMADIĞINA EMİNİM! 🔥
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Secret Role Announcement Overlay */}
      {showRoleOverlay && localPlayer && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center shadow-2xl shadow-indigo-500/20 overflow-hidden transform scale-100 transition-all">
            
            {/* Glowing background circle */}
            <div className={`absolute -top-16 -left-16 w-32 h-32 rounded-full opacity-20 blur-xl ${
              localPlayer.role === 'TAGGER' ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
            <div className={`absolute -bottom-16 -right-16 w-32 h-32 rounded-full opacity-20 blur-xl ${
              localPlayer.role === 'TAGGER' ? 'bg-red-500' : 'bg-emerald-500'
            }`} />

            {/* Title */}
            <p className="text-xs uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Yeni Oyun Başladı</p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-6">GÖREVİN BELİRLENDİ!</h2>
            
            {/* Role Icon and Name */}
            <div className={`mx-auto w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-4 border-2 shadow-lg animate-bounce ${
              localPlayer.role === 'TAGGER' 
                ? 'bg-red-950/80 border-red-500 shadow-red-500/25' 
                : localPlayer.role === 'DETECTIVE'
                ? 'bg-indigo-950/80 border-indigo-500 shadow-indigo-500/25'
                : 'bg-amber-950/80 border-amber-500 shadow-amber-500/25'
            }`}>
              {localPlayer.role === 'TAGGER' ? '🐱😈' : localPlayer.role === 'DETECTIVE' ? '🐼🕵️‍♂️' : '🦊🏡'}
            </div>

            <div className={`inline-block px-4 py-1.5 rounded-full font-black tracking-wider text-sm uppercase mb-4 shadow border ${
              localPlayer.role === 'TAGGER'
                ? 'bg-red-500 text-white border-red-400'
                : localPlayer.role === 'DETECTIVE'
                ? 'bg-indigo-500 text-white border-indigo-400'
                : 'bg-amber-500 text-slate-950 border-amber-400'
            }`}>
              {localPlayer.role === 'TAGGER' ? 'EBE (TAGGER)' : localPlayer.role === 'DETECTIVE' ? 'DEDEKTİF (DETECTIVE)' : 'MASUM EKİP ÜYESİ'}
            </div>

            {/* Description instructions custom to children context */}
            <div className="my-4 px-2">
              {localPlayer.role === 'TAGGER' ? (
                <div className="text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2">
                  <p className="font-bold text-red-300">🤫 Ebe sensin! Sırrını sakla!</p>
                  <p>Mansion'daki herkesi yakalamak için gizlice yanlarına yaklaş ve <strong className="text-red-400">SOBELE</strong>!</p>
                  <p>Görevleri <strong className="text-red-400 font-bold">sabote edebilir</strong> veya bastıkları yeri donduran <strong className="text-violet-400 font-bold">Konfeti Tuzakları</strong> bırakabilirsin!</p>
                </div>
              ) : localPlayer.role === 'DETECTIVE' ? (
                <div className="text-slate-200 text-xs sm:text-sm leading-relaxed space-y-1.5 text-center">
                  <p className="font-bold text-indigo-300">🕵️‍♂️ Dedektif sensin! Gözlerini aç!</p>
                  <p>Mansion'daki <strong className="text-indigo-300">10 Görevi</strong> bitirmeye çalışırken bir yandan da ebeyi bul!</p>
                  <p className="border border-indigo-500/30 bg-indigo-950/40 p-2 rounded-xl text-indigo-200 text-[10px] text-left leading-normal">
                    💡 <strong className="text-amber-300">EBE TAHMİN HAKKI:</strong> Ebe tahmin tuşu ile şüphelendiğin birini seç!
                    <br />• Doğru: <strong className="text-emerald-400">Ekip Kazanır!</strong>
                    <br />• Yanlış: <strong className="text-red-400">Sen ve o kişi elenirsiniz!</strong>
                  </p>
                </div>
              ) : (
                <div className="text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2">
                  <p className="font-bold text-amber-300">🦊 Masum Ekip Üyesisin! Ebe aramıza sızdı!</p>
                  <p>Mansion'daki <strong className="text-amber-400">10 Görevi</strong> hemen tamamlayarak ebeyi alt edin!</p>
                  <p>Şüpheli hareketler görürsen <strong className="text-amber-400">Merkez Zili</strong>'ni çal veya <strong className="text-red-400 font-bold">Rapor Et</strong>, Dedektif arkadaşına yardım et!</p>
                </div>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setShowRoleOverlay(false)}
              className={`w-full py-3.5 mt-6 rounded-2xl font-black text-sm tracking-wide active:scale-95 transition cursor-pointer shadow-lg ${
                localPlayer.role === 'TAGGER'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-700/25'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-700/25'
              }`}
            >
              Kabul Et ve Başla! ✨
            </button>
          </div>
        </div>
      )}

      {/* Top HUD Stats Panel */}
      <div id="mansion_overlay_hud" className="w-full max-w-5xl bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-3 flex flex-col md:flex-row justify-between items-center gap-4 z-10 backdrop-blur-sm">
        
        {/* Left Side: Role Badge & Connection indicator */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold font-mono border shadow"
            style={{ backgroundColor: localPlayer?.color || '#94A3B8' }}
          >
            {localPlayer?.role === 'TAGGER' ? '🐱' : '🐼'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base truncate max-w-[120px]">
                {localPlayer?.name || 'Spectator'}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                localPlayer?.role === 'TAGGER' 
                  ? 'bg-red-950/80 text-red-400 border border-red-900/40' 
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40'
              }`}>
                {localPlayer?.role || 'Guest'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">
              Score: <span className="text-amber-400 font-mono">{localPlayer?.score || 0}</span> | Status: {localPlayer?.isEliminated ? '👻 Ghost' : '✨ Active'}
            </div>
          </div>
        </div>

        {/* Center: Overall task progress slider */}
        <div className="flex-1 w-full max-w-md px-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">
            <span className="flex items-center gap-1"><Sparkles size={12} className="text-emerald-400" /> Overall Mansion Tasks</span>
            <span className="text-emerald-300 font-mono">{state.taskProgress}% Completed</span>
          </div>
          <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow shadow-emerald-500/50" 
              style={{ width: `${state.taskProgress}%` }}
            />
          </div>
        </div>

        {/* Right Side: Match level timer */}
        <div className="flex items-center gap-3 min-w-[130px] justify-end">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest leading-none">Mansion Timer</span>
            <span className="text-xl font-mono font-black text-amber-400 tracking-wide">
              {Math.floor(state.timer / 60)}:{(state.timer % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button 
            id="door_bell_call_btn"
            onClick={() => onStartMeeting(null)}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow shadow-purple-600/30 font-semibold cursor-pointer active:scale-95 transition flex items-center justify-center"
            title="Ring Golden Bell to start discussion"
          >
            <Bell size={18} />
          </button>
        </div>

      </div>

      {/* Upper Control Strip */}
      <div id="mansion_game_header" className="w-full max-w-5xl flex justify-between items-center gap-2 mb-2 z-10 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-3.5 py-2 bg-slate-800/85 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow leading-none"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Pencereli' : 'Tam Ekran'}
          </button>
          
          {isPortrait && (
            <span className="hidden sm:inline bg-purple-900/30 border border-purple-500/25 text-purple-300 text-[10px] font-black uppercase px-2 py-1 rounded-lg animate-pulse">
              📱 Telefonda en rahat oyun için ekranı yan çevirin!
            </span>
          )}
        </div>
        
        <button
          type="button"
          onClick={onLeaveRoom}
          className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900/95 text-red-200 border border-red-500/35 rounded-xl text-xs font-black transition active:scale-95 flex items-center gap-1 cursor-pointer shadow leading-none"
        >
          🚪 Odadan Çık
        </button>
      </div>

      {/* Main scrolling Camera Viewport Frame */}
      <div id="mansion_viewport" className="w-[100%] max-w-5xl h-[56vh] border-4 border-slate-800 bg-slate-950 rounded-3xl relative overflow-hidden shadow-inner">
        
        {/* Floating Tasks Tracker Panel (Left side) */}
        <div className={`absolute left-4 top-4 z-40 max-w-[210px] w-[50%] xs:w-auto bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-lg shadow-black/80 backdrop-blur-md select-none pointer-events-auto transition-all duration-300 ${
          isTasksPanelCollapsed ? 'max-h-[44px] overflow-hidden' : 'max-h-[50%] overflow-y-auto'
        }`}>
          <div 
            className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 cursor-pointer select-none"
            onClick={() => setIsTasksPanelCollapsed(!isTasksPanelCollapsed)}
          >
            <div className="flex items-center gap-1">
              <span>📋</span> GÖREVLERİMİZ ({state.tasks.filter(t => t.progress >= 100).length}/10)
            </div>
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                setIsTasksPanelCollapsed(!isTasksPanelCollapsed);
              }}
              className="p-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {isTasksPanelCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          
          {!isTasksPanelCollapsed && (
            <div className="space-y-2 mt-2">
              {state.tasks.map((task) => {
                const isCompleted = task.progress >= 100;
                const isNearThisTask = closestTask?.id === task.id;
                return (
                  <div key={task.id} className="flex items-start gap-1.5 text-[11px] leading-tight text-slate-300">
                    <span className={`text-[12px] flex-shrink-0 select-none ${isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                      {isCompleted ? '✅' : '⬜'}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate font-semibold tracking-tight ${
                        isCompleted 
                          ? 'line-through text-slate-500' 
                          : isNearThisTask 
                          ? 'text-amber-300 font-bold animate-pulse' 
                          : 'text-slate-200'
                      }`}>
                        {task.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold font-mono">
                        📍 {task.room} {isCompleted ? '(Bitti)' : `(${task.progress}%)`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Teleport Notification Toast */}
        {teleportMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/95 border-2 border-indigo-400 text-indigo-300 px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-indigo-950/50 z-40 flex items-center gap-2 animate-bounce uppercase tracking-wide">
            <span className="text-sm">🌀</span>
            {teleportMessage}
          </div>
        )}

        {/* Sleek Touch Action Button Console (Right-bottom side of viewport) */}
        <div className="absolute right-6 bottom-6 z-30 flex flex-col gap-3.5 items-end select-none">
          {/* Action 5: Tagger - Place Confetti Sparkly Trap */}
          {localPlayer?.role === 'TAGGER' && !localPlayer.isEliminated && (
            <button
              id="place_trap_action_btn"
              type="button"
              onClick={handlePlaceConfettiTrap}
              className="w-13 h-13 bg-indigo-650 hover:bg-indigo-500 text-indigo-100 rounded-full flex items-center justify-center font-bold shadow-lg shadow-indigo-600/35 cursor-pointer active:scale-90 transition border-2 border-indigo-400"
              title="Sparkle Trap"
            >
              <Zap size={20} />
            </button>
          )}

          {/* Action 1: Solve Task (Detective) or Sabotage Task (Tagger) */}
          {closestTask && (
            localPlayer?.role === 'TAGGER' && !localPlayer.isEliminated ? (
              <button
                id="sabotage_task_action_btn"
                type="button"
                onClick={() => onSabotageTask(closestTask.id)}
                className="w-20 h-20 bg-red-650 hover:bg-red-500 border-2 border-red-400 text-white rounded-full shadow-lg shadow-red-650/40 flex flex-col items-center justify-center font-black text-[10px] active:scale-90 transition cursor-pointer gap-0.5 animate-pulse"
              >
                <AlertOctagon size={20} />
                <span>SABOTAJ</span>
              </button>
            ) : (
              // Active Solve Action Circle
              !localPlayer?.isEliminated && (
                <button
                  id="solve_task_action_btn"
                  type="button"
                  onClick={() => onInteractTask(closestTask)}
                  className="w-20 h-20 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-full shadow-lg shadow-amber-400/40 flex flex-col items-center justify-center font-black text-[10px] active:scale-90 transition cursor-pointer gap-0.5 animate-bounce"
                >
                  <Hand size={20} className="stroke-[2.5]" />
                  <span>KULLAN</span>
                </button>
              )
            )
          )}

          {/* Action 2: Ring Center Golden Bell to guess Tagger */}
          {isNearBell && !localPlayer?.isEliminated && (
            <button
              id="ring_center_bell_btn"
              type="button"
              onClick={() => onStartMeeting(null)}
              className="w-20 h-20 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-full shadow-lg shadow-amber-500/40 cursor-pointer active:scale-90 transition flex flex-col items-center justify-center text-[10px] gap-0.5 animate-bounce border-2 border-yellow-200"
            >
              <Bell size={20} className="animate-pulse" />
              <span>ZİLİ ÇAL</span>
            </button>
          )}

          {/* Action 3: Report Tag Spot (Dead Body) */}
          {closestTagSpot && !localPlayer?.isEliminated && (
            <button
              id="report_tag_action_btn"
              type="button"
              onClick={() => onStartMeeting(closestTagSpot.id)}
              className="w-20 h-20 bg-red-650 hover:bg-red-500 border-2 border-red-450 text-white rounded-full font-bold shadow-lg shadow-red-600/40 cursor-pointer active:scale-90 transition flex flex-col items-center justify-center text-[9px] gap-0.5 animate-pulse"
            >
              <AlertCircle size={20} />
              <span>RAPOR ET</span>
            </button>
          )}

          {/* Action 4: Tagger - Tag Kid Detective */}
          {localPlayer?.role === 'TAGGER' && !localPlayer.isEliminated && closestPlayerToTag && (
            <button
              id="tag_player_action_btn"
              type="button"
              onClick={() => onTag(closestPlayerToTag.id)}
              className="w-20 h-20 bg-red-700 hover:bg-red-600 border-2 border-red-450 text-white rounded-full font-black shadow-lg shadow-red-700/40 cursor-pointer active:scale-90 transition flex flex-col items-center justify-center text-[10px] font-mono uppercase"
            >
              <Hand size={20} />
              <span>SOBELE</span>
            </button>
          )}

          {/* Action: Detective - Guess Tagger (Ebe Tahmini) */}
          {localPlayer?.role === 'DETECTIVE' && !localPlayer.isEliminated && (
            <button
              id="detective_guess_tagger_btn"
              type="button"
              onClick={() => {
                setSelectedGuessId(null);
                setShowGuessModal(true);
              }}
              className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-2 border-indigo-300 text-white rounded-full font-black shadow-lg shadow-indigo-650/50 cursor-pointer active:scale-90 transition flex flex-col items-center justify-center text-[10px] gap-0.5 animate-pulse"
              title="Ebeyi Tahmin Et!"
            >
              <span className="text-xl">🔮🧐</span>
              <span>EBE TAHMİN</span>
            </button>
          )}
        </div>

        {/* Sleek Floating Circular D-Pad Joystick (Left-bottom side of viewport) */}
        <div 
          className="absolute left-6 bottom-6 w-24 h-24 rounded-full bg-slate-950/80 border-2 border-slate-700 flex items-center justify-center z-30 select-none touch-none active:border-amber-400"
          onTouchStart={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleJoystickStart(e.touches[0].clientX, e.touches[0].clientY, rect);
          }}
          onTouchMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY, rect);
          }}
          onTouchEnd={handleJoystickEnd}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleJoystickStart(e.clientX, e.clientY, rect);
            
            const mouseMove = (me: MouseEvent) => {
              handleJoystickMove(me.clientX, me.clientY, rect);
            };
            const mouseUp = () => {
              handleJoystickEnd();
              window.removeEventListener('mousemove', mouseMove);
              window.removeEventListener('mouseup', mouseUp);
            };
            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
          }}
        >
          {/* Circular directional arrows guide inside */}
          <div className="absolute w-full h-full text-slate-500 text-[10px] font-bold pointer-events-none">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 font-mono">▲</div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono">▼</div>
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono">◀</div>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono">▶</div>
          </div>
          
          {/* Inner Dragging Knob */}
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md shadow-amber-400/20 active:from-yellow-500 active:to-amber-500 border border-amber-305 flex items-center justify-center transition-transform duration-75 duration-ease-out animate-pulse"
            style={{ 
              transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
            }}
          >
            {/* Center dot inside knob */}
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950/30 border border-white/20" />
          </div>
        </div>

        {/* Animated freeze screen overlay */}
        {isFrozen && (
          <div className="absolute inset-0 bg-sky-950/40 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-4">
            <span className="text-5xl animate-bounce">🥶 ❄️</span>
            <h2 className="text-2xl font-black text-sky-300 mt-2 tracking-wide uppercase">TRAPPED IN CONFETTI!</h2>
            <p className="text-slate-300 text-xs mt-1">Wait for sparkle to dissolve: {Math.ceil(freezeTimer)}s...</p>
          </div>
        )}

        {/* Mansion Game Map Content - Camera translates to center on local player */}
        <div 
          id="mansion_floor_board"
          className="absolute origin-center transition-transform duration-75 ease-out"
          style={{
            width: '1200px',
            height: '800px',
            background: 'radial-gradient(circle, #1E293B 10%, #0F172A 90%)',
            border: '8px solid rgb(30, 41, 59)',
            // Center camera around local coordinates
            left: `calc(50% - ${localX}px)`,
            top: `calc(50% - ${localY}px)`,
          }}
        >
          {/* Tile Grid helper background lines */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />

          {/* Styled Room Layout Squares */}
          {/* Room 1: Library (Top Left) */}
          <div className="absolute top-10 left-10 w-[400px] h-[300px] rounded-2xl border-4 border-dashed border-cyan-800/20 bg-cyan-950/10 p-4">
            <div className="text-xs font-bold font-mono tracking-widest text-cyan-400/40 uppercase">ZONE_01 // LIBRARY</div>
            <div className="text-4xl absolute bottom-4 right-4 opacity-15">📚 🖼️</div>
          </div>

          {/* Room 2: Kitchen (Top Right) */}
          <div className="absolute top-10 left-[750px] w-[400px] h-[300px] rounded-2xl border-4 border-dashed border-orange-850/20 bg-orange-950/10 p-4">
            <div className="text-xs font-bold font-mono tracking-widest text-orange-400/40 uppercase">ZONE_02 // KITCHEN</div>
            <div className="text-4xl absolute bottom-4 right-4 opacity-15">🍳 🍉</div>
          </div>

          {/* Room 3: Entrance Hall (Center) */}
          <div className="absolute top-[260px] left-[420px] w-[360px] h-[280px] rounded-3xl border-4 border-dashed border-purple-850/25 bg-purple-950/15 p-4 flex items-start justify-center">
            <div className="text-xs font-bold font-mono tracking-widest text-purple-400/40 uppercase text-center">ZONE_03 // ENTRANCE HALL</div>
          </div>

          {/* Room 4: Playroom (Bottom Left) */}
          <div className="absolute top-[450px] left-[10px] w-[400px] h-[300px] rounded-2xl border-4 border-dashed border-emerald-850/20 bg-emerald-950/10 p-4">
            <div className="text-xs font-bold font-mono tracking-widest text-emerald-400/40 uppercase">ZONE_04 // PLAYROOM</div>
            <div className="text-4xl absolute bottom-4 right-4 opacity-15">🎲 🪵</div>
          </div>

          {/* Room 5: Garden (Bottom Right) */}
          <div className="absolute top-[450px] left-[750px] w-[400px] h-[300px] rounded-2xl border-4 border-dashed border-lime-850/20 bg-lime-950/10 p-4">
            <div className="text-xs font-bold font-mono tracking-widest text-lime-400/40 uppercase">ZONE_05 // GARDEN SECTOR</div>
            <div className="text-4xl absolute bottom-4 right-4 opacity-15">🌸 🕊️</div>
          </div>

          {/* Physical Mansion Obstacle Walls */}
          {WALLS.map((wall, idx) => (
            <div 
              key={`wall_${idx}`}
              className="absolute bg-slate-800 border-2 border-slate-700/60 shadow-md rounded"
              style={{
                left: wall.x,
                top: wall.y,
                width: wall.w,
                height: wall.h,
                backgroundImage: 'repeating-linear-gradient(45deg, #1e293b, #1e293b 6px, #334155 6px, #334155 12px)'
              }}
            />
          ))}

          {/* Beautiful Physical Furniture & Decorations */}
          {FURNITURE.map((f) => (
            <div 
              key={f.id}
              className="absolute border-2 border-slate-700/85 shadow-lg rounded-xl flex flex-col items-center justify-center text-center p-1 font-sans cursor-default transition-all duration-300 hover:brightness-110 select-none z-10"
              style={{
                left: f.x,
                top: f.y,
                width: f.w,
                height: f.h,
                backgroundColor: f.color || '#334155',
              }}
              title={f.name}
            >
              <div className="text-sm select-none leading-none mb-0.5">{f.emoji}</div>
              <div className="text-[7px] xs:text-[7.5px] font-black uppercase text-slate-350 tracking-widest leading-none">
                {f.label}
              </div>
            </div>
          ))}

          {/* Door labels to guide path navigation */}
          <div className="absolute left-[422px] top-[152px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[180px] top-[322px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[745px] top-[152px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[940px] top-[322px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>

          <div className="absolute left-[422px] top-[572px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[180px] top-[462px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[745px] top-[572px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>
          <div className="absolute left-[940px] top-[462px] font-mono text-[8px] text-amber-400/80 bg-slate-950/95 border border-amber-500/15 px-1 rounded uppercase tracking-widest scale-75 whitespace-nowrap z-10">KAPI (DOOR)</div>

          {/* Central physical Golden Emergency Bell (Orta Zil) */}
          <div 
            id="mansion_center_bell"
            className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full bg-slate-950 border-4 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/25 z-15 group cursor-pointer hover:scale-105 active:scale-95 transition"
            style={{ left: 600, top: 390 }}
          >
            <div className="absolute inset-0 rounded-full border border-amber-300 animate-ping opacity-35" />
            <Bell size={24} className="text-amber-400 animate-pulse" />
            <div className="absolute top-11 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded uppercase border border-amber-300 shadow leading-none scale-90 whitespace-nowrap">
              MERKEZ ZİLİ
            </div>
          </div>

          {/* Mistik Geçitler (Secret Doors / Portals - only visible to active Taggers & Detectives) */}
          {!localPlayer?.isEliminated && (localPlayer?.role === 'TAGGER' || localPlayer?.role === 'DETECTIVE') && PORTALS.map((portal) => (
            <div 
              key={portal.id}
              className="absolute w-12 h-12 -ml-6 -mt-6 z-15 flex flex-col items-center justify-center animate-pulse"
              style={{ left: portal.x, top: portal.y }}
              title={portal.name}
            >
              <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400 animate-spin opacity-50" style={{ animationDuration: '8s' }} />
              <div className="absolute inset-1.5 rounded-full bg-violet-600/30 border border-violet-400 animate-ping opacity-25" />
              
              <div className="w-8 h-8 rounded-full bg-indigo-900/90 border border-indigo-300 flex items-center justify-center text-base shadow-lg shadow-indigo-500/35 relative">
                <span className="relative z-10">🌀</span>
                <span className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xs" />
              </div>

              {/* Little info label */}
              <div className="absolute -bottom-5.5 bg-indigo-950/90 border border-indigo-400/40 rounded px-1.5 py-0.5 text-[8px] text-indigo-300 font-mono font-black tracking-wide uppercase shadow whitespace-nowrap">
                {portal.name}
              </div>
            </div>
          ))}

          {/* Confetti Traps placed on the map */}
          {state.traps.map((trap) => {
            // Only tagger can see traps on screen, detectives can't see them!
            const canSee = localPlayer?.role === 'TAGGER';
            return (
              <div 
                key={trap.id}
                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center transition z-15 ${
                  canSee ? 'opacity-80 scale-100' : 'opacity-0 scale-50'
                }`}
                style={{ left: trap.x, top: trap.y }}
              >
                <span className="text-base animate-ping">🎉</span>
              </div>
            );
          })}

          {/* Target Interactive Chores/Tasks locations */}
          {state.tasks.map((task) => (
            <div 
              key={task.id}
              className="absolute w-12 h-12 -ml-6 -mt-6 z-15 flex flex-col items-center justify-center cursor-pointer"
              style={{ left: task.x, top: task.y }}
            >
              {/* Radius feedback ring */}
              <div className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-500 animate-spin ${
                task.progress >= 100 
                  ? 'border-emerald-500/30' 
                  : 'border-amber-400/60'
              }`} />
              
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition transform hover:scale-110 ${
                task.progress >= 100 
                  ? 'bg-emerald-600 border border-emerald-400 text-white' 
                  : 'bg-amber-400 text-slate-900 border border-amber-200 animate-pulse'
              }`}>
                {task.progress >= 100 ? '✅' : '⭐'}
              </div>

              {/* Little info badge */}
              <div className="absolute -bottom-6 bg-slate-950/90 border border-slate-700 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap font-semibold shadow">
                {task.name} ({task.progress}%)
              </div>
            </div>
          ))}

          {/* Tagged Spots on the floor (where dead detectives lay) */}
          {(state.tagSpots || []).map((spot) => (
            <div 
              key={`tag_spot_${spot.id}`}
              className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-red-950/25 border-2 border-red-500 border-dashed flex items-center justify-center z-12 animate-pulse"
              style={{ left: spot.x, top: spot.y }}
            >
              <span className="text-xl">🚨</span>
              <div 
                className="absolute -bottom-5 bg-slate-950 border rounded px-1.5 py-0.5 text-[8.5px] uppercase font-mono font-bold tracking-wide shadow"
                style={{ borderColor: spot.color, color: spot.color }}
              >
                {spot.playerName} İZİ
              </div>
            </div>
          ))}

          {/* Other connected Players on the map */}
          {Object.values(state.players).map((player) => {
            const isSelf = player.id === localPlayerId;
            let currentX = player.x;
            let currentY = player.y;

            // Interpolate local player immediately for instant local experience instead of waiting for server delta
            if (isSelf) {
              currentX = localX;
              currentY = localY;
            }

            // Spectators don't show on map
            if (player.id.startsWith('spectator')) return null;

            return (
              <div 
                key={player.id}
                id={`player_char_${player.id}`}
                className="absolute w-12 h-12 -ml-6 -mt-6 flex flex-col items-center justify-center transition-all duration-75 z-20"
                style={{ 
                  left: currentX, 
                  top: currentY,
                  opacity: player.isEliminated ? 0.6 : 1,
                }}
              >
                {/* Name Label */}
                <div className="absolute -top-6 bg-slate-950/80 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap font-bold flex items-center gap-1">
                  <span 
                    className="w-1.5 h-1.5 rounded-full inline-block" 
                    style={{ backgroundColor: player.color }} 
                  />
                  {player.isBot ? `🤖 ${player.name}` : player.name}
                  {!player.isBot && !player.isConnected && <span className="text-[8px] text-red-500 font-mono">(Zzz)</span>}
                </div>

                {/* Core avatar skin */}
                <div 
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md relative border-b-4 transition transform active:scale-95 ${
                    isSelf 
                      ? 'ring-4 ring-indigo-400 border-indigo-700 animate-pulse' 
                      : 'border-slate-800'
                  }`}
                  style={{ 
                    backgroundColor: player.color,
                    borderColor: 'rgb(15, 23, 42)'
                  }}
                >
                  {player.isEliminated ? '👻' : player.role === 'TAGGER' ? '🐱' : '🐼'}

                  {/* Character crown if owner */}
                  {state.players[Object.keys(state.players)[0]]?.id === player.id && (
                    <span className="absolute -top-3.5 right-0.5 text-xs">👑</span>
                  )}
                </div>

                {/* Disconnection status overlay */}
                {!player.isConnected && (
                  <div className="absolute text-[10px] bg-red-950 border border-red-500 text-red-400 px-1 py-0.2 rounded bottom-0 font-bold animate-pulse">
                    OFFLINE
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
