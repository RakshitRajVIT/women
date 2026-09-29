import React, { useEffect, useState } from 'react';
import type { GuardianSyncState } from '../services/guardianSyncService';
import { guardianSyncService } from '../services/guardianSyncService';
import { db, type GuardianContact } from '../services/db';
import { smsDispatchService, type TwilioConfig } from '../services/smsDispatchService';
import { ShieldCheck, ShieldAlert, User, Phone, Plus, Trash2, Bell, BellOff, Battery, MessageSquare, Send, Key, Save } from 'lucide-react';

interface GuardianDashboardProps {
  currentSyncState: GuardianSyncState;
}

export const GuardianDashboard: React.FC<GuardianDashboardProps> = ({ currentSyncState }) => {
  const [contacts, setContacts] = useState<GuardianContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('Family');

  const [lastGuardianCommand, setLastGuardianCommand] = useState<string>('');

  // Twilio settings state
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>(() => smsDispatchService.getTwilioConfig());
  const [twilioStatus, setTwilioStatus] = useState<string>('');

  useEffect(() => {
    loadContacts();
    const unsub = guardianSyncService.onGuardianCommand((payload) => {
      setLastGuardianCommand(`${payload.command} sent at ${new Date(payload.timestamp).toLocaleTimeString()}`);
    });
    return () => unsub();
  }, []);

  const loadContacts = async () => {
    const list = await db.guardianContacts.toArray();
    setContacts(list);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    await db.guardianContacts.add({
      name: newContactName,
      phone: newContactPhone,
      relationship: newContactRel,
      isPrimary: contacts.length === 0
    });

    setNewContactName('');
    setNewContactPhone('');
    loadContacts();
  };

  const handleDeleteContact = async (id?: number) => {
    if (!id) return;
    await db.guardianContacts.delete(id);
    loadContacts();
  };

  const handleSaveTwilio = (e: React.FormEvent) => {
    e.preventDefault();
    smsDispatchService.saveTwilioConfig(twilioConfig);
    setTwilioStatus('✅ Twilio Credentials Saved! Automatic Background SMS is ACTIVE.');
    setTimeout(() => setTwilioStatus(''), 4000);
  };

  const getActiveCoords = (cb: (lat: number, lng: number) => void) => {
    if (userLocation) {
      cb(userLocation.lat, userLocation.lng);
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => cb(pos.coords.latitude, pos.coords.longitude),
        () => alert('Please allow Location access in your browser address bar!'),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert('Location permission required.');
    }
  };

  const handleTestTwilioSms = async (targetPhone: string) => {
    setTwilioStatus('Sending background SMS via Twilio API...');
    getActiveCoords(async (lat, lng) => {
      const mapsUrl = smsDispatchService.getGoogleMapsUrl(lat, lng);
      const msgText = `🚨 TEST EMERGENCY SOS ALERT!\nMy Live GPS Location:\n${mapsUrl}`;

      const ok = await smsDispatchService.sendTwilioSmsDirect(targetPhone, msgText, twilioConfig);
      if (ok) {
        setTwilioStatus(`✅ Background SMS successfully delivered to ${targetPhone}!`);
      } else {
        setTwilioStatus(`❌ Twilio SMS failed. Check Account SID, Auth Token & From Phone Number.`);
      }
    });
  };

  const handleTriggerRemoteSiren = () => {
    guardianSyncService.sendGuardianCommand('TRIGGER_SIREN');
  };

  const handleStopRemoteSiren = () => {
    guardianSyncService.sendGuardianCommand('STOP_SIREN');
  };

  const { isSosActive, threatScore, threatLevel, userLocation, batteryLevel, lastUpdated } = currentSyncState;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isSosActive ? 'bg-rose-600 animate-pulse text-white' : 'bg-slate-800 text-rose-400'}`}>
              {isSosActive ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7 text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Guardian Live Monitoring Dashboard
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </h2>
              <p className="text-xs text-slate-400">Continuous 24/7 cross-device tracking & remote panic controls</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerRemoteSiren}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/60 transition-all"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              TRIGGER ALARM SIREN
            </button>
            <button
              onClick={handleStopRemoteSiren}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 border border-slate-700"
            >
              <BellOff className="w-4 h-4" />
              MUTE
            </button>
          </div>
        </div>

        {lastGuardianCommand && (
          <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            Guardian Action Log: {lastGuardianCommand}
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">User Status</span>
            <div className="flex items-center gap-1.5 font-bold">
              {isSosActive ? (
                <span className="text-rose-400 font-black flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-4 h-4" /> EMERGENCY SOS!
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Normal / Safe
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Threat Assessment</span>
            <div className="text-sm font-bold text-slate-200">
              {threatLevel} ({threatScore}%)
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Live GPS Coordinates</span>
            <div className="text-xs font-mono font-semibold text-sky-400">
              {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Acquiring GPS...'}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Phone Battery & Sync</span>
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" /> {batteryLevel}% • {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Twilio Background SMS Settings Card */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Twilio Automatic Background SMS Gateway</h3>
              <p className="text-xs text-slate-400">Sends instant SMS messages directly to family phones without opening browser popups</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
            {twilioConfig.accountSid ? 'Twilio Configured' : 'Needs Setup'}
          </span>
        </div>

        {twilioStatus && (
          <div className="text-xs font-semibold p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sky-300">
            {twilioStatus}
          </div>
        )}

        <form onSubmit={handleSaveTwilio} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Twilio Account SID</label>
            <input
              type="text"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
              value={twilioConfig.accountSid}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Twilio Auth Token</label>
            <input
              type="password"
              placeholder="Your Twilio Auth Token"
              value={twilioConfig.authToken}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Twilio From Phone Number</label>
            <input
              type="text"
              placeholder="+18335550192"
              value={twilioConfig.fromPhone}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, fromPhone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Save className="w-4 h-4" /> Save Twilio Credentials
            </button>
          </div>
        </form>
      </div>

      {/* Emergency Contacts Management */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-rose-400" /> Designated Emergency Guardians
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{contact.name}</span>
                  {contact.isPrimary && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{contact.relationship}</span>
                  <span>•</span>
                  <span className="text-slate-300 font-mono">{contact.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`tel:${contact.phone}`}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>

                {twilioConfig.accountSid && (
                  <button
                    onClick={() => handleTestTwilioSms(contact.phone)}
                    className="p-2 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 border border-amber-500/30 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="Send Direct Background Twilio SMS (No Browser Popup)"
                  >
                    <Send className="w-3.5 h-3.5" /> Direct SMS
                  </button>
                )}

                <button
                  onClick={() => {
                    getActiveCoords((lat, lng) => {
                      const mapsUrl = smsDispatchService.getGoogleMapsUrl(lat, lng);
                      const msg = `🚨 EMERGENCY SOS ALERT!\nI need help immediately!\n\n📍 Live GPS Location:\n${mapsUrl}`;
                      smsDispatchService.triggerNativeSms([contact.phone], msg);
                    });
                  }}
                  className="p-2 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600/40 border border-sky-500/30 transition-all text-xs flex items-center gap-1 font-semibold"
                  title="Send Native SMS App Link"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> App SMS
                </button>

                <button
                  onClick={() => {
                    getActiveCoords((lat, lng) => {
                      const mapsUrl = smsDispatchService.getGoogleMapsUrl(lat, lng);
                      const msg = `🚨 EMERGENCY SOS ALERT!\nI need help immediately!\n\n📍 Live GPS Location:\n${mapsUrl}`;
                      smsDispatchService.triggerWhatsAppMessage(contact.phone, msg);
                    });
                  }}
                  className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 transition-all text-xs flex items-center gap-1 font-semibold"
                  title="Send WhatsApp Emergency Message"
                >
                  💬 WhatsApp
                </button>

                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-all"
                  title="Remove Guardian"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Contact Form */}
        <form onSubmit={handleAddContact} className="pt-2 flex flex-col md:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Guardian Name (e.g. Dad / Sister)"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            className="w-full md:w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            required
          />
          <input
            type="tel"
            placeholder="Phone Number (e.g. +15550192)"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            className="w-full md:w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            required
          />
          <select
            value={newContactRel}
            onChange={(e) => setNewContactRel(e.target.value)}
            className="w-full md:w-1/4 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Sibling">Sibling</option>
            <option value="Spouse">Spouse</option>
            <option value="Friend">Friend</option>
          </select>
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Guardian
          </button>
        </form>
      </div>
    </div>
  );
};
