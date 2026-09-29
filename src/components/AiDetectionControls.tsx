import React, { useState, useEffect } from 'react';
import { aiDangerDetector } from '../services/aiDangerDetector';
import { Mic, Activity, Zap, Volume2, Sparkles } from 'lucide-react';

interface AiDetectionControlsProps {
  onSimulateTrigger: (type: 'VOICE' | 'MOTION' | 'LOCATION' | 'MANUAL', detail: string) => void;
}

export const AiDetectionControls: React.FC<AiDetectionControlsProps> = ({ onSimulateTrigger }) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);

  useEffect(() => {
    const unsubDb = aiDangerDetector.onDecibelChange((db) => {
      setCurrentDb(db);
    });
    return () => unsubDb();
  }, []);

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      aiDangerDetector.stopVoiceDetection();
      setIsVoiceActive(false);
    } else {
      const success = await aiDangerDetector.startVoiceDetection();
      setIsVoiceActive(success);
    }
  };

  const getDbColor = (db: number) => {
    if (db > 80) return 'text-rose-400 font-bold animate-pulse';
    if (db > 65) return 'text-amber-400 font-bold';
    return 'text-emerald-400';
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 text-rose-400 border border-slate-700">
            <Sparkles className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Autonomous AI Danger Detector</h3>
            <p className="text-xs text-slate-400">Continuous voice keyword, scream & motion shake listener</p>
          </div>
        </div>

        {/* Voice AI Master Toggle */}
        <button
          onClick={handleToggleVoice}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
            isVoiceActive
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          <Mic className={`w-4 h-4 ${isVoiceActive ? 'animate-pulse text-emerald-400' : ''}`} />
          <span>{isVoiceActive ? 'Voice AI Listening (Active)' : 'Enable Voice AI'}</span>
        </button>
      </div>

      {/* Sensor Status Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Voice Keyword Monitor */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-rose-400" /> Voice Keywords
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">"Help", "Stop"</span>
          </div>
          <div className="text-xs text-slate-300 font-medium">
            {isVoiceActive ? 'Listening for distress phrases...' : 'Voice spotter paused'}
          </div>
        </div>

        {/* Audio Decibel Screamer Meter */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Scream/Volume Meter
            </span>
            <span className={`text-xs font-mono ${getDbColor(currentDb)}`}>{currentDb} dB</span>
          </div>
          {/* Mini Bar */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${currentDb > 80 ? 'bg-rose-500' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(100, currentDb)}%` }}
            />
          </div>
        </div>

        {/* Motion Shake Detector */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Motion Sensor
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
          </div>
          <div className="text-xs text-slate-300 font-medium">
            3x Shake / Freefall Trigger enabled
          </div>
        </div>
      </div>

      {/* Interactive Simulator Panel for Quick Verification */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Test & Simulate AI Sensors:
          </span>
          <span className="text-[10px] text-slate-500">Useful for desktop browser testing</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => onSimulateTrigger('VOICE', 'Simulated Voice Distress Keyword: "HELP!"')}
            className="p-2 bg-slate-900 hover:bg-rose-950 text-rose-300 border border-slate-800 hover:border-rose-500/40 rounded-xl transition-all font-medium text-left"
          >
            🎤 Voice Keyword ("HELP!")
          </button>

          <button
            onClick={() => onSimulateTrigger('MOTION', 'Simulated 3x Panic Accelerometer Shake')}
            className="p-2 bg-slate-900 hover:bg-amber-950 text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all font-medium text-left"
          >
            ⚡ Panic Shake (3x)
          </button>

          <button
            onClick={() => onSimulateTrigger('LOCATION', 'Simulated Entrance into Unlit High-Risk Zone')}
            className="p-2 bg-slate-900 hover:bg-sky-950 text-sky-300 border border-slate-800 hover:border-sky-500/40 rounded-xl transition-all font-medium text-left"
          >
            📍 Danger Zone Entry
          </button>

          <button
            onClick={() => onSimulateTrigger('MANUAL', 'Simulated AI Threat Score Spike (88%)')}
            className="p-2 bg-slate-900 hover:bg-purple-950 text-purple-300 border border-slate-800 hover:border-purple-500/40 rounded-xl transition-all font-medium text-left"
          >
            🤖 Threat Score Spike
          </button>
        </div>
      </div>
    </div>
  );
};
