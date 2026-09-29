import React, { useState, useEffect } from 'react';
import { PhoneCall, PhoneOff, Volume2, User } from 'lucide-react';
import { audioAlertService } from '../services/audioAlertService';

interface FakeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FakeCallModal: React.FC<FakeCallModalProps> = ({ isOpen, onClose }) => {
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>('RINGING');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallState('RINGING');
      setSeconds(0);
      return;
    }

    if (callState === 'RINGING') {
      // Ringtone feedback sound
      const interval = setInterval(() => {
        audioAlertService.playCountdownBeep(440);
      }, 2000);
      return () => clearInterval(interval);
    } else if (callState === 'CONNECTED') {
      // Speak realistic caller script via Web Speech synthesis
      audioAlertService.speakAlert("Hey! Where are you right now? I am nearby with the police, share your location!");

      const timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, callState]);

  if (!isOpen) return null;

  const handleAccept = () => {
    setCallState('CONNECTED');
  };

  const handleHangup = () => {
    setCallState('ENDED');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 text-white">
      {/* Caller Header */}
      <div className="flex flex-col items-center text-center mt-12 space-y-3">
        <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center shadow-2xl">
          <User className="w-12 h-12 text-slate-300" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Mom (Primary Guardian)</h2>
          <p className="text-sm text-slate-400 mt-1">
            {callState === 'RINGING' ? 'Incoming Emergency Call...' : callState === 'CONNECTED' ? formatTimer(seconds) : 'Call Ended'}
          </p>
        </div>
      </div>

      {/* Call Center Details */}
      {callState === 'CONNECTED' && (
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 max-w-xs text-center space-y-2">
          <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
            <Volume2 className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-300 italic">
            "I'm at the location right now with emergency response team!"
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-xs mb-12 flex items-center justify-around">
        {callState === 'RINGING' ? (
          <>
            <button
              onClick={handleHangup}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl"
              title="Decline"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white shadow-xl animate-bounce"
              title="Answer"
            >
              <PhoneCall className="w-7 h-7" />
            </button>
          </>
        ) : (
          <button
            onClick={handleHangup}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl"
            title="Hang Up"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        )}
      </div>
    </div>
  );
};
