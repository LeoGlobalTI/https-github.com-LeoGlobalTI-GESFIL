export const playNotificationSound = (type: string) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  const playTone = (freq: number, type: OscillatorType, time: number, duration: number, vol: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + time);
    osc.stop(ctx.currentTime + time + duration);
  };

  if (type === 'campana') {
    playTone(880, 'sine', 0, 0.5, 0.2);
  } else if (type === 'timbre') {
    playTone(659.25, 'sine', 0, 0.4, 0.2); // E5
    playTone(523.25, 'sine', 0.4, 0.6, 0.2); // C5
  } else if (type === 'alerta') {
    playTone(1000, 'square', 0, 0.1, 0.05);
    playTone(1000, 'square', 0.2, 0.1, 0.05);
    playTone(1000, 'square', 0.4, 0.1, 0.05);
  }
};
