import React, { useEffect, useState } from 'react';
import { db, type EvidenceRecord } from '../services/db';
import { mediaRecorderService } from '../services/mediaRecorderService';
import { FileVideo, Play, Download, Trash2, ShieldAlert, Clock, MapPin, HardDrive } from 'lucide-react';

interface EvidenceVaultProps {
  isSosActive: boolean;
}

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({ isSosActive }) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<EvidenceRecord | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadEvidence();
  }, [isSosActive]);

  const loadEvidence = async () => {
    const records = await db.evidenceLogs.reverse().toArray();
    setEvidenceList(records);
  };

  const handleSelectRecord = (record: EvidenceRecord) => {
    setSelectedRecord(record);
    if (record.videoBlob) {
      const url = URL.createObjectURL(record.videoBlob);
      setVideoUrl(url);
    } else {
      setVideoUrl(null);
    }
  };

  const handleDownload = (record: EvidenceRecord) => {
    if (!record.videoBlob) return;
    const url = URL.createObjectURL(record.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName || `evidence_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await db.evidenceLogs.delete(id);
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
      setVideoUrl(null);
    }
    loadEvidence();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-800 text-rose-400">
              <FileVideo className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Secure Evidence Vault (IndexedDB Encrypted)
              </h2>
              <p className="text-xs text-slate-400">100% Offline persistent audio & video recordings with GPS metadata</p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <HardDrive className="w-4 h-4" />
            <span>{evidenceList.length} Recorded Files Saved</span>
          </div>
        </div>

        {/* Live Recording Active Banner */}
        {mediaRecorderService.getIsRecording() && (
          <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>LIVE AUTOMATIC EVIDENCE RECORDING IN PROGRESS...</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-rose-600 text-white font-mono font-bold">
              REC ●
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Selected Record Viewer & Evidence List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player & Detail */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedRecord.fileName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(selectedRecord.timestamp).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {selectedRecord.lat.toFixed(4)}, {selectedRecord.lng.toFixed(4)}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleDownload(selectedRecord)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" /> Download File
                </button>
              </div>

              {/* Video Player */}
              <div className="bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-500 text-xs">Audio/Video stream preview loading...</div>
                )}
              </div>

              {/* Log Details */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Trigger Reason</span>
                  <p className="font-bold text-rose-400 mt-0.5">{selectedRecord.triggerReason}</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400">AI Threat Score</span>
                  <p className="font-bold text-amber-400 mt-0.5">{selectedRecord.threatScore}% Threat</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Duration</span>
                  <p className="font-bold text-slate-200 mt-0.5">{selectedRecord.durationSeconds} Seconds</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <FileVideo className="w-12 h-12 text-slate-700" />
              <p className="text-slate-400 text-sm">Select an evidence recording from the vault menu on the right to inspect video and GPS metadata.</p>
            </div>
          )}
        </div>

        {/* Right Col: Evidence Files List */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
          <h3 className="font-bold text-slate-200 text-sm flex items-center justify-between">
            <span>Evidence Logs History</span>
            <span className="text-xs text-slate-500 font-mono">IDB Storage</span>
          </h3>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {evidenceList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No emergency evidence recordings found yet. Recordings trigger automatically during panic alarms.
              </div>
            ) : (
              evidenceList.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => handleSelectRecord(rec)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedRecord?.id === rec.id
                      ? 'bg-rose-950/40 border-rose-500/60 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-bold text-xs">{rec.fileName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(rec.timestamp).toLocaleTimeString()} • {rec.durationSeconds}s
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rec.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-900/50 text-slate-500 hover:text-rose-400 transition-all"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
