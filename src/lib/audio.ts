export const playNotificationSound = (type: string, masterVolume: number = 1, durationMultiplier: number = 1) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  const playTone = (freq: number, type: OscillatorType, time: number, duration: number, vol: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + time * durationMultiplier);
    
    // Apply master volume to the base volume (multiply by 10 for higher max volume)
    const finalVol = vol * masterVolume * 10;
    
    gain.gain.setValueAtTime(finalVol, ctx.currentTime + time * durationMultiplier);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (time + duration) * durationMultiplier);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + time * durationMultiplier);
    osc.stop(ctx.currentTime + (time + duration) * durationMultiplier);
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
