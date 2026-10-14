// Web Audio API Synthesizer for Emergency SOS Structural Hazard Alarms
let audioCtx: AudioContext | null = null;
let isMuted = false;
let activeOscillators: OscillatorNode[] = [];
let alarmInterval: number | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function initAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
  if (muted) {
    stopHazardAlarm();
  }
}

export function isAudioMuted(): boolean {
  return isMuted;
}

/**
 * Plays a single two-tone emergency dispatch chime
 */
export function playChimeTone(freq = 880, duration = 0.25): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

/**
 * Triggers pulsating emergency siren for active CRITICAL structural hazards
 */
export function playHazardAlarm(): void {
  if (isMuted) return;
  stopHazardAlarm();

  // Play immediately
  playChimeTone(880, 0.22);
  setTimeout(() => playChimeTone(660, 0.28), 220);

  // Repeat every 2.4 seconds while alert is unacknowledged
  alarmInterval = window.setInterval(() => {
    if (isMuted) return;
    playChimeTone(880, 0.22);
    setTimeout(() => playChimeTone(660, 0.28), 220);
  }, 2400);
}

/**
 * Silence the active hazard alarm
 */
export function stopHazardAlarm(): void {
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  }
  activeOscillators = [];
}
