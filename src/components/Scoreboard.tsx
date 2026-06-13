import React from 'react';
import { GameState, LeaderboardRecord, Player } from '../types';
import { Trophy, Award, BookOpen, Star, RefreshCw, Calendar, Users, Target } from 'lucide-react';

interface ScoreboardProps {
  state: GameState;
  history: LeaderboardRecord[];
  localPlayerId: string;
  onRestart: () => void;
}

export default function Scoreboard({ state, history, localPlayerId, onRestart }: ScoreboardProps) {
  const isWinnersDets = state.outcome?.startsWith('DETECTIVES_WIN');
  const isWinnersTagger = state.outcome?.startsWith('TAGGER_WIN');
  
  // Find lobby host (the first player in dictionary or alphabetically)
  const playerIds = Object.keys(state.players);
  const isHost = playerIds[0] === localPlayerId;

  return (
    <div id="scoreboard_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 justify-center items-center">
      <div id="scoreboard_wrap" className="w-full max-w-4xl bg-slate-900 border-4 border-amber-400 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 animate-fade-in">
        
        {/* Victory Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-400/10 border border-amber-400/40 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Trophy size={48} className="text-amber-400" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-wider uppercase">
            {isWinnersDets && <span className="text-emerald-400">DETECTIVES WIN! ⭐</span>}
            {isWinnersTagger && <span className="text-red-400">TAGGER WINS! 🎉</span>}
          </h1>

          <p className="text-slate-400 text-sm md:text-base mt-2 max-w-md mx-auto">
            {state.outcome === 'DETECTIVES_WIN_TASKS' && 'Deductors finished all their chores and garden repairs successfully! Good job!'}
            {state.outcome === 'DETECTIVES_WIN_VOTE' && 'The group successfully voted out the Confetti Tagger! Perfect deduction!'}
            {state.outcome === 'TAGGER_WIN_ELIMINATIONS' && 'The Tagger covered everyone in shiny confetti! Super job!'}
            {state.outcome === 'TAGGER_WIN_TIME' && 'Time ran out! The Tagger kept the mansion safe and confetti-filled.'}
          </p>
        </div>

        {/* Current Match Player Statistics Grid */}
        <h3 className="text-xs uppercase font-bold text-amber-200 tracking-widest pl-1 mb-3">Mansion Match Recap</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Object.values(state.players).map((player) => {
            const isSelf = player.id === localPlayerId;
            return (
              <div 
                key={player.id} 
                className={`bg-slate-950/60 border-2 rounded-2xl p-4 flex flex-col justify-between transition ${
                  isSelf ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Portrait Avatar */}
                  <div className="flex justify-between items-start mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl font-bold border"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.role === 'TAGGER' ? '🐱' : '🐼'}
                    </div>
                    
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      player.role === 'TAGGER' 
                        ? 'bg-red-950 text-red-400 border border-red-900/40' 
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                    }`}>
                      {player.role}
                    </span>
                  </div>

                  <h4 className="font-bold text-base truncate flex items-center gap-1">
                    {player.name}
                    {isSelf && <span className="text-[9px] text-indigo-400 bg-indigo-950 border border-indigo-800 px-1 py-0.2 rounded">YOU</span>}
                  </h4>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {player.score} <span className="text-xs text-slate-500">pts</span>
                  </div>
                </div>

                {/* Individual mini metrics list */}
                <div className="border-t border-slate-900 mt-4 pt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Task Score:</span>
                    <span className="font-semibold text-slate-200">{player.tasksCompleted} done</span>
                  </div>
                  {player.role === 'TAGGER' ? (
                    <div className="flex justify-between">
                      <span>Friendly Tags:</span>
                      <span className="font-semibold text-slate-200">{player.tagsMade} tags</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Trap dodged:</span>
                      <span className="font-semibold text-slate-200">{player.trapsDodged} times</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Deduction accuracy:</span>
                    <span className="font-semibold text-slate-200">{player.correctVotes} votes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Persistence High Score Database Board (Redis source) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="text-purple-400" size={16} />
            <h3 className="text-xs uppercase font-bold text-purple-300 tracking-widest">Historical Mansion Legends (Durable Redis Record)</h3>
          </div>

          <div className="bg-slate-950/85 border border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto mb-8">
            {history.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No match records archived yet. Be the first to start the tradition!
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                    <th className="p-3">Guest Name</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3">Score Achieved</th>
                    <th className="p-3">Tasks</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {history.slice(0).reverse().map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <span className="text-slate-500">#{history.length - i}</span> {rec.name}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          rec.role === 'TAGGER' ? 'text-red-400 bg-red-950/40' : 'text-emerald-400 bg-emerald-950/40'
                        }`}>
                          {rec.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">{rec.score}</td>
                      <td className="p-3 text-slate-400 font-mono">{rec.tasksDone} done</td>
                      <td className="p-3 text-slate-400 font-mono">{rec.tagsMade} tags</td>
                      <td className="p-3 text-right text-slate-500 font-mono">{rec.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-6">
          <div className="text-xs text-slate-500 font-medium">
            * Connection dropped players are preserved. Reconnect simply by keeping browser open!
          </div>

          {isHost ? (
            <button
              id="restart_game_host_btn"
              onClick={onRestart}
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 px-8 py-3 rounded-2xl font-bold tracking-wide transition transform active:scale-95 duration-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={16} /> Host: Restart Match (Swap Roles!)
            </button>
          ) : (
            <div className="bg-slate-950 px-5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              Waiting for the host to restart lobby...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
