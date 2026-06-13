import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, Task, LeaderboardRecord } from './types';
import GameBoard from './components/GameBoard';
import MansionMeeting from './components/MansionMeeting';
import TaskMinigame from './components/TaskMinigame';
import Scoreboard from './components/Scoreboard';
import { 
  Shield, 
  Sparkles, 
  Users, 
  User, 
  ArrowRight, 
  BookOpen, 
  AlertCircle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Copy, 
  Gamepad2, 
  HelpCircle 
} from 'lucide-react';
import { playChime, playTrapBubble, getSoundMuted, setSoundMuted } from './utils/sound';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);

  // Sound system controls
  const [isMuted, setIsMuted] = useState(getSoundMuted());

  // Lobby setup states
  const [joinName, setJoinName] = useState(() => localStorage.getItem('mansion_player_name') || '');
  const [charIndex, setCharIndex] = useState(() => {
    const saved = localStorage.getItem('mansion_char_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lobbyMode, setLobbyMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);

  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  // Active task overlay
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Audio system triggers / sound bubbles
  const [alertText, setAlertText] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const CHARACTER_EMOJIS = ['🐼 Panda', '🐱 Cat', '🦊 Fox', '🦉 Owl', '🐹 Hamster', '🐨 Koala'];
  const CHARACTER_COLORS = ['#FF4D4D', '#4DA6FF', '#4DFF4D', '#E1FF4D', '#FF4DFF', '#FFA64D'];

  // Initialize Socket connection
  useEffect(() => {
    // Connect to same origin host so network clients can dynamically resolve
    const socket: Socket = io(window.location.origin, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connection verified on Port 3000');

      // If user had a saved session, try a session handshake immediately
      const savedToken = localStorage.getItem('mansion_session_token');
      const savedName = localStorage.getItem('mansion_player_name') || '';
      const savedChar = parseInt(localStorage.getItem('mansion_char_index') || '0', 10);
      const savedRoomCode = localStorage.getItem('mansion_room_code') || '';

      if (savedToken && savedRoomCode) {
        setSessionToken(savedToken);
        socket.emit('joinGame', {
          name: savedName,
          charIndex: savedChar,
          sessionToken: savedToken,
          roomCode: savedRoomCode,
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive refreshed server-authoritative state Update
    socket.on('stateUpdate', (updatedState: GameState) => {
      setGameState(updatedState);
      
      // If client is in player roster, mark as joined
      if (socket.id && updatedState.players[socket.id]) {
        setIsJoined(true);
      }
    });

    // Handle connection or room logic errors
    socket.on('joinError', ({ message }: { message: string }) => {
      triggerVisualAlert(message);
      setIsJoined(false);
      localStorage.removeItem('mansion_session_token');
      localStorage.removeItem('mansion_room_code');
    });

    // Session successfully established / resumed
    socket.on('sessionEstablished', ({ playerId: sPlayerId, sessionToken: sToken, state: sState }) => {
      setPlayerId(sPlayerId);
      setSessionToken(sToken);
      setGameState(sState);

      localStorage.setItem('mansion_session_token', sToken);
      if (sState && sState.roomCode) {
        localStorage.setItem('mansion_room_code', sState.roomCode);
      }
      if (sPlayerId && sState.players[sPlayerId]) {
        setIsJoined(true);
      }
    });

    // Sparkle traps alarm
    socket.on('trapTripped', ({ trapId, playerName }: { trapId: string, playerName: string }) => {
      triggerVisualAlert(`🎉 UYARI! ${playerName} konfeti tuzağına bastı! 🎉`);
      playTrapBubble();
    });

    // Tag alerts - received only by the tagged victim
    socket.on('taggedSound', ({ taggerName, taggedName }: { taggerName: string, taggedName: string }) => {
      triggerVisualAlert(`🚨 SOBELENDİN! Artık bir hayaletsin! 👻 Haritada serbestçe dolaşabilirsin ama konuşamazsın!`);
      playTrapBubble();
    });

    // Meeting bell rung
    socket.on('meetingStarted', ({ reporterName, reportedName }: { reporterName: string, reportedName: string | null }) => {
      if (reportedName) {
        triggerVisualAlert(`🛎️ RAPOR! ${reporterName}, ${reportedName}'in sobelendiği yeri bildirdi!`);
      } else {
        triggerVisualAlert(`🔔 ZİL ÇALDI! ${reporterName} herkesi tartışma salonuna çağırdı!`);
      }
      playChime();
    });

    socket.on('leaderboardUpdate', (history: LeaderboardRecord[]) => {
      setLeaderboard(history);
    });

    socket.on('leftRoomSuccess', () => {
      setGameState(null);
      setIsJoined(false);
      localStorage.removeItem('mansion_session_token');
      localStorage.removeItem('mansion_room_code');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Helper alert flash
  const triggerVisualAlert = (text: string) => {
    setAlertText(text);
    setTimeout(() => {
      setAlertText(prev => (prev === text ? null : prev));
    }, 4500);
  };

  // Submit Lobby Entrance Information
  const handleJoinMain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current) return;

    const nickname = joinName.trim() || `Panda_${Math.floor(Math.random() * 90) + 10}`;
    localStorage.setItem('mansion_player_name', nickname);
    localStorage.setItem('mansion_char_index', charIndex.toString());

    if (lobbyMode === 'create') {
      socketRef.current.emit('joinGame', {
        name: nickname,
        charIndex,
        isCreating: true,
        maxPlayers,
      });
    } else {
      const formattedCode = roomCode.trim().toUpperCase();
      if (!formattedCode) {
        triggerVisualAlert('Lütfen 4 haneli oda kodunu girin!');
        return;
      }
      localStorage.setItem('mansion_room_code', formattedCode);
      socketRef.current.emit('joinGame', {
        name: nickname,
        charIndex,
        roomCode: formattedCode,
      });
    }
  };

  // Client Spatial movement
  const handlePlayerMove = (x: number, y: number) => {
    if (socketRef.current) {
      socketRef.current.emit('movePlayer', { x, y });
    }
  };

  // Placing Confetti trap trigger
  const handlePlacePlayerTrap = (x: number, y: number) => {
    if (socketRef.current) {
      socketRef.current.emit('placeTrap', { x, y });
    }
  };

  // Tripping Confetti trap
  const handleTripTrapId = (trapId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('triggerTripTrap', { trapId });
    }
  };

  // Tagger tags Detective
  const handleTagPlayerId = (targetId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('tagPlayer', { targetPlayerId: targetId });
    }
  };

  // Detective guesses the Tagger
  const handleGuessTagger = (targetId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('guessTagger', { targetPlayerId: targetId });
    }
  };

  // Golden bell meeting initiation
  const handleStartMeetingWithSpot = (reportedPlayerId: string | null) => {
    if (socketRef.current) {
      socketRef.current.emit('startMeeting', { reportedPlayerId });
    }
  };

  // Voting submitted
  const handleVotingSubmission = (vote: string) => {
    if (socketRef.current) {
      socketRef.current.emit('submitVote', { vote });
    }
  };

  // Sending discussion message
  const handleSendChatMessageText = (message: string) => {
    if (socketRef.current) {
      socketRef.current.emit('sendChatMessage', { message });
    }
  };

  // Minigame single task progress update
  const handleTaskProgressIncrement = (taskId: string, increment: number) => {
    if (socketRef.current) {
      socketRef.current.emit('compTaskProgress', { taskId, increment });
    }
  };

  // Sabotage task progress (Tagger cancels task secretly)
  const handleSabotageTask = (taskId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('sabotageTask', { taskId });
    }
  };

  // Leave active room/mansion
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom');
    }
    setGameState(null);
    setIsJoined(false);
    localStorage.removeItem('mansion_session_token');
    localStorage.removeItem('mansion_room_code');
  };

  // Re-start or reset lobby of the game
  const handleRestartNewGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('restartGame');
      setActiveTask(null);
    }
  };

  // Fill empty slots up to capacity with Bots (Bulk action)
  const handleFillBotsBulk = () => {
    if (socketRef.current) {
      socketRef.current.emit('fillBots');
    }
  };

  const handleAddBot = () => {
    if (socketRef.current) {
      socketRef.current.emit('addBot');
    }
  };

  const handleRemoveBot = () => {
    if (socketRef.current) {
      socketRef.current.emit('removeBot');
    }
  };

  const handleForceResetToLobby = () => {
    if (socketRef.current) {
      socketRef.current.emit('forceResetToLobby');
      setActiveTask(null);
    }
  };

  // Compute stats metadata
  const playersOnlineList = gameState ? Object.values(gameState.players) as Player[] : [];
  const localPlayer = gameState?.players[playerId];

  // The Room Host is the first human (non-bot) player listed
  const firstHumanPlayer = playersOnlineList.find(p => !p.isBot);
  const isHost = firstHumanPlayer?.id === playerId;

  return (
    <div id="mansion_app_wrapper" className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative">
      
      {/* Floating Controls Bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Force Reset to Lobby */}
        {isJoined && gameState && (
          <button
            id="mansion_force_reset_btn"
            type="button"
            onClick={handleForceResetToLobby}
            className="bg-red-600 hover:bg-red-500 border border-red-500 text-white p-2 px-3.5 rounded-full transition cursor-pointer select-none flex items-center gap-1.5 text-xs font-bold shadow-xl"
            title="Sıfırla ve Lobiye Dön"
          >
            <RefreshCw size={14} className="animate-pulse" />
            <span>Oyunu Yeniden Başlat</span>
          </button>
        )}

        {/* Floating Sound Toggle */}
        <button
          id="mansion_sound_toggle_btn"
          type="button"
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            setSoundMuted(nextMuted);
          }}
          className="bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-800 hover:border-slate-700/60 p-2 px-3.5 rounded-full text-slate-300 hover:text-white transition cursor-pointer select-none flex items-center gap-2 text-xs font-bold backdrop-blur-md shadow-xl"
          title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          {isMuted ? (
            <>
              <VolumeX size={15} className="text-rose-400" />
              <span className="text-rose-400 font-bold">Muted</span>
            </>
          ) : (
            <>
              <Volume2 size={15} className="text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">Audio On</span>
            </>
          )}
        </button>
      </div>

      {/* Network offline drop warning banner */}
      {!isConnected && (
        <div id="offline_restore_banner" className="bg-red-600/90 text-white text-xs font-bold px-4 py-2 text-center animate-pulse flex items-center justify-center gap-2 z-50">
          <AlertCircle size={14} /> Bağlantı Kesildi! Löbideki durumunuz ve skorunuz korunuyor. Yeniden bağlanmaya çalışılıyor...
        </div>
      )}

      {/* Sweet popup announcer */}
      {alertText && (
        <div id="mansion_pop_announcer" className="fixed top-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-full shadow-2xl border border-indigo-400 z-50 animate-bounce tracking-wide text-center max-w-[90%]">
          {alertText}
        </div>
      )}

      {/* PHASE 1: Lobby Access Setup (Create & Join) */}
      {!isJoined && (
        <div id="entrance_lobby_form" className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative">
            
            {/* Visual Logo */}
            <div className="text-center mb-6">
              <span className="text-5xl inline-block mb-3 animate-bounce">🏰 🐼</span>
              <h1 className="text-3xl font-black text-white tracking-wider uppercase">Kids Mystery Mansion</h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Arkadaşlarınla birlikte gizli dedektifliği oyna! ⭐</p>
            </div>

            {/* Create vs Join Custom Tabs */}
            <div className="grid grid-cols-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setLobbyMode('create')}
                className={`py-2 px-3 text-xs font-bold uppercase rounded-lg transition active:scale-95 cursor-pointer ${
                  lobbyMode === 'create' 
                    ? 'bg-amber-400 text-slate-950 font-black shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏰 Oda Kur
              </button>
              <button
                type="button"
                onClick={() => setLobbyMode('join')}
                className={`py-2 px-3 text-xs font-bold uppercase rounded-lg transition active:scale-95 cursor-pointer ${
                  lobbyMode === 'join' 
                    ? 'bg-amber-400 text-slate-950 font-black shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔑 Odaya Katıl
              </button>
            </div>

            <form onSubmit={handleJoinMain} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest font-bold text-amber-300">İsminiz (Nickname)</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="join_name_field"
                    type="text"
                    required
                    maxLength={14}
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="E.g. FriendlyPanda"
                    className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              {/* Character Animal Selector */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest font-bold text-amber-300 block">Karakterini Seç</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHARACTER_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      id={`char_selector_btn_${idx}`}
                      type="button"
                      onClick={() => setCharIndex(idx)}
                      className={`p-2.5 rounded-xl text-[11px] font-bold border transition text-center select-none cursor-pointer transform active:scale-95 ${
                        charIndex === idx 
                          ? 'bg-amber-400 text-slate-950 border-amber-305 scale-102 font-black shadow' 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{emoji.split(' ')[0]}</div>
                      <div>{emoji.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamically Styled parameters based on tab */}
              {lobbyMode === 'create' ? (
                /* Max Players selector for Create Room */
                <div className="space-y-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-850">
                  <div className="flex justify-between items-center">
                    <label className="text-xs uppercase tracking-widest font-bold text-amber-300">Oda Sınırı (Kişi Sayısı)</label>
                    <span className="text-sm font-mono font-black text-amber-400">{maxPlayers} Oyuncu</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[4, 5, 6, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxPlayers(num)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer ${
                          maxPlayers === num 
                            ? 'bg-amber-400 border-amber-400 text-slate-950 font-black' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Room Code parameter for Join Room */
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-bold text-amber-300">4 Haneli Oda Kodu</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="E.g. G3Y9"
                    className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-400 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black uppercase tracking-widest text-white placeholder-slate-700 outline-none transition"
                  />
                </div>
              )}

              <button
                id="join_lobby_submit_btn"
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 rounded-xl font-bold tracking-wider uppercase transition shadow shadow-amber-400/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {lobbyMode === 'create' ? 'Odayı Kur ve Giriş Yap' : 'Odaya Katıl'} <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 2: Main Application Router */}
      {isJoined && gameState && (
        <div id="app_lobby_playing_router" className="flex-1 flex flex-col">
          
          {/* LOBBY PHASE */}
          {gameState.phase === 'LOBBY' && (
            <div id="lobby_waiting_room" className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-xl bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <span className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      Mansion Lobi Açık
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">Lobi Odası</h2>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      id="lobby_leave_btn"
                      type="button"
                      onClick={handleLeaveRoom}
                      className="bg-red-950/60 hover:bg-red-900/70 text-red-200 border border-red-500/25 font-bold py-1.5 px-3 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center gap-1 leading-none"
                    >
                      🚪 Çık
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">KİŞİ SAYISI</span>
                      <span className="text-xl font-mono font-bold text-amber-400 leading-none">{playersOnlineList.length} / {gameState.maxPlayers}</span>
                    </div>
                  </div>
                </div>

                {/* Spectacular Big Room Code display */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center mb-5">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">ODA KATILIM KODU</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-mono font-black text-amber-400 tracking-widest">{gameState.roomCode}</span>
                    <button
                      type="button"
                      title="Kodu Kopyala"
                      onClick={() => {
                        navigator.clipboard.writeText(gameState.roomCode);
                        triggerVisualAlert('Oda kodu kopyalandı! Arkadaşlarına gönder 👍');
                      }}
                      className="p-1.5 px-3 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-mono transition active:scale-95 cursor-pointer ml-1"
                    >
                      <Copy size={13} className="inline mr-1" /> KOPYALA
                    </button>
                  </div>
                </div>

                {/* Display Connected Guests cards */}
                <div className="space-y-2 mb-6 max-h-[220px] overflow-y-auto pr-1">
                  {playersOnlineList.map((player, idx) => {
                    const isSelf = player.id === playerId;
                    return (
                      <div 
                        key={player.id} 
                        className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                          isSelf ? 'bg-indigo-950/20 border-indigo-500/45' : 'bg-slate-950 border-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold font-mono border border-slate-800"
                            style={{ backgroundColor: player.color }}
                          >
                            {CHARACTER_EMOJIS[player.charIndex]?.split(' ')[0] || '🐼'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                              {player.isBot ? `🤖 ${player.name}` : player.name}
                              {player.isBot && <span className="text-[8px] text-teal-400 bg-teal-950 border border-teal-900 px-1 py-0.2 rounded font-mono">BOT</span>}
                              {isSelf && <span className="text-[8px] text-indigo-400 bg-indigo-950 border border-indigo-800 px-1 py-0.2 rounded font-mono">SEN</span>}
                              {!player.isBot && idx === 0 && <span className="text-[8px] text-amber-400 bg-amber-950 border border-amber-900 px-1 py-0.2 rounded font-mono">KURUCU</span>}
                            </div>
                            <span className="text-slate-500 text-[11px] font-semibold">Gizemli konağı keşfetmeye hazır</span>
                          </div>
                        </div>

                        <span className="text-xs text-slate-500 font-bold font-mono">Sıra {idx + 1}</span>
                      </div>
                    );
                  })}

                  {/* Empty Slot templates */}
                  {Array.from({ length: Math.max(0, gameState.maxPlayers - playersOnlineList.length) }).map((_, emptyIdx) => (
                    <div key={emptyIdx} className="border border-dashed border-slate-850 p-3 rounded-2xl flex items-center justify-center text-xs text-slate-600 font-bold">
                       Boş Yuva - Yeni dedektif bekleniyor... 🛜
                    </div>
                  ))}
                </div>

                {/* Host Control panel */}
                <div className="border-t border-slate-800 pt-5 flex flex-col gap-3">
                  {isHost ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Fill Remaining with Bots (Bulk fill) */}
                        <button
                          id="bulk_fill_bots_btn"
                          type="button"
                          onClick={handleFillBotsBulk}
                          disabled={playersOnlineList.length >= gameState.maxPlayers}
                          className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          title="Lobi boşluklarını hızlıca botlar ile doldurur"
                        >
                          🤖 Eksikleri Botla Doldur
                        </button>
                        
                        <div className="flex gap-1">
                          <button
                            id="host_add_bot_btn"
                            type="button"
                            onClick={handleAddBot}
                            disabled={playersOnlineList.length >= gameState.maxPlayers}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                            title="Tek bir bot ekle"
                          >
                            + Bot
                          </button>
                          <button
                            id="host_remove_bot_btn"
                            type="button"
                            onClick={handleRemoveBot}
                            disabled={!playersOnlineList.some(p => p.isBot)}
                            className="bg-red-650 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                            title="Son eklenen botu uzaklaştır"
                          >
                            - Bot
                          </button>
                        </div>
                      </div>

                      <button
                        id="host_start_match_btn"
                        type="button"
                        onClick={handleRestartNewGame}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow shadow-amber-400/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                         Oyunu Başlat! (Eksikler Botla Dolar) 🚀
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 text-center text-xs text-slate-500 font-bold animate-pulse">
                      Kurucunun oyunu başlatması bekleniyor... Lobi kodunu yukarıdan kopyalayarak arkadaşlarınızı davet edebilirsiniz.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ACTIVE GAMEPLAY PHASE */}
          {gameState.phase === 'PLAYING' && (
            <div id="active_play_container" className="flex-1 flex flex-col">
              <GameBoard
                state={gameState}
                localPlayerId={playerId}
                onMove={handlePlayerMove}
                onPlaceTrap={handlePlacePlayerTrap}
                onTripTrap={handleTripTrapId}
                onTag={handleTagPlayerId}
                onGuessTagger={handleGuessTagger}
                onStartMeeting={handleStartMeetingWithSpot}
                onInteractTask={(task) => setActiveTask(task)}
                onSabotageTask={handleSabotageTask}
                onLeaveRoom={handleLeaveRoom}
              />

              {/* Active task puzzle overlays */}
              {activeTask && (
                <TaskMinigame
                  taskId={activeTask.id}
                  taskName={activeTask.name}
                  taskType={activeTask.type}
                  onProgress={(inc) => handleTaskProgressIncrement(activeTask.id, inc)}
                  onClose={() => setActiveTask(null)}
                />
              )}
            </div>
          )}

          {/* DEDUCTION MEETING PHASE */}
          {gameState.phase === 'MEETING' && gameState.meeting && (
            <MansionMeeting
              meeting={gameState.meeting}
              players={gameState.players}
              localPlayerId={playerId}
              onVote={handleVotingSubmission}
              onSendChat={handleSendChatMessageText}
            />
          )}

          {/* GAMEOVER SCOREBOARD PHASE */}
          {gameState.phase === 'GAMEOVER' && (
            <Scoreboard
              state={gameState}
              history={leaderboard}
              localPlayerId={playerId}
              onRestart={handleRestartNewGame}
            />
          )}

        </div>
      )}

    </div>
  );
}
