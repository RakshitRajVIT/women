import React from 'react';
import type { ThreatAnalysisResult } from '../services/aiThreatEngine';
import { ShieldCheck, ShieldAlert, Clock, MapPin, Mic, Activity, Battery, CheckCircle2, ChevronRight } from 'lucide-react';

interface AiThreatGaugeProps {
  threatResult: ThreatAnalysisResult;
}

export const AiThreatGauge: React.FC<AiThreatGaugeProps> = ({ threatResult }) => {
  const { score, level, factors, explanation, recommendations } = threatResult;

  const getGaugeColor = () => {
    switch (level) {
      case 'CRITICAL':
        return 'from-rose-600 to-red-500 text-rose-400 border-rose-500/50';
      case 'HIGH':
        return 'from-amber-600 to-orange-500 text-amber-400 border-amber-500/50';
      case 'MEDIUM':
        return 'from-yellow-600 to-amber-500 text-yellow-400 border-yellow-500/50';
      default:
        return 'from-emerald-600 to-teal-500 text-emerald-400 border-emerald-500/50';
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Top Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-800 text-rose-400 border border-slate-700">
            {level === 'CRITICAL' || level === 'HIGH' ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Threat Prediction Model</h3>
            <p className="text-xs text-slate-400">Autonomous surroundings risk computation</p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase border bg-slate-950 ${getGaugeColor()}`}>
          {level} RISK ({score}%)
        </div>
      </div>

      {/* Main Visual Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Safe (0%)</span>
          <span>Caution (50%)</span>
          <span>Danger (100%)</span>
        </div>
        <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getGaugeColor()} transition-all duration-700`}
            style={{ width: `${Math.max(5, score)}%` }}
          />
        </div>
      </div>

      {/* Factor Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Time
          </span>
          <span className="font-bold text-slate-200 mt-1">{factors.timeRisk}% Risk</span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location
          </span>
          <span className="font-bold text-slate-200 mt-1">{factors.locationRisk}% Risk</span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-slate-400" /> Audio
          </span>
          <span className="font-bold text-slate-200 mt-1">{factors.audioRisk}% Risk</span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-slate-400" /> Motion
          </span>
          <span className="font-bold text-slate-200 mt-1">{factors.motionRisk}% Risk</span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-slate-400 flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-slate-400" /> Device
          </span>
          <span className="font-bold text-slate-200 mt-1">{factors.deviceIsolationRisk}% Risk</span>
        </div>
      </div>

      {/* AI Explanation & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Explanation */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" /> AI Risk Reasoning
          </h4>
          <ul className="space-y-1.5">
            {explanation.map((item, idx) => (
              <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-rose-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AI Action Recommendations
          </h4>
          <ul className="space-y-1.5">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-emerald-300/90 flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
