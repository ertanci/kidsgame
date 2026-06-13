// Sound synthesizer utility using the browser's Web Audio API
// High performance, zero latency, and zero dependency. Supports client-side muting.

let isMutedGlobal = false;

// Attempt to load initial state from localStorage safely
try {
  const savedMute = localStorage.getItem('mansion_sound_muted');
  if (savedMute === 'true') {
    isMutedGlobal = true;
  }
} catch (e) {
  // Gracefulness in case localStorage is locked
}

export function setSoundMuted(muted: boolean) {
  isMutedGlobal = muted;
  try {
    localStorage.setItem('mansion_sound_muted', muted ? 'true' : 'false');
  } catch (e) {
    // Graceful fallback
  }
}

export function getSoundMuted(): boolean {
  return isMutedGlobal;
}

/**
 * Plays a beautiful, soft, resonant golden chime chord (perfect for a team meeting alert).
 */
export function playChime() {
  if (isMutedGlobal) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    
    // Resume context if suspended (browser security policies)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Warm chime chord: C5, E5, G5, C6 (C Major)
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Alternate wave types to yield a richer chime timbre
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      // Delay each note slightly (strum effect)
      const delay = idx * 0.08;
      
      gain.gain.setValueAtTime(0, now);
      // Soft fast attack
      gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.03);
      // Beautiful exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      // Stop and clean up resources automatically
      osc.stop(now + delay + 1.6);
    });
  } catch (err) {
    console.warn('Native Web Audio API chime error:', err);
  }
}

/**
 * Plays a refreshing, bubbly pop sound (perfect for a trap or confetti trip).
 */
export function playTrapBubble() {
  if (isMutedGlobal) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Create two subtle high-pitch bouncy bubble pops in rapid sequence
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      
      // Rapid upward frequency sweep creates a bouncy bubble element
      const startFreq = 450 + idxOffset(i) * 50;
      const endFreq = 950 + idxOffset(i) * 100;
      
      osc.frequency.setValueAtTime(startFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.07);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.14);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.18);
    }
  } catch (err) {
    console.warn('Native Web Audio API bubble pop error:', err);
  }
}

// Quick deterministic random-ish offset helper for bubble notes
function idxOffset(i: number): number {
  return i === 0 ? 1 : 2.5;
}
