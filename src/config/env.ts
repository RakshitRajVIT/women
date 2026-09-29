export const ENV = {
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'AegisSafety | Offline AI Women Safety Platform',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',

  EMERGENCY_HELPLINE: import.meta.env.VITE_EMERGENCY_HELPLINE_NUMBER || '1091',
  POLICE_HELPLINE: import.meta.env.VITE_POLICE_HELPLINE_NUMBER || '112',

  // Optional Twilio Credentials
  TWILIO_ACCOUNT_SID: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',

  // Feature Flags
  ENABLE_AUDIO_SIREN: import.meta.env.VITE_ENABLE_AUDIO_SIREN !== 'false',
  ENABLE_AUTO_RECORDING: import.meta.env.VITE_ENABLE_AUTO_RECORDING !== 'false',
  ENABLE_SIMULATOR_PANEL: import.meta.env.VITE_ENABLE_SIMULATOR_PANEL !== 'false',
};
