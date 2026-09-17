/**
 * Turns a GeneratedForm's HTML into a shareable PDF with expo-print / expo-sharing.
 * On web, opens the browser print dialog instead.
 */
import { Platform } from 'react-native';

import type { GeneratedForm } from '@/domain/types';

export async function exportFormPdf(form: GeneratedForm): Promise<string | null> {
  if (Platform.OS === 'web') {
    const Print = require('expo-print') as typeof import('expo-print');
    await Print.printAsync({ html: form.html });
    return null;
  }
  const Print = require('expo-print') as typeof import('expo-print');
  const { uri } = await Print.printToFileAsync({ html: form.html });
  return uri;
}

export async function shareFormPdf(uri: string, title: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: title,
    UTI: 'com.adobe.pdf',
  });
  return true;
}
