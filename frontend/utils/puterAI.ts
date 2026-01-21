/**
 * Puter.js AI Service for React Native
 * Custom implementation using Puter's REST API
 */

const PUTER_API_URL = 'https://api.puter.com/drivers/call';

interface PuterChatOptions {
  model?: string;
  temperature?: number;
}

class PuterAI {
  /**
   * Send chat message to Puter AI
   */
  async chat(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    options: PuterChatOptions = {}
  ): Promise<string> {
    try {
      const {
        model = 'gpt-4',
        temperature = 0.7,
      } = options;

      // Build messages array
      const messages = [
        ...history,
        { role: 'user', content: message }
      ];

      console.log('[PUTER AI] Sending chat request:', { model, messageCount: messages.length });

      // Call Puter's AI driver
      const response = await fetch(PUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interface: 'puter-chat-completion',
          driver: 'openai-completion',
          method: 'complete',
          args: {
            messages,
            model,
            temperature,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PUTER AI] API error:', response.status, errorText);
        throw new Error(`Puter AI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[PUTER AI] Response received');
      
      // Extract the message content from Puter's response
      const content = data?.message?.content || data?.response || 'No response';
      return content;
    } catch (error) {
      console.error('[PUTER AI] Chat error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const puterAI = new PuterAI();
