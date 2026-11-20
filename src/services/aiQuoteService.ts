import { Quotation, Settings } from '../types/quotation';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-generate-content?key=';

export interface AiSuggestion {
  title: string;
  client: string;
  attn: string;
  location: string;
  intro: string;
  closing: string;
  delivery: string;
  service: string;
}

export class AiQuoteService {
  private static async callGemini(prompt: string, context: Quotation | null): Promise<string> {
    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');

    const sysPrompt = `You are a professional quotation assistant for Universal Inspection Co. Ltd (UIC), a Saudi-based inspection and calibration company. Respond in ${context?.type === 'valve' ? 'formal technical English' : 'professional business English'} with concise, accurate suggestions. Use the provided context when generating quotations.`;

    const userPrompt = context
      ? `Based on this partial quotation data, suggest improvements:\n${JSON.stringify(context, null, 2)}\n\nProvide suggestions in JSON format with these fields: title, client, attn, location, intro, closing, delivery, service. Return ONLY valid JSON.`
      : prompt;

    const res = await fetch(`${API_URL}${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        systemInstruction: { parts: [{ text: sysPrompt }] },
      }),
    });

    if (!res.ok) throw new Error(`AI API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  }

  public static async generateQuoteDetails(client: string, serviceType: string): Promise<AiSuggestion> {
    const prompt = `Generate a professional quotation suggestion for UIC (Universal Inspection Co. Ltd) for client "${client}" requesting "${serviceType}" services. Include appropriate title, attention contact, location, introduction paragraph, closing paragraph, delivery terms, and service description.`;
    const result = await this.callGemini(prompt, null);

    // Try to parse JSON from response
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || '',
          client: parsed.client || client,
          attn: parsed.attn || '',
          location: parsed.location || '',
          intro: parsed.intro || '',
          closing: parsed.closing || '',
          delivery: parsed.delivery || '',
          service: parsed.service || '',
        };
      }
    } catch {}

    return { title: '', client, attn: '', location: '', intro: result, closing: '', delivery: '', service: serviceType };
  }

  public static async reviewQuote(quote: Partial<Quotation>): Promise<string> {
    const prompt = `Review this quotation for completeness, professionalism, and accuracy. Suggest improvements:\n${JSON.stringify(quote, null, 2)}`;
    return this.callGemini(prompt, quote as Quotation);
  }

  public static async generateDescription(serviceName: string, specifications: string): Promise<string> {
    const prompt = `Generate a detailed professional description for "${serviceName}" with specifications: ${specifications}. Output a single paragraph suitable for a quotation line item.`;
    return this.callGemini(prompt, null);
  }
}
