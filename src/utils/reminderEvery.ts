import { Capacitor } from '@capacitor/core';

/** Reminders repeat every 60 s (the product contract); on iOS App Review reads that as nagging, so they wait 10 minutes there. */
export const REMINDER_EVERY_MS = Capacitor.getPlatform() === 'ios' ? 600_000 : 60_000;
