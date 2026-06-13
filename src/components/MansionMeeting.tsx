import React, { useState, useRef, useEffect } from 'react';
import { Player, MeetingState, ChatMessage } from '../types';
import { MessageSquare, Vote, AlertTriangle, ShieldAlert, CheckCircle, Send } from 'lucide-react';

interface MansionMeetingProps {
  meeting: MeetingState;
  players: Record<string, Player>;
  localPlayerId: string;
  onVote: (vote: string) => void;
  onSendChat: (text: string) => void;
}

export default function MansionMeeting({ meeting, players, localPlayerId, onVote, onSendChat }: MansionMeetingProps) {
  const [typedMsg, setTypedMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localPlayer = players[localPlayerId];

  // Kid-friendly preset templates (Turkish / English adapted for universal gameplay)
  const CHAT_PRESETS = [
    'I was in the Library! 📚',
    'I was in the Kitchen! 🍳',
    'I was busy watering the Flowers! 🌸',
    'I saw a Confetti Trap! 🎉',
    'Someone looks suspicious! 👀',
    'Let\'s skip the vote this round. ⏳',
    'It wasn\'t me, I am friendly! 😸',
  ];

  // Auto-scroll chat window to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meeting.chatMessages]);

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedMsg.trim()) {
      onSendChat(typedMsg.substring(0, 80));
      setTypedMsg('');
    }
  };

  const hasVoted = meeting.votes[localPlayerId] && meeting.votes[localPlayerId] !== 'none';
  const isGhost = localPlayer?.isEliminated;

  // Compute current tally info for UI rendering
  const voteTallies: Record<string, number> = {};
  let skipTally = 0;
  for (const votedFor of Object.values(meeting.votes)) {
    if (votedFor === 'skip') skipTally++;
    else if (votedFor !== 'none') {
      voteTallies[votedFor] = (voteTallies[votedFor] || 0) + 1;
    }
  }

  return (
    <div id="mansion_meeting_overlay" className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border-4 border-purple-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[75vh]">
        
        {/* Left Side: Players List & Voting */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="bg-purple-600/30 border border-purple-500/50 text-purple-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                  <ShieldAlert size={14} /> Mansion Deduction Panel
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">Deduction Meeting</h2>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl flex flex-col items-center">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Remaining</span>
                <span className="text-2xl font-mono font-bold text-amber-400 animate-pulse">{meeting.timer}s</span>
              </div>
            </div>

            {/* Reported player box */}
            {meeting.reportedPlayerId ? (
              <div className="bg-red-950/50 border border-red-800/40 rounded-2xl p-3 flex items-center gap-3 mb-6">
                <div className="text-3xl">🛎️</div>
                <div>
                  <div className="text-red-400 font-bold text-sm">TAG SPOT REPORTED</div>
                  <div className="text-xs text-slate-300">
                    <span className="text-amber-400 font-bold">{players[meeting.reporterId || '']?.name || 'Someone'}</span> reported the tag location of <span className="text-red-400 font-bold">{players[meeting.reportedPlayerId || '']?.name || 'a guest'}</span>!
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-purple-950/35 border border-purple-800/40 rounded-2xl p-3 flex items-center gap-3 mb-6">
                <div className="text-3xl">🔔</div>
                <div>
                  <div className="text-purple-300 font-bold text-sm">GOLDEN BELL RUNG</div>
                  <div className="text-xs text-slate-300">
                    <span className="text-amber-400 font-bold">{players[meeting.reporterId || '']?.name || 'Someone'}</span> gathered everyone for a friendly chat!
                  </div>
                </div>
              </div>
            )}

            {/* Players in table */}
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Mansion Guests Status</p>
            <div className="space-y-2 mb-6">
              {Object.values(players).map((player) => {
                const isPlayerGhost = player.isEliminated;
                const playerVoteState = meeting.votes[player.id];
                const didVote = playerVoteState && playerVoteState !== 'none';
                const isSelf = player.id === localPlayerId;

                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isSelf ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar preview */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold select-none border-2"
                        style={{ backgroundColor: player.color, borderColor: isSelf ? '#818CF8' : 'transparent' }}
                      >
                        {isPlayerGhost ? '👻' : '🐱'}
                      </div>
                      
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {player.isBot ? `🤖 ${player.name}` : player.name}
                          {player.isBot && <span className="text-[10px] text-teal-400 bg-teal-950 border border-teal-850 px-1.5 py-0.5 rounded-md font-mono">BOT</span>}
                          {isSelf && <span className="text-[10px] text-indigo-400 bg-indigo-950 border border-indigo-800 px-1.5 py-0.5 rounded-md font-mono">YOU</span>}
                          {isPlayerGhost && <span className="text-[10px] text-purple-400 bg-purple-950 border border-purple-900 px-1.5 py-0.5 rounded-md">GHOST</span>}
                          {!player.isBot && !player.isConnected && <span className="text-[10px] text-red-500 bg-red-950 border border-red-900 px-1.5 py-0.5 rounded-md animate-pulse">OFFLINE</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-semibold">
                          Score: <span className="text-emerald-400">{player.score}</span>
                        </div>
                      </div>
                    </div>

                    {/* Voting status indicators */}
                    <div className="flex items-center gap-2">
                      {isPlayerGhost ? (
                        <span className="text-xs text-slate-500 font-semibold italic">Can't Vote</span>
                      ) : didVote ? (
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-900/30">
                          <CheckCircle size={12} /> Voted
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold flex items-center gap-1 bg-amber-950/40 px-2 py-1 rounded-full border border-amber-900/30 animate-pulse">
                          Thinking...
                        </span>
                      )}

                      {/* Tally results reveal if concluded */}
                      {meeting.isConcluded && (
                        <div className="text-xs bg-purple-950 border border-purple-800 px-2.5 py-1 rounded-xl text-purple-300 font-bold font-mono">
                          {voteTallies[player.id] || 0} votes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voting Interactive Section */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Vote size={16} /> Cast Your Deduction Vote
            </h4>

            {isGhost ? (
              <p className="text-xs text-slate-500 italic bg-slate-900 p-3 rounded-xl">
                As a friendly ghost, you can float and complete tasks but you cannot vote in discussions. Watch your friends deduce! 😊
              </p>
            ) : hasVoted ? (
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-900/50 p-3 rounded-xl flex items-center gap-2">
                <CheckCircle size={14} /> You have successfully submitted your vote! Wait for others to finish.
              </p>
            ) : meeting.isConcluded ? (
              <p className="text-xs text-slate-400 italic bg-slate-900 p-3 rounded-xl">
                The voting phase is over! Calculating results...
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(players)
                    .filter(p => p.id !== localPlayerId && !p.isEliminated && p.isConnected)
                    .map((p) => (
                      <button
                        key={p.id}
                        id={`vote_guest_${p.id}`}
                        onClick={() => onVote(p.id)}
                        className="bg-slate-800 hover:bg-indigo-900 border border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white p-3 rounded-xl text-xs font-bold text-left transition transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Vote: {p.name}
                      </button>
                    ))}
                </div>
                
                <button
                  id="vote_skip_btn"
                  onClick={() => onVote('skip')}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white p-2.5 rounded-xl text-xs font-bold transition mt-1"
                >
                  Skip Voting / I Am Not Sure
                </button>
              </div>
            )}

            {meeting.isConcluded && (
              <div className="mt-3 text-xs text-center text-purple-300 font-mono">
                Skipped Votes: {skipTally}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat System */}
        <div className="md:w-[420px] bg-slate-950 flex flex-col h-1/2 md:h-full">
          {/* Section Header */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
            <MessageSquare size={18} className="text-purple-400" />
            <h3 className="font-bold text-white text-sm">Kid-Safe Live Chat</h3>
          </div>

          {/* Quick Preset Buttons */}
          <div className="p-3 border-b border-slate-800 bg-slate-950 max-h-40 overflow-y-auto">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Quick Express Chat</div>
            <div className="flex flex-wrap gap-1.5">
              {CHAT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`chat_preset_${idx}`}
                  onClick={() => onSendChat(preset)}
                  disabled={meeting.isConcluded}
                  className="bg-slate-800 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-800 text-slate-300 hover:text-purple-200 px-2.5 py-1.5 rounded-full text-[10.5px] transition font-medium cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[150px] max-h-[250px] md:max-h-none">
            {meeting.chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-600 h-full py-8 text-center">
                <span className="text-2xl mb-1">💬</span>
                <p className="text-xs">Quiet in the mansion. Tap a template above to speak or write a safe message!</p>
              </div>
            ) : (
              meeting.chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.isSystem ? 'items-center text-center' : 'items-start'}`}
                >
                  {msg.isSystem ? (
                    <div className="bg-purple-950/40 border border-purple-900/30 px-3 py-1.5 rounded-2xl max-w-[90%] my-1 text-center">
                      <span className="text-[10px] text-purple-400 font-mono block">SYSTEM ALERT</span>
                      <p className="text-xs text-purple-200">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="max-w-[90%] bg-slate-900 rounded-2xl px-3 py-2 border border-slate-800">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: msg.senderColor }}
                        />
                        <span className="text-[10.5px] font-bold text-slate-300">{msg.senderName}</span>
                      </div>
                      <p className="text-xs text-white break-words pr-2">{msg.text}</p>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Custom typed safe chat input */}
          <form 
            onSubmit={handleSendTyped} 
            className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2"
          >
            <input
              id="mansion_chat_input"
              type="text"
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              disabled={meeting.isConcluded}
              placeholder="Type safe text..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 transition disabled:opacity-50"
            />
            <button
              id="mansion_chat_submit"
              type="submit"
              disabled={meeting.isConcluded || !typedMsg.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
