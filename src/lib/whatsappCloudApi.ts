import { WhatsAppApiConfig } from '../types';
import { safeStorage } from './safeStorage';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppApiConfig = {
  enabled: false,
  provider: 'direct_web',
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  webhookSecret: '',
  templateNamespace: 'baraem_alghazzawi_templates',
  autoSendDailyAttendance: false,
  autoSendBadgeNotification: true,
  autoSendInterventionAlert: false,
  testStatus: 'idle',
};

const STORAGE_KEY = 'baraem_whatsapp_config_v2';

export function getStoredWhatsAppConfig(): WhatsAppApiConfig {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading WhatsApp config:', err);
  }
  return DEFAULT_WHATSAPP_CONFIG;
}

export const getWhatsAppConfig = getStoredWhatsAppConfig;

export function saveWhatsAppConfig(config: WhatsAppApiConfig): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving WhatsApp config:', err);
  }
}

/**
 * Normalizes an Arabic or Saudi phone number into WhatsApp international format without spaces
 * e.g. "0501234567" -> "966501234567"
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.slice(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return cleaned;
}

/**
 * Generates an instant, direct wa.me link for browser execution
 */
export function generateDirectWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = formatPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

export interface WhatsAppSendResult {
  success: boolean;
  mode: 'cloud_api' | 'direct_link' | 'simulated';
  messageId?: string;
  error?: string;
  url?: string;
}

/**
 * Dispatches a WhatsApp message using either Meta Cloud API (if configured) or Direct Web fallback
 */
export async function dispatchWhatsAppMessage(
  phone: string,
  messageText: string,
  templateData?: {
    templateName: string;
    languageCode?: string;
    components?: any[];
  }
): Promise<WhatsAppSendResult> {
  const config = getStoredWhatsAppConfig();
  const normalizedPhone = formatPhoneNumberForWhatsApp(phone);

  // Fallback 1: If direct_web is chosen OR credentials are missing, open browser wa.me
  if (config.provider === 'direct_web' || !config.accessToken || !config.phoneNumberId) {
    const url = generateDirectWhatsAppUrl(phone, messageText);
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return {
        success: true,
        mode: 'direct_link',
        url,
      };
    } catch {
      return {
        success: false,
        mode: 'direct_link',
        error: 'تعذر فتح نافذة المتصفح تلقائياً',
        url,
      };
    }
  }

  // Fallback 2: Meta Cloud API (Graph API v20.0)
  try {
    const endpoint = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

    // Construct body (template or free-form text within 24h window)
    const requestBody = templateData
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: templateData.templateName,
            language: { code: templateData.languageCode || 'ar' },
            components: templateData.components || [],
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: { preview_url: false, body: messageText },
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || `HTTP ${response.status}`;
      return {
        success: false,
        mode: 'cloud_api',
        error: errorMsg,
      };
    }

    const resJson = await response.json();
    return {
      success: true,
      mode: 'cloud_api',
      messageId: resJson?.messages?.[0]?.id,
    };
  } catch (err: any) {
    console.error('WhatsApp Cloud API error:', err);
    return {
      success: false,
      mode: 'cloud_api',
      error: err.message || 'خطأ في الاتصال بخوادم Meta Cloud API',
    };
  }
}

/**
 * Tests connection to Meta WhatsApp Business Cloud API
 */
export async function testWhatsAppApiConnection(
  config: WhatsAppApiConfig
): Promise<{ success: boolean; message: string }> {
  if (!config.phoneNumberId || !config.accessToken) {
    return {
      success: false,
      message: 'الرجاء إدخال معرف رقم الهاتف (Phone Number ID) ورمز الوصول الدائم (Access Token).',
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${config.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        message: err?.error?.message || `فشل التحقق (رمز الخطأ: ${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: `تم التحقق بنجاح! الاسم المعتمد: ${data.verified_name || 'حساب واتساب تجاري'} - الرقم: ${data.display_phone_number || ''}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `تعذر الاتصال بخوادم Meta: ${err.message || 'تأكد من اتصالك بالإنترنت'}`,
    };
  }
}
