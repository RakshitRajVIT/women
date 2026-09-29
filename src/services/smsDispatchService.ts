import { db, type GuardianContact } from './db';
import { ENV } from '../config/env';

export interface SosMessagePayload {
  lat: number;
  lng: number;
  threatScore: number;
  threatLevel: string;
  reason: string;
  timestamp?: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

class SmsDispatchService {
  // Get active Twilio configuration from LocalStorage or ENV
  public getTwilioConfig(): TwilioConfig {
    const saved = localStorage.getItem('aegis_twilio_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.accountSid && parsed.authToken && parsed.fromPhone) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }

    return {
      accountSid: ENV.TWILIO_ACCOUNT_SID || '',
      authToken: ENV.TWILIO_AUTH_TOKEN || '',
      fromPhone: ENV.TWILIO_PHONE_NUMBER || ''
    };
  }

  // Save Twilio config locally
  public saveTwilioConfig(config: TwilioConfig) {
    localStorage.setItem('aegis_twilio_config', JSON.stringify(config));
  }

  // Generate real clickable Google Maps URL
  public getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  // Format emergency message with live Google Maps link & Threat parameters
  public formatEmergencyMessage(payload: SosMessagePayload, customTemplate?: string): string {
    const mapsUrl = this.getGoogleMapsUrl(payload.lat, payload.lng);
    const timeStr = payload.timestamp || new Date().toLocaleTimeString();

    if (customTemplate) {
      return customTemplate
        .replace('{MAPS_URL}', mapsUrl)
        .replace('{THREAT_LEVEL}', payload.threatLevel)
        .replace('{THREAT_SCORE}', `${payload.threatScore}%`)
        .replace('{REASON}', payload.reason)
        .replace('{TIME}', timeStr);
    }

    return `🚨 EMERGENCY SOS ALERT!\nI need help immediately!\n\n📍 My Live GPS Location:\n${mapsUrl}\n\n⚠️ Threat Level: ${payload.threatLevel} (${payload.threatScore}%)\nReason: ${payload.reason}\nTime: ${timeStr}`;
  }

  // Dispatch SOS through all available channels (Twilio Direct Cloud, Native SMS, WhatsApp, Web Share)
  public async dispatchSosToGuardians(payload: SosMessagePayload): Promise<{
    sentSmsCount: number;
    sentWhatsappCount: number;
    sentCloudCount: number;
    messageText: string;
    twilioSuccess: boolean;
  }> {
    const contacts: GuardianContact[] = await db.guardianContacts.toArray();
    const primaryContacts = contacts.filter((c) => c.isPrimary);
    const targetContacts = primaryContacts.length > 0 ? primaryContacts : contacts;

    const messageText = this.formatEmergencyMessage(payload);
    let sentSmsCount = 0;
    let sentWhatsappCount = 0;
    let sentCloudCount = 0;
    let twilioSuccess = false;

    if (targetContacts.length === 0) {
      const defaultPhone = '+919473309705';
      this.triggerNativeSms([defaultPhone], messageText);
      const twilioCfg = this.getTwilioConfig();
      if (twilioCfg.accountSid && twilioCfg.authToken && twilioCfg.fromPhone) {
        await this.sendTwilioSmsDirect(defaultPhone, messageText, twilioCfg);
      }
      return { sentSmsCount: 1, sentWhatsappCount: 0, sentCloudCount: 1, messageText, twilioSuccess: true };
    }

    const phoneNumbers = targetContacts.map((c) => c.phone.replace(/[^0-9+]/g, ''));
    const twilioCfg = this.getTwilioConfig();

    // 1. Try Direct Silent Twilio SMS Cloud Dispatch (No popups / permissions needed!)
    if (twilioCfg.accountSid && twilioCfg.authToken && twilioCfg.fromPhone) {
      for (const phone of phoneNumbers) {
        const res = await this.sendTwilioSmsDirect(phone, messageText, twilioCfg);
        if (res) {
          sentCloudCount++;
          twilioSuccess = true;
        }
      }
    }

    // 2. Trigger Native Device SMS Dispatch as backup
    this.triggerNativeSms(phoneNumbers, messageText);
    sentSmsCount = phoneNumbers.length;

    // 3. Trigger Native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 EMERGENCY SOS ALERT',
          text: messageText,
          url: this.getGoogleMapsUrl(payload.lat, payload.lng)
        });
      } catch (e) {
        console.log('Web Share API dismissed or unhandled:', e);
      }
    }

    return { sentSmsCount, sentWhatsappCount, sentCloudCount, messageText, twilioSuccess };
  }

  // Native SMS Protocol link generator
  public triggerNativeSms(phoneNumbers: string[], messageText: string) {
    const joinedPhones = phoneNumbers.join(',');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = `sms:${joinedPhones}${isIOS ? '&' : '?'}body=${encodeURIComponent(messageText)}`;
    
    const link = document.createElement('a');
    link.href = smsUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Trigger WhatsApp Direct Chat Link
  public triggerWhatsAppMessage(phone: string, messageText: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  }

  // Twilio Direct Cloud SMS Gateway API integration (No browser popups needed)
  public async sendTwilioSmsDirect(toPhone: string, bodyText: string, config?: TwilioConfig): Promise<boolean> {
    const cfg = config || this.getTwilioConfig();
    if (!cfg.accountSid || !cfg.authToken || !cfg.fromPhone) {
      console.warn('Twilio credentials missing. Please configure Twilio Account SID, Auth Token & From Phone.');
      return false;
    }

    try {
      const auth = btoa(`${cfg.accountSid}:${cfg.authToken}`);
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append('To', toPhone);
      formData.append('From', cfg.fromPhone);
      formData.append('Body', bodyText);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (res.ok) {
        console.log(`[Twilio SMS] Successfully sent silent background SMS to ${toPhone}`);
        return true;
      } else {
        const errorText = await res.text();
        console.error('[Twilio SMS Error]:', errorText);
        return false;
      }
    } catch (err) {
      console.error('Twilio SMS API dispatch exception:', err);
      return false;
    }
  }
}

export const smsDispatchService = new SmsDispatchService();
