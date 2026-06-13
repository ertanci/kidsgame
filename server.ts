import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { RedisStateService } from './src/RedisStateService';
import { 
  GameState, 
  Player, 
  Task, 
  ConfettiTrap, 
  GamePhase, 
  MeetingState, 
  ChatMessage, 
  LeaderboardRecord 
} from './src/types';

// Initialize core Redis-like service
const redis = new RedisStateService();

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 5000,
    pingTimeout: 10000,
  });

  const PORT = 3000;

  // Pool of 25 distinct tasks suitable for children (distributed across the 5 mansion zones)
  const ALL_TASKS_POOL: Task[] = [
    { id: 'task_books_1', name: 'Sayı Sıralama Rafı', room: 'Library', x: 130, y: 150, progress: 0, type: 'books' },
    { id: 'task_dust_1', name: 'Tozlu Ansiklopediler', room: 'Library', x: 300, y: 240, progress: 0, type: 'books' },
    { id: 'task_books_2', name: 'Hafıza Kartı Sıralama', room: 'Library', x: 350, y: 110, progress: 0, type: 'books' },
    { id: 'task_dust_2', name: 'Gizemli Kitap Sayıları', room: 'Library', x: 140, y: 250, progress: 0, type: 'books' },
    { id: 'task_books_3', name: 'Eski Kitap Koruyucu', room: 'Library', x: 250, y: 80, progress: 0, type: 'books' },

    { id: 'task_salad_1', name: 'Meyve Salatası Yap', room: 'Kitchen', x: 800, y: 140, progress: 0, type: 'salad' },
    { id: 'task_wash_1', name: 'Cam Tabakları Yıka', room: 'Kitchen', x: 1040, y: 180, progress: 0, type: 'salad' },
    { id: 'task_salad_2', name: 'Sebze Sepeti Hazırla', room: 'Kitchen', x: 920, y: 110, progress: 0, type: 'salad' },
    { id: 'task_wash_2', name: 'Mutfak Tezgahını Sil', room: 'Kitchen', x: 850, y: 250, progress: 0, type: 'salad' },
    { id: 'task_salad_3', name: 'Gümüş Çatal Bıçaklar', room: 'Kitchen', x: 1080, y: 260, progress: 0, type: 'salad' },

    { id: 'task_clock_1', name: 'Büyük Saati Kur', room: 'Entrance Hall', x: 480, y: 360, progress: 0, type: 'clock' },
    { id: 'task_polish_1', name: 'Giriş Zilini Parlat', room: 'Entrance Hall', x: 700, y: 460, progress: 0, type: 'clock' },
    { id: 'task_clock_2', name: 'Konağın Giriş Saati', room: 'Entrance Hall', x: 580, y: 420, progress: 0, type: 'clock' },
    { id: 'task_polish_2', name: 'Lobi Paspası Yap', room: 'Entrance Hall', x: 670, y: 350, progress: 0, type: 'clock' },
    { id: 'task_clock_3', name: 'Eski Tabloları Hizala', room: 'Entrance Hall', x: 460, y: 440, progress: 0, type: 'clock' },

    { id: 'task_flowers_1', name: 'Kırmızı Gülleri Sula', room: 'Garden', x: 800, y: 680, progress: 0, type: 'flowers' },
    { id: 'task_rake_1', name: 'Dökülen Yaprakları Topla', room: 'Garden', x: 1050, y: 640, progress: 0, type: 'flowers' },
    { id: 'task_flowers_2', name: 'Çiçek Saksılarını Taşı', room: 'Garden', x: 920, y: 550, progress: 0, type: 'flowers' },
    { id: 'task_rake_2', name: 'Bahçe Çimlerini Düzenle', room: 'Garden', x: 830, y: 720, progress: 0, type: 'flowers' },
    { id: 'task_flowers_3', name: 'Zararlı Otları Yol', room: 'Garden', x: 1020, y: 745, progress: 0, type: 'flowers' },

    { id: 'task_toys_1', name: 'Oyuncakları Düzenle', room: 'Playroom', x: 150, y: 650, progress: 0, type: 'toybox' },
    { id: 'task_blocks_1', name: 'Renkli Blokları Diz', room: 'Playroom', x: 320, y: 690, progress: 0, type: 'toybox' },
    { id: 'task_toys_2', name: 'Lego Setini Tamamla', room: 'Playroom', x: 220, y: 540, progress: 0, type: 'toybox' },
    { id: 'task_blocks_2', name: 'Yapboz Parçalarını Eşle', room: 'Playroom', x: 120, y: 720, progress: 0, type: 'toybox' },
    { id: 'task_toys_3', name: 'Oyun Masasını Topla', room: 'Playroom', x: 300, y: 740, progress: 0, type: 'toybox' },
  ];

  function get10RandomTasks(): Task[] {
    const shuffled = [...ALL_TASKS_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(t => ({ ...t }));
  }

  // Hard wall collision geometries
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

  function getZone(x: number, y: number): 'LIBRARY' | 'KITCHEN' | 'PLAYROOM' | 'GARDEN' | 'HALLWAY' {
    if (x < 430 && y < 330) return 'LIBRARY';
    if (x > 770 && y < 330) return 'KITCHEN';
    if (x < 430 && y > 470) return 'PLAYROOM';
    if (x > 770 && y > 470) return 'GARDEN';
    return 'HALLWAY';
  }

  function getNextWaypoint(startX: number, startY: number, targetX: number, targetY: number) {
    const startZone = getZone(startX, startY);
    const targetZone = getZone(targetX, targetY);

    if (startZone === targetZone) {
      return { x: targetX, y: targetY };
    }

    // exit-door waypoints for each room
    if (startZone === 'LIBRARY') {
      const d1 = { x: 450, y: 180 };
      const d2 = { x: 210, y: 350 };
      const dist1 = Math.hypot(startX - d1.x, startY - d1.y);
      const dist2 = Math.hypot(startX - d2.x, startY - d2.y);
      return dist1 < dist2 ? d1 : d2;
    }
    if (startZone === 'KITCHEN') {
      const d1 = { x: 740, y: 180 };
      const d2 = { x: 970, y: 350 };
      const dist1 = Math.hypot(startX - d1.x, startY - d1.y);
      const dist2 = Math.hypot(startX - d2.x, startY - d2.y);
      return dist1 < dist2 ? d1 : d2;
    }
    if (startZone === 'PLAYROOM') {
      const d1 = { x: 450, y: 600 };
      const d2 = { x: 210, y: 440 };
      const dist1 = Math.hypot(startX - d1.x, startY - d1.y);
      const dist2 = Math.hypot(startX - d2.x, startY - d2.y);
      return dist1 < dist2 ? d1 : d2;
    }
    if (startZone === 'GARDEN') {
      const d1 = { x: 740, y: 600 };
      const d2 = { x: 970, y: 440 };
      const dist1 = Math.hypot(startX - d1.x, startY - d1.y);
      const dist2 = Math.hypot(startX - d2.x, startY - d2.y);
      return dist1 < dist2 ? d1 : d2;
    }

    // entering-door waypoints if bot is in hallway/corridors
    if (targetZone === 'LIBRARY') {
      return Math.hypot(startX - 450, startY - 180) < Math.hypot(startX - 210, startY - 350) 
        ? { x: 450, y: 180 } 
        : { x: 210, y: 350 };
    }
    if (targetZone === 'KITCHEN') {
      return Math.hypot(startX - 740, startY - 180) < Math.hypot(startX - 970, startY - 350) 
        ? { x: 740, y: 180 } 
        : { x: 970, y: 350 };
    }
    if (targetZone === 'PLAYROOM') {
      return Math.hypot(startX - 450, startY - 600) < Math.hypot(startX - 210, startY - 440) 
        ? { x: 450, y: 600 } 
        : { x: 210, y: 440 };
    }
    if (targetZone === 'GARDEN') {
      return Math.hypot(startX - 740, startY - 600) < Math.hypot(startX - 970, startY - 440) 
        ? { x: 740, y: 600 } 
        : { x: 970, y: 440 };
    }

    return { x: targetX, y: targetY };
  }

  const CHAR_COLORS = ['#FF4D4D', '#4DA6FF', '#4DFF4D', '#E1FF4D', '#FF4DFF', '#FFA64D'];
  const BOT_NAMES = ['Kurnaz Tilki', 'Minik Tavşan', 'Uykucu Ayı', 'Bilge Baykuş', 'Şakacı Sincap', 'Meraklı Kedi', 'Hızlı Kirpi', 'Zeki Köpek', 'Sevimli Koala', 'Mutlu Fil'];

  // REST API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', playersOnline: io.engine.clientsCount });
  });

  // Multiple rooms stored in memory and synced through RedisStateService
  const rooms: Record<string, GameState> = {};

  function getRoomState(roomCode: string): GameState | null {
    const code = roomCode.toUpperCase();
    if (rooms[code]) return rooms[code];
    const saved = redis.get<GameState>('room_' + code);
    if (saved) {
      rooms[code] = saved;
      return saved;
    }
    return null;
  }

  function saveRoomState(roomCode: string, state: GameState) {
    const code = roomCode.toUpperCase();
    rooms[code] = state;
    redis.set('room_' + code, state);
  }

  // Keep a map of socket.id -> roomCode for quick traceback
  const socketToRoom = new Map<string, string>();
  // Keep a map of socket.id -> sessionToken
  const socketToSession = new Map<string, string>();

  // Periodically ticks down match time or handles meetings in rooms
  let matchInterval: NodeJS.Timeout | null = null;

  function initMatchTick() {
    if (matchInterval) clearInterval(matchInterval);
    matchInterval = setInterval(() => {
      // Loop over all active memory rooms
      for (const [roomCode, state] of Object.entries(rooms)) {
        let stateChanged = false;

        // Initialize cooldown fields if undefined (robustness)
        if (state.tagCooldown === undefined) {
          state.tagCooldown = 0;
        }
        if (state.bellCooldown === undefined) {
          state.bellCooldown = 0;
        }

        // Handle main playing phase countdown
        if (state.phase === 'PLAYING') {
          if (state.timer > 0) {
            state.timer--;
            stateChanged = true;
            
            if (state.timer <= 0) {
              endRoomGame(roomCode, 'TAGGER_WIN_TIME');
              stateChanged = true;
            }
          }

          // Decrement tag and bell cooldowns
          if (state.tagCooldown > 0) {
            state.tagCooldown--;
            stateChanged = true;
          }
          if (state.bellCooldown > 0) {
            state.bellCooldown--;
            stateChanged = true;
          }

          tickBotBehavior(roomCode);
        } 
        // Handle active meeting countdown
        else if (state.phase === 'MEETING' && state.meeting) {
          if (state.meeting.timer > 0) {
            state.meeting.timer--;
            stateChanged = true;

            tickBotMeetingBehavior(roomCode);

            if (state.meeting.timer <= 0 && !state.meeting.isConcluded) {
              concludeRoomMeeting(roomCode);
              stateChanged = true;
            }
          }
        }

        // Clean up stale offline players (keep bots alive)
        const now = Date.now();
        for (const [id, player] of Object.entries(state.players)) {
          if (!player.isBot && !player.isConnected && player.disconnectedAt && now - player.disconnectedAt > 150000) {
            delete state.players[id];
            addRoomSystemMessage(roomCode, `${player.name} Konağı kalıcı olarak terk etti.`);
            stateChanged = true;
          }
        }

        if (stateChanged) {
          saveAndBroadcastRoomState(roomCode);
        }
      }
    }, 1000);
  }

  initMatchTick();

  // Helper: Persists game state to Redis-like manager and broadcasts to all connected clients in the room
  function saveAndBroadcastRoomState(roomCode: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (state) {
      saveRoomState(code, state);
      io.to(code).emit('stateUpdate', state);
    }
  }

  // Helper: Tries to clean or update leaderboards
  function recordRoomStats(roomCode: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state) return;
    try {
      const records: LeaderboardRecord[] = redis.get<LeaderboardRecord[]>('leaderboard_history') || [];
      const nowStr = new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      for (const player of Object.values(state.players)) {
        records.push({
          name: player.name,
          role: player.role,
          score: player.score,
          tagsMade: player.tagsMade,
          tasksDone: player.tasksCompleted,
          date: nowStr,
        });
      }

      // Slice to keep only last 50 games for database performance
      const trimmed = records.slice(-50);
      redis.set('leaderboard_history', trimmed);
      io.to(code).emit('leaderboardUpdate', trimmed);
    } catch (e) {
      console.error('Error tracking scoreboard history:', e);
    }
  }

  function addRoomSystemMessage(roomCode: string, text: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state) return;

    const sysMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: 'Mansion Narrator',
      senderColor: '#A855F7',
      text,
      isSystem: true,
      timestamp: Date.now(),
    };
    if (state.meeting) {
      state.meeting.chatMessages.push(sysMsg);
    }
  }

  function endRoomGame(roomCode: string, outcome: GameState['outcome']) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state) return;

    state.phase = 'GAMEOVER';
    state.outcome = outcome;

    // Calculate final score rewards
    for (const player of Object.values(state.players)) {
      if (outcome?.startsWith('DETECTIVES_WIN') && player.role === 'DETECTIVE') {
        player.score += 150;
      } else if (outcome?.startsWith('TAGGER_WIN') && player.role === 'TAGGER') {
        player.score += 250;
      }
      // Task points
      player.score += player.tasksCompleted * 45;
      // Tag points
      player.score += player.tagsMade * 75;
      // Precision points
      player.score += player.correctVotes * 55;
    }

    recordRoomStats(code);
    saveAndBroadcastRoomState(code);
  }

  function tickBotBehavior(roomCode: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state || state.phase !== 'PLAYING') return;
    
    let stateChanged = false;
    const playersArr = Object.values(state.players);
    const bots = playersArr.filter(p => p.isBot && !p.isEliminated);

    function triggerBotBodyReport(bot: any, tSpot: any) {
      if (!state || state.phase !== 'PLAYING') return;
      
      let reportedName = null;
      const reportedPlayer = state.players[tSpot.id];
      if (reportedPlayer) reportedName = reportedPlayer.name;

      state.phase = 'MEETING';
      state.tagSpots = []; // Clear remains when meeting is initiated
      state.meeting = {
        reporterId: bot.id,
        reportedPlayerId: tSpot.id,
        votes: {},
        votedOutPlayerId: null,
        timer: 35,
        isConcluded: false,
        chatMessages: [],
      };

      for (const pid of Object.keys(state.players)) {
        state.meeting.votes[pid] = 'none';
      }

      io.to(code).emit('meetingStarted', {
        reporterName: bot.name,
        reportedName,
      });

      addRoomSystemMessage(code, `🚨 BİRİ SOBELENDİ! ${bot.name}, ${reportedName || 'bir arkadaş'}'in ebelendiği yeri (ayak izini) buldu ve RAPORLADI! 🙀 Toplantı Başladı!`);
      saveAndBroadcastRoomState(code);
    }
    
    for (const bot of bots) {
      // Check if there is a tagSpot nearby to report
      if (state.tagSpots && state.tagSpots.length > 0) {
        let reportedBody = false;
        for (const tSpot of state.tagSpots) {
          const distToSpot = Math.hypot(bot.x - tSpot.x, bot.y - tSpot.y);
          if (distToSpot < 110 && Math.random() < 0.35) {
            triggerBotBodyReport(bot, tSpot);
            reportedBody = true;
            stateChanged = true;
            break;
          }
        }
        if (reportedBody) {
          break; // Stop execution of other bots for this tick as game phase changed
        }
      }

      if (bot.role === 'DETECTIVE' || bot.role === 'INNOCENT') {
        const incompleteTasks = state.tasks.filter(t => t.progress < 100);
        if (incompleteTasks.length > 0) {
          // Sort tasks by proximity
          incompleteTasks.sort((a, b) => {
            const distA = Math.hypot(bot.x - a.x, bot.y - a.y);
            const distB = Math.hypot(bot.x - b.x, bot.y - b.y);
            return distA - distB;
          });
          const targetTask = incompleteTasks[0];
          
          // Smooth waypoint navigation to respect walls
          const wp = getNextWaypoint(bot.x, bot.y, targetTask.x, targetTask.y);
          const dx = wp.x - bot.x;
          const dy = wp.y - bot.y;
          const dist = Math.hypot(dx, dy);
          
          // If we need to go to waypoint first, or if we are at final target but far
          if (dist > 15 || (wp.x === targetTask.x && wp.y === targetTask.y && dist > 55)) {
            const speed = 40; // 40px per second movement
            const moveAmt = Math.min(dist, speed);
            bot.x += Math.round((dx / dist) * moveAmt);
            bot.y += Math.round((dy / dist) * moveAmt);
            stateChanged = true;
            
            // Check if triggers standard tripping traps
            for (const trap of state.traps) {
              const trapDist = Math.hypot(bot.x - trap.x, bot.y - trap.y);
              if (trapDist < 40) {
                // Trip!
                const trapIndex = state.traps.indexOf(trap);
                if (trapIndex !== -1) {
                  state.traps.splice(trapIndex, 1);
                  io.to(code).emit('trapTripped', { trapId: trap.id, playerName: bot.name });
                  addRoomSystemMessage(code, `Oops! Bot ${bot.name} triggered a Confetti Trap! 🎉`);
                  bot.trapsDodged += 1;
                  break;
                }
              }
            }
          } else if (wp.x === targetTask.x && wp.y === targetTask.y) {
            // Arrived! Progress Chore
            targetTask.progress = Math.min(100, targetTask.progress + 15);
            stateChanged = true;
            if (targetTask.progress >= 100) {
              bot.tasksCompleted += 1;
              bot.score += 65;
              addRoomSystemMessage(code, `Hooray! Bot ${bot.name} completed: "${targetTask.name}" in the ${targetTask.room}!`);
              
              // Trigger score recalculation
              const totalProgressSum = state.tasks.reduce((acc, t) => acc + t.progress, 0);
              state.taskProgress = Math.round(totalProgressSum / state.tasks.length);
              
              if (state.taskProgress >= 100) {
                endRoomGame(code, 'DETECTIVES_WIN_TASKS');
                return; // Early return to prevent ticking other bots
              }
            }
          }
        }
      } else if (bot.role === 'TAGGER') {
        const aliveDetectives = playersArr.filter(p => p.role !== 'TAGGER' && !p.isEliminated);
        if (aliveDetectives.length > 0) {
          aliveDetectives.sort((a, b) => {
            const distA = Math.hypot(bot.x - a.x, bot.y - a.y);
            const distB = Math.hypot(bot.x - b.x, bot.y - b.y);
            return distA - distB;
          });
          const targetDet = aliveDetectives[0];
          
          // Waypoint pathing to catch player
          const wp = getNextWaypoint(bot.x, bot.y, targetDet.x, targetDet.y);
          const dx = wp.x - bot.x;
          const dy = wp.y - bot.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist > 15 || (wp.x === targetDet.x && wp.y === targetDet.y && dist > 40)) {
            const speed = 45; // 45px per second
            const moveAmt = Math.min(dist, speed);
            bot.x += Math.round((dx / dist) * moveAmt);
            bot.y += Math.round((dy / dist) * moveAmt);
            stateChanged = true;
            
            // Place traps once in a while
            if (Math.random() < 0.12 && dist > 140) {
              if (state.traps.filter(t => t.placedBy === bot.id).length < 3) {
                state.traps.push({
                  id: Math.random().toString(36).substr(2, 9),
                  x: bot.x,
                  y: bot.y,
                  placedBy: bot.id
                });
                stateChanged = true;
              }
            }
          }
          
          const tagCheckDist = Math.hypot(bot.x - targetDet.x, bot.y - targetDet.y);
          if (tagCheckDist <= 85 && (state.tagCooldown || 0) <= 0) {
            targetDet.isEliminated = true;
            bot.tagsMade += 1;
            bot.score += 100;
            state.tagCooldown = 40; // 40 seconds tag cooldown!

            state.tagSpots = state.tagSpots || [];
            state.tagSpots.push({
              id: targetDet.id,
              playerName: targetDet.name,
              color: targetDet.color,
              x: targetDet.x,
              y: targetDet.y
            });

            if (!targetDet.isBot) {
              io.to(targetDet.id).emit('taggedSound', { taggerName: '', taggedName: targetDet.name });
            }
            
            addRoomSystemMessage(code, `📢 EBE BİRİNİ SOBELEDİ! Sinsi ebe (${bot.name}), ${targetDet.name} arkadaşımızı sobeledi! Ebe dinlenmeye çekildi, 40 saniye boyunca kimseyi sobeleyemez!`);
            stateChanged = true;
            
            const remainingDet = Object.values(state.players).filter(
              p => p.role !== 'TAGGER' && !p.isEliminated
            );
            if (remainingDet.length === 0) {
              endRoomGame(code, 'TAGGER_WIN_ELIMINATIONS');
              return;
            }
          }
        }

        // Tagger bot occasionally sabotages task they walk near!
        for (const t of state.tasks) {
          if (t.progress > 0 && Math.hypot(bot.x - t.x, bot.y - t.y) < 80) {
            if (Math.random() < 0.12) { // 12% chance per tick when near
              t.progress = 0;
              addRoomSystemMessage(code, `⚠️ Bir oda görevi gizemli bir şekilde sıfırlandı!`);
              
              // Recalculate
              const totalSum = state.tasks.reduce((acc, taskItem) => acc + taskItem.progress, 0);
              state.taskProgress = Math.round(totalSum / state.tasks.length);
              stateChanged = true;
              break; // Sabotage one task per tick limit
            }
          }
        }

      }
    }
    
    if (stateChanged) {
      saveAndBroadcastRoomState(code);
    }
  }

  function tickBotMeetingBehavior(roomCode: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state || !state.meeting || state.meeting.isConcluded) return;

    const playersArr = Object.values(state.players);
    const aliveBots = playersArr.filter(p => p.isBot && !p.isEliminated);

    for (const bot of aliveBots) {
      // Chat simulation (8% chance each second for each bot to say something playful)
      if (Math.random() < 0.08) {
        const customMessages = [
          'Ben bahçedeydim çiçekleri suluyordum! 🌸',
          'Library\'de kitap diziyordum 📚',
          'Mutfakta meyve tabağı hazırlıyordum 🍉',
          'Şüpheli birini gördüm sanki... 👀',
          'Bence oy vermeyelim, skip geçelim ⏳',
          'Tagger bence çok sinsi davranıyor!',
          'Ben temizim arkadaşlar, oyun parkındaydım 🎲',
          'Oyuncak kutusunu topladım az önce, çok eğlenceliydi! 🧸',
          'Aramızda bir canavar mı var yoksa? 🙀'
        ];
        
        const chatMsg: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderName: bot.name,
          senderColor: bot.color,
          text: customMessages[Math.floor(Math.random() * customMessages.length)],
          isSystem: false,
          timestamp: Date.now()
        };
        state.meeting.chatMessages.push(chatMsg);
      }

      // Voting simulation
      const botVote = state.meeting.votes[bot.id];
      if ((!botVote || botVote === 'none') && (state.meeting.timer <= 25 || Math.random() < 0.15)) {
        let voteChoice = 'skip';
        const otherAlivePlayers = playersArr.filter(p => p.id !== bot.id && !p.isEliminated);
        
        if (otherAlivePlayers.length > 0) {
          if (bot.role === 'TAGGER') {
            const target = otherAlivePlayers[Math.floor(Math.random() * otherAlivePlayers.length)];
            voteChoice = target.id;
          } else {
            const rand = Math.random();
            const trueTagger = otherAlivePlayers.find(p => p.role === 'TAGGER');
            
            if (trueTagger && rand < 0.35) {
              voteChoice = trueTagger.id;
            } else if (rand < 0.75) {
              voteChoice = 'skip';
            } else {
              const target = otherAlivePlayers[Math.floor(Math.random() * otherAlivePlayers.length)];
              voteChoice = target.id;
            }
          }
        }
        
        state.meeting.votes[bot.id] = voteChoice;
        addRoomSystemMessage(code, `${bot.name} has cast their vote!`);
        
        // Recalculate if everyone voted
        const aliveVoters = Object.values(state.players).filter(p => !p.isEliminated && p.isConnected);
        const hasEveryoneVoted = aliveVoters.every(v => {
          const cast = state.meeting?.votes[v.id];
          return cast && cast !== 'none';
        });

        if (hasEveryoneVoted) {
          concludeRoomMeeting(code);
          break;
        }
      }
    }
  }

  function concludeRoomMeeting(roomCode: string) {
    const code = roomCode.toUpperCase();
    const state = rooms[code];
    if (!state || !state.meeting) return;

    state.meeting.isConcluded = true;

    const votes = state.meeting.votes;
    const voteCounts: Record<string, number> = {};

    for (const votedFor of Object.values(votes)) {
      if (votedFor !== 'skip' && votedFor !== 'none') {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
      }
    }

    let highestVoteId: string | null = null;
    let highestVoteCount = 0;
    let isTie = false;

    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count > highestVoteCount) {
        highestVoteId = pid;
        highestVoteCount = count;
        isTie = false;
      } else if (count === highestVoteCount) {
        isTie = true;
      }
    }

    const skippedCou = Object.values(votes).filter(v => v === 'skip').length;
    if (skippedCou >= highestVoteCount) {
      isTie = true;
    }

    if (highestVoteId && !isTie) {
      const votedPlayer = state.players[highestVoteId];
      if (votedPlayer) {
        state.meeting.votedOutPlayerId = highestVoteId;

        // Reward voters who accurately detected the tagger
        if (votedPlayer.role === 'TAGGER') {
          votedPlayer.isEliminated = true; // Yes, eliminate tagger on correct vote!
          for (const voterId of Object.keys(votes)) {
            if (votes[voterId] === highestVoteId && state.players[voterId]) {
              state.players[voterId].correctVotes += 1;
              state.players[voterId].score += 80;
            }
          }
          addRoomSystemMessage(code, `🎉 BÜYÜK BAŞARI! Ebe olan ${votedPlayer.name} oymalayla doğru tahmin edildi! Dedektifler ve Masumlar oyunu kazandı! 🏆`);
          setTimeout(() => {
            endRoomGame(code, 'DETECTIVES_WIN_VOTE');
          }, 3000);
        } else {
          // Wrong guess! "bir şey olmasın" - do NOT eliminate!
          state.bellCooldown = 40; // Lock the bell/guesses for 40 seconds!
          addRoomSystemMessage(code, `🚨 DIŞARI OYNAMA HATASI! ${votedPlayer.name} oymak istendi ama o EBE değil! Kimse elenmedi fakat Merkez Zili ve Tahminler 40 saniye boyunca kilitlendi! 🔒`);
        }
      }
    } else {
      addRoomSystemMessage(code, 'Kolluk kuvvetleri ve sakinler bu tur pas geçmeye karar verdi. Oyun devam ediyor!');
    }

    // After 4.5 seconds, return to active gameplay (unless Detectives already won)
    setTimeout(() => {
      if (state.phase === 'MEETING') {
        // Direct reset player coordinates to zone
        const roomsList = [
          { x: 250, y: 220 },
          { x: 950, y: 220 },
          { x: 600, y: 380 },
          { x: 950, y: 580 },
          { x: 250, y: 580 }
        ];
        let rIndex = 0;
        for (const player of Object.values(state.players)) {
          const spawnLoc = roomsList[rIndex % roomsList.length];
          player.x = spawnLoc.x;
          player.y = spawnLoc.y;
          rIndex++;
        }

        state.phase = 'PLAYING';
        state.meeting = null;
        state.traps = []; // Clear current traps after meeting for complete balance
        saveAndBroadcastRoomState(code);
      }
    }, 4500);

    saveAndBroadcastRoomState(code);
  }

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing O/0, I/1
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Socket triggers
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join, create, or resume in a Room
    socket.on('joinGame', ({ 
      name, 
      charIndex, 
      sessionToken, 
      roomCode, 
      isCreating, 
      maxPlayers 
    }: { 
      name: string; 
      charIndex: number; 
      sessionToken?: string; 
      roomCode?: string; 
      isCreating?: boolean; 
      maxPlayers?: number 
    }) => {
      let resolvedRoomCode = (roomCode || '').trim().toUpperCase();
      const usedToken = sessionToken || Math.random().toString(36).substring(2, 15);
      
      let state: GameState | null = null;

      if (isCreating) {
        // Generates unique code
        let code = generateRoomCode();
        let attempts = 0;
        while (getRoomState(code) && attempts < 20) {
          code = generateRoomCode();
          attempts++;
        }
        resolvedRoomCode = code;

        // Player size limits
        let limit = Number(maxPlayers) || 6;
        if (limit < 4) limit = 4;
        if (limit > 10) limit = 10;

        state = {
          phase: 'LOBBY',
          players: {},
          tasks: get10RandomTasks(),
          traps: [],
          tagSpots: [],
          meeting: null,
          taskProgress: 0,
          timer: 240,
          tagCooldown: 0,
          bellCooldown: 0,
          outcome: null,
          roomCode: resolvedRoomCode,
          maxPlayers: limit,
        };

        saveRoomState(resolvedRoomCode, state);
      } else {
        if (!resolvedRoomCode) {
          socket.emit('joinError', { message: 'Lütfen doğru bir oda kodu girin!' });
          return;
        }

        state = getRoomState(resolvedRoomCode);
        if (!state) {
          socket.emit('joinError', { message: `Oda bulunamadı: "${resolvedRoomCode}". Lütfen doğru oda kodu girdiğinizden emin olun.` });
          return;
        }
      }

      // Add socket mappings
      socket.join(resolvedRoomCode);
      socketToRoom.set(socket.id, resolvedRoomCode);
      socketToSession.set(socket.id, usedToken);

      // Check if resuming session
      let isResume = false;
      let existingPlayer: Player | null = null;

      if (usedToken) {
        const found = Object.values(state.players).find(p => p.sessionToken === usedToken);
        if (found) {
          existingPlayer = found;
          isResume = true;
        }
      }

      if (isResume && existingPlayer) {
        const oldId = existingPlayer.id;
        if (oldId !== socket.id) {
          state.players[socket.id] = {
            ...existingPlayer,
            id: socket.id,
            isConnected: true,
            disconnectedAt: null,
          };
          delete state.players[oldId];
        } else {
          existingPlayer.isConnected = true;
          existingPlayer.disconnectedAt = null;
        }

        socket.emit('sessionEstablished', {
          playerId: socket.id,
          sessionToken: usedToken,
          state: state,
        });

        addRoomSystemMessage(resolvedRoomCode, `${existingPlayer.name} konağa geri geldi.`);
        saveAndBroadcastRoomState(resolvedRoomCode);
        return;
      }

      // If game other than lobby, block join
      if (state.phase !== 'LOBBY' && state.phase !== 'GAMEOVER') {
        socket.emit('joinError', { message: 'Oyun çoktan başladı! Lütfen lobiye dönene kadar spec kalın veya yeni bir oda kurun.' });
        return;
      }

      const currentPlayers = Object.values(state.players);

      // Lobby size check
      if (currentPlayers.length >= state.maxPlayers) {
        socket.emit('joinError', { message: `Üzgünüz, oda dolu! Maksimum ${state.maxPlayers} oyuncu sınırı aşılmış.` });
        return;
      }

      // Generate player slot
      const characterColor = CHAR_COLORS[currentPlayers.length % CHAR_COLORS.length];
      const spawnedRooms = [
        { x: 250, y: 220 },
        { x: 950, y: 220 },
        { x: 600, y: 380 },
        { x: 950, y: 580 },
      ];
      const initialPos = spawnedRooms[currentPlayers.length % spawnedRooms.length];

      const newPlayer: Player = {
        id: socket.id,
        sessionToken: usedToken,
        name: name ? name.substring(0, 14) : `Guest ${currentPlayers.length + 1}`,
        charIndex: typeof charIndex === 'number' ? charIndex : 0,
        role: 'DETECTIVE',
        x: initialPos.x,
        y: initialPos.y,
        color: characterColor,
        isEliminated: false,
        score: 0,
        tasksCompleted: 0,
        tagsMade: 0,
        trapsDodged: 0,
        correctVotes: 0,
        isConnected: true,
        disconnectedAt: null,
      };

      state.players[socket.id] = newPlayer;

      socket.emit('sessionEstablished', {
        playerId: socket.id,
        sessionToken: usedToken,
        state: state,
      });

      addRoomSystemMessage(resolvedRoomCode, `${newPlayer.name} konağa giriş yaptı.`);
      saveAndBroadcastRoomState(resolvedRoomCode);
    });

    // Real-time position syncing inside Room boundaries
    socket.on('movePlayer', ({ x, y }: { x: number; y: number }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const player = state.players[socket.id];
        if (player) {
          player.x = x;
          player.y = y;
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Tagger placing Confetti Trap
    socket.on('placeTrap', ({ x, y }: { x: number; y: number }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const player = state.players[socket.id];
        if (player && player.role === 'TAGGER' && !player.isEliminated) {
          if (state.traps.filter(t => t.placedBy === socket.id).length >= 3) {
            const oldestIdx = state.traps.findIndex(t => t.placedBy === socket.id);
            if (oldestIdx !== -1) {
              state.traps.splice(oldestIdx, 1);
            }
          }

          const newTrap: ConfettiTrap = {
            id: Math.random().toString(36).substr(2, 9),
            x,
            y,
            placedBy: socket.id,
          };

          state.traps.push(newTrap);
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Detective tripping confetti trap
    socket.on('triggerTripTrap', ({ trapId }: { trapId: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const player = state.players[socket.id];
        if (player && !player.isEliminated) {
          const trapIndex = state.traps.findIndex(t => t.id === trapId);
          if (trapIndex !== -1) {
            state.traps.splice(trapIndex, 1);
            io.to(roomCode).emit('trapTripped', { trapId, playerName: player.name });
            addRoomSystemMessage(roomCode, `Oops! ${player.name} stepped in a sparkling Confetti Trap! 🎉`);
            saveAndBroadcastRoomState(roomCode);
          }
        }
      }
    });

    // Detective guesses who the Tagger is
    socket.on('guessTagger', ({ targetPlayerId }: { targetPlayerId: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (roomCode) {
        const state = getRoomState(roomCode);
        if (state && state.phase === 'PLAYING') {
          // Block if bell is on cooldown
          if ((state.bellCooldown || 0) > 0) {
            socket.emit('joinError', { message: `Zil ve Tahmin şu an kilitli! Kalan süre: ${state.bellCooldown} saniye.` });
            return;
          }

          const detective = state.players[socket.id];
          const target = state.players[targetPlayerId];

          if (
            detective && 
            target && 
            detective.role === 'DETECTIVE' && 
            !detective.isEliminated && 
            !target.isEliminated &&
            detective.id !== target.id
          ) {
            // Check if guess is correct
            if (target.role === 'TAGGER') {
              // Correct guess! Detectives win!
              addRoomSystemMessage(roomCode, `🎉 HARİKA TAHMİN! Dedektif ${detective.name}, sinsi ebe olan ${target.name} arkadaşımızı doğru tahmin etti! Ekip oyunu kazandı! ⭐`);
              endRoomGame(roomCode, 'DETECTIVES_WIN_VOTE'); // Triggers DETECTIVES_WIN_VOTE outcome
            } else {
              // Incorrect guess! "bir şey olmasın" (No one gets eliminated)
              state.bellCooldown = 40; // Lock the bell/guesses for 40 seconds!

              addRoomSystemMessage(roomCode, `🚨 YANLIŞ TAHMİN! Dedektif ${detective.name}, ${target.name} arkadaşımızın ebe olduğunu iddia etti ama yanıldı! Kimse elenmedi ama Merkez Zili 40 saniye boyunca kilitlendi! 🔒`);
              saveAndBroadcastRoomState(roomCode);
            }
          }
        }
      }
    });

    // Tagger tags Detective
    socket.on('tagPlayer', ({ targetPlayerId }: { targetPlayerId: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const tagger = state.players[socket.id];
        const target = state.players[targetPlayerId];

        if (
          tagger && 
          target && 
          tagger.role === 'TAGGER' && 
          target.role !== 'TAGGER' && 
          !tagger.isEliminated && 
          !target.isEliminated &&
          (state.tagCooldown || 0) <= 0
        ) {
          const dx = tagger.x - target.x;
          const dy = tagger.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= 90) {
            target.isEliminated = true;
            tagger.tagsMade += 1;
            tagger.score += 100;
            state.tagCooldown = 40; // Apply 40 seconds tag cooldown!

            state.tagSpots = state.tagSpots || [];
            state.tagSpots.push({
              id: target.id,
              playerName: target.name,
              color: target.color,
              x: target!.x,
              y: target!.y
            });

            if (!target.isBot) {
              io.to(target.id).emit('taggedSound', { taggerName: '', taggedName: target.name });
            }

            addRoomSystemMessage(roomCode, `📢 EBE BİRİNİ SOBELEDİ! Sinsi ebe (${tagger.name}), ${target.name} arkadaşımızı sobeledi! Ebe dinlenmeye çekildi, 40 saniye boyunca kimseyi sobeleyemez!`);

            const aliveDetectives = Object.values(state.players).filter(
              p => p.role !== 'TAGGER' && !p.isEliminated && p.isConnected
            );

            if (aliveDetectives.length === 0) {
              endRoomGame(roomCode, 'TAGGER_WIN_ELIMINATIONS');
            } else {
              saveAndBroadcastRoomState(roomCode);
            }
          }
        }
      }
    });

    // Chore task completed or progressed
    socket.on('compTaskProgress', ({ taskId, increment }: { taskId: string; increment: number }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const player = state.players[socket.id];
        if (player && !player.isEliminated) {
          const task = state.tasks.find(t => t.id === taskId);
          if (task && task.progress < 100) {
            task.progress = Math.min(100, task.progress + increment);

            if (task.progress >= 100) {
              player.tasksCompleted += 1;
              player.score += 60;
              addRoomSystemMessage(roomCode, `Hooray! ${player.name} completed: "${task.name}" in the ${task.room}!`);
            }

            const totalSum = state.tasks.reduce((acc, t) => acc + t.progress, 0);
            state.taskProgress = Math.round(totalSum / state.tasks.length);

            if (state.taskProgress >= 100) {
              endRoomGame(roomCode, 'DETECTIVES_WIN_TASKS');
            } else {
              saveAndBroadcastRoomState(roomCode);
            }
          }
        }
      }
    });

    // Tagger secretly sabotaging/cancelling a task's progress
    socket.on('sabotageTask', ({ taskId }: { taskId: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'PLAYING') {
        const player = state.players[socket.id];
        if (player && player.role === 'TAGGER' && !player.isEliminated) {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            task.progress = 0; // completely reset back to zero!

            // Recalculate global task completion percentage
            const totalSum = state.tasks.reduce((acc, t) => acc + t.progress, 0);
            state.taskProgress = Math.round(totalSum / state.tasks.length);

            addRoomSystemMessage(roomCode, `⚠️ Bir oda görevi gizemli bir şekilde sıfırlandı!`);
            saveAndBroadcastRoomState(roomCode);
          }
        }
      }
    });

    // Gathering meeting via Golden Mansion Bell
    socket.on('startMeeting', ({ reportedPlayerId }: { reportedPlayerId: string | null }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && !state.meeting && state.phase === 'PLAYING') {
        const reporter = state.players[socket.id];
        if (reporter) {
          // If manually ringing the bell, check bellCooldown!
          if (!reportedPlayerId && (state.bellCooldown || 0) > 0) {
            socket.emit('joinError', { message: `Merkez Zili şu an kilitli! Kalan süre: ${state.bellCooldown} saniye.` });
            return;
          }

          let reportedName = null;
          if (reportedPlayerId) {
            const reportedPlayer = state.players[reportedPlayerId];
            if (reportedPlayer) reportedName = reportedPlayer.name;
          }

          state.phase = 'MEETING';
          state.tagSpots = []; // Clear remains when meeting is initiated
          state.meeting = {
            reporterId: socket.id,
            reportedPlayerId,
            votes: {},
            votedOutPlayerId: null,
            timer: 35,
            isConcluded: false,
            chatMessages: [],
          };

          // Populate with none
          for (const pid of Object.keys(state.players)) {
            state.meeting.votes[pid] = 'none';
          }

          io.to(roomCode).emit('meetingStarted', {
            reporterName: reporter.name,
            reportedName,
          });

          if (reportedName) {
            addRoomSystemMessage(roomCode, `🚨 BİRİ EBELENDİ VE ELENDİ! ${reporter.name} arkadaşımız ebelenen kişinin (${reportedName}) izini bularak raporladı! 🙀 Tartışma başlasın!`);
          } else {
            addRoomSystemMessage(roomCode, `🔔 ACİL DURUM! ${reporter.name} Merkez Zili'ni çalarak herkesi toplantıya çağırdı!`);
          }
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Cast meeting vote
    socket.on('submitVote', ({ vote }: { vote: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.meeting && !state.meeting.isConcluded) {
        const voter = state.players[socket.id];
        if (voter && !voter.isEliminated) {
          state.meeting.votes[socket.id] = vote;
          addRoomSystemMessage(roomCode, `${voter.name} has cast their vote!`);

          const aliveVoters = Object.values(state.players).filter(p => !p.isEliminated && p.isConnected);
          const hasEveryoneVoted = aliveVoters.every(v => {
            const cast = state.meeting?.votes[v.id];
            return cast && cast !== 'none';
          });

          if (hasEveryoneVoted) {
            concludeRoomMeeting(roomCode);
          } else {
            saveAndBroadcastRoomState(roomCode);
          }
        }
      }
    });

    // Chat during discussions
    socket.on('sendChatMessage', ({ message }: { message: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.meeting && !state.meeting.isConcluded && message) {
        const sender = state.players[socket.id];
        if (sender) {
          const sanitized = message.substring(0, 100);
          const newMsg: ChatMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderName: sender.name,
            senderColor: sender.color,
            text: sanitized,
            isSystem: false,
            timestamp: Date.now(),
          };
          state.meeting.chatMessages.push(newMsg);
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Restarts or initiates active gameplay
    socket.on('restartGame', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state) {
        // Starts the actual game
        if (state.phase === 'LOBBY' || state.phase === 'GAMEOVER') {
          // Automatic filling with bots to the custom selected Max Players capacity!
          let currentPlayers = Object.values(state.players);
          if (currentPlayers.length < state.maxPlayers) {
            const botsNeeded = state.maxPlayers - currentPlayers.length;
            for (let i = 0; i < botsNeeded; i++) {
              const unusedBotName = BOT_NAMES.find(name => !currentPlayers.some(p => p.name === name)) || `Bot Oyuncu ${currentPlayers.length + 1}`;
              const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
              const characterColor = CHAR_COLORS[Math.floor(Math.random() * CHAR_COLORS.length)];
              const spawnedRooms = [
                { x: 250, y: 220 },
                { x: 950, y: 220 },
                { x: 600, y: 380 },
                { x: 950, y: 580 },
              ];
              const initialPos = spawnedRooms[Object.keys(state.players).length % spawnedRooms.length];
              
              state.players[botId] = {
                id: botId,
                sessionToken: 'bot_token_' + Math.random(),
                name: unusedBotName,
                charIndex: Math.floor(Math.random() * 6),
                role: 'DETECTIVE',
                x: initialPos.x,
                y: initialPos.y,
                color: characterColor,
                isEliminated: false,
                score: 0,
                tasksCompleted: 0,
                tagsMade: 0,
                trapsDodged: 0,
                correctVotes: 0,
                isConnected: true,
                disconnectedAt: null,
                isBot: true,
              };
              currentPlayers = Object.values(state.players);
            }
          }

          const playersArr = Object.values(state.players);
          if (playersArr.length >= 1) {
            state.tasks = get10RandomTasks();
            state.taskProgress = 0;
            state.traps = [];
            state.tagSpots = [];
            state.meeting = null;
            state.timer = 240; // 4 minutes
            state.tagCooldown = 0;
            state.bellCooldown = 0;
            state.outcome = null;

            // Pick exactly 1 random player as TAGGER (Ebe)
            const taggerIdx = Math.floor(Math.random() * playersArr.length);
            
            // From the remaining players, pick exactly 1 as DETECTIVE (Dedektif)
            const remainingIndices = playersArr.map((_, i) => i).filter(i => i !== taggerIdx);
            const detectiveIdx = remainingIndices.length > 0 
              ? remainingIndices[Math.floor(Math.random() * remainingIndices.length)] 
              : -1;
            
            playersArr.forEach((p, idx) => {
              p.isEliminated = false;
              if (idx === taggerIdx) {
                p.role = 'TAGGER';
              } else if (idx === detectiveIdx) {
                p.role = 'DETECTIVE';
              } else {
                p.role = 'INNOCENT';
              }
              p.tasksCompleted = 0;
              p.tagsMade = 0;
              p.trapsDodged = 0;
              p.correctVotes = 0;
              
              const spawnPositions = [
                { x: 250, y: 220 },
                { x: 950, y: 220 },
                { x: 600, y: 380 },
                { x: 950, y: 580 },
                { x: 250, y: 580 },
              ];
              const spawn = spawnPositions[idx % spawnPositions.length];
              p.x = spawn.x;
              p.y = spawn.y;
            });

            state.phase = 'PLAYING';
            addRoomSystemMessage(roomCode, 'Mansion\'da gizem başladı! 1 Ebe, 1 Dedektif ve Masumlar iş başında! Görevleri tamamlayıp ebeyi bulun!');
            saveAndBroadcastRoomState(roomCode);
          }
        }
      }
    });

    // Fill remaining empty slots with bots
    socket.on('fillBots', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'LOBBY') {
        let currentPlayers = Object.values(state.players);
        const botsNeeded = state.maxPlayers - currentPlayers.length;
        if (botsNeeded > 0) {
          for (let i = 0; i < botsNeeded; i++) {
            const unusedBotName = BOT_NAMES.find(name => !currentPlayers.some(p => p.name === name)) || `Bot Oyuncu ${currentPlayers.length + 1}`;
            const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
            const characterColor = CHAR_COLORS[Math.floor(Math.random() * CHAR_COLORS.length)];
            const spawnedRooms = [
              { x: 250, y: 220 },
              { x: 950, y: 220 },
              { x: 600, y: 380 },
              { x: 950, y: 580 },
            ];
            const initialPos = spawnedRooms[Object.keys(state.players).length % spawnedRooms.length];

            state.players[botId] = {
              id: botId,
              sessionToken: 'bot_token_' + Math.random(),
              name: unusedBotName,
              charIndex: Math.floor(Math.random() * 6),
              role: 'DETECTIVE',
              x: initialPos.x,
              y: initialPos.y,
              color: characterColor,
              isEliminated: false,
              score: 0,
              tasksCompleted: 0,
              tagsMade: 0,
              trapsDodged: 0,
              correctVotes: 0,
              isConnected: true,
              disconnectedAt: null,
              isBot: true,
            };
            currentPlayers = Object.values(state.players);
          }
          addRoomSystemMessage(roomCode, `Eksik kalan ${botsNeeded} kişilik yer bot oyuncular ile dolduruldu. 🤖`);
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Add unique bot
    socket.on('addBot', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'LOBBY') {
        const currentPlayers = Object.values(state.players);
        if (currentPlayers.length < state.maxPlayers) {
          const unusedBotName = BOT_NAMES.find(name => !currentPlayers.some(p => p.name === name)) || `Bot Oyuncu ${currentPlayers.length + 1}`;
          const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
          const characterColor = CHAR_COLORS[Math.floor(Math.random() * CHAR_COLORS.length)];
          const spawnedRooms = [
            { x: 250, y: 220 },
            { x: 950, y: 220 },
            { x: 600, y: 380 },
            { x: 950, y: 580 },
          ];
          const initialPos = spawnedRooms[currentPlayers.length % spawnedRooms.length];

          state.players[botId] = {
            id: botId,
            sessionToken: 'bot_token_' + Math.random(),
            name: unusedBotName,
            charIndex: Math.floor(Math.random() * 6),
            role: 'DETECTIVE',
            x: initialPos.x,
            y: initialPos.y,
            color: characterColor,
            isEliminated: false,
            score: 0,
            tasksCompleted: 0,
            tagsMade: 0,
            trapsDodged: 0,
            correctVotes: 0,
            isConnected: true,
            disconnectedAt: null,
            isBot: true,
          };

          addRoomSystemMessage(roomCode, `${unusedBotName} (Bot) antreye giriş yaptı.`);
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Remove bot
    socket.on('removeBot', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state && state.phase === 'LOBBY') {
        const bots = Object.values(state.players).filter(p => p.isBot);
        if (bots.length > 0) {
          const botToRemove = bots[bots.length - 1];
          delete state.players[botToRemove.id];
          addRoomSystemMessage(roomCode, `${botToRemove.name} (Bot) konaktan ayrıldı.`);
          saveAndBroadcastRoomState(roomCode);
        }
      }
    });

    // Reset whole game inside room back to lobby
    socket.on('forceResetToLobby', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      const state = getRoomState(roomCode);
      if (state) {
        state.phase = 'LOBBY';
        state.meeting = null;
        state.taskProgress = 0;
        state.traps = [];
        state.tagSpots = [];
        state.outcome = null;
        state.timer = 240;
        
        // Reset properties of any remaining players so they can cleanly start again (preserve bots or humans)
        Object.values(state.players).forEach(p => {
          p.isEliminated = false;
          p.role = 'DETECTIVE';
          p.score = 0;
          p.tasksCompleted = 0;
          p.tagsMade = 0;
          p.trapsDodged = 0;
          p.correctVotes = 0;
          p.x = 600;
          p.y = 380;
        });

        addRoomSystemMessage(roomCode, `Oyun sıfırlandı. Lobiye geri dönülüyor...`);
        saveAndBroadcastRoomState(roomCode);
      }
    });

    // Leave room and disperse or exit back to landing page
    socket.on('leaveRoom', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (roomCode) {
        const state = getRoomState(roomCode);
        if (state) {
          const player = state.players[socket.id];
          if (player) {
            delete state.players[socket.id];
            addRoomSystemMessage(roomCode, `${player.name} konaktan ayrıldı.`);

            // If room is empty of active human players, dismantle it
            const activeHumans = Object.values(state.players).filter(p => !p.isBot);
            if (activeHumans.length === 0) {
              delete rooms[roomCode.toUpperCase()];
              redis.set('room_' + roomCode.toUpperCase(), null);
            } else {
              saveAndBroadcastRoomState(roomCode);
            }
          }
        }
        socket.leave(roomCode);
        socketToRoom.delete(socket.id);
        socketToSession.delete(socket.id);
        socket.emit('leftRoomSuccess');
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const roomCode = socketToRoom.get(socket.id);
      if (roomCode) {
        const state = getRoomState(roomCode);
        if (state) {
          const player = state.players[socket.id];
          if (player) {
            player.isConnected = false;
            player.disconnectedAt = Date.now();
            addRoomSystemMessage(roomCode, `${player.name} geçici olarak bağlantısını kaybetti.`);
            saveAndBroadcastRoomState(roomCode);
          }
        }
      }
      
      socketToSession.delete(socket.id);
      socketToRoom.delete(socket.id);
    });
  });

  // Handle client interface bundling integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server successfully to Host 0.0.0.0 & Port 3000
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`Mansion Server listening strictly on Port ${PORT}`);
    console.log(`Local link: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to initialize Mansion server:', err);
});
