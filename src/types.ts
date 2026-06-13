export type GamePhase = 'LOBBY' | 'PLAYING' | 'MEETING' | 'GAMEOVER';

export type PlayerRole = 'DETECTIVE' | 'TAGGER' | 'INNOCENT';

export interface Player {
  id: string; // unique socket id or restored session id
  sessionToken: string; // permanent browser session token
  name: string;
  charIndex: number;
  role: PlayerRole;
  x: number;
  y: number;
  color: string;
  isEliminated: boolean;
  score: number;
  tasksCompleted: number;
  tagsMade: number;
  trapsDodged: number;
  correctVotes: number;
  isConnected: boolean;
  disconnectedAt: number | null;
  isBot?: boolean;
}

export interface Task {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  progress: number; // 0 to 100
  type: 'books' | 'salad' | 'clock' | 'flowers' | 'toybox';
}

export interface ConfettiTrap {
  id: string;
  x: number;
  y: number;
  placedBy: string; // tagger id
}

export interface TagSpot {
  id: string;
  playerName: string;
  color: string;
  x: number;
  y: number;
}

export interface MeetingState {
  reporterId: string | null;
  reportedPlayerId: string | null; // who was reported (or null if meeting called manually)
  votes: Record<string, string>; // voterId -> votedForPlayerId (or 'skip' or 'none')
  votedOutPlayerId: string | null;
  timer: number;
  isConcluded: boolean;
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  text: string;
  isSystem: boolean;
  timestamp: number;
}

export interface LeaderboardRecord {
  name: string;
  role: string;
  score: number;
  tagsMade: number;
  tasksDone: number;
  date: string;
}

export interface GameState {
  phase: GamePhase;
  players: Record<string, Player>;
  tasks: Task[];
  traps: ConfettiTrap[];
  tagSpots: TagSpot[];
  meeting: MeetingState | null;
  taskProgress: number; // 0 to 100 overall
  timer: number; // match timer
  tagCooldown: number; // Tagger tag cooldown in seconds
  bellCooldown: number; // Bell ring cooldown in seconds
  outcome: 'DETECTIVES_WIN_TASKS' | 'DETECTIVES_WIN_VOTE' | 'TAGGER_WIN_ELIMINATIONS' | 'TAGGER_WIN_TIME' | null;
  roomCode: string; // The 4-letter join code
  maxPlayers: number; // Desired room capacity (4 to 10)
}

// Socket communication signatures
export interface ServerToClientEvents {
  stateUpdate: (state: GameState) => void;
  sessionEstablished: (data: { playerId: string; sessionToken: string; state: GameState }) => void;
  trapTripped: (data: { trapId: string; playerName: string }) => void;
  taggedSound: (data: { taggerName: string; taggedName: string }) => void;
  meetingStarted: (data: { reporterName: string; reportedName: string | null }) => void;
  leaderboardUpdate: (history: LeaderboardRecord[]) => void;
}

export interface ClientToServerEvents {
  joinGame: (data: { name: string; charIndex: number; sessionToken?: string }) => void;
  movePlayer: (data: { x: number; y: number }) => void;
  placeTrap: (data: { x: number; y: number }) => void;
  triggerTripTrap: (data: { trapId: string }) => void;
  tagPlayer: (data: { targetPlayerId: string }) => void;
  startMeeting: (data: { reportedPlayerId: string | null }) => void;
  submitVote: (data: { vote: string }) => void;
  sendChatMessage: (data: { message: string }) => void;
  compTaskProgress: (data: { taskId: string; increment: number }) => void;
  restartGame: () => void;
  addBot: () => void;
  removeBot: () => void;
  guessTagger: (data: { targetPlayerId: string }) => void;
  forceResetToLobby: () => void;
}
