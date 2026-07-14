let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playBubblePop() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.08);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

export function playChimeSuccess() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.08, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

export function playToolSelect() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.06);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.06);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}
