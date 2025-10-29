import { GoogleGenAI, Type } from "@google/genai";
import type { AppSettings, Character, StoryEvent } from '../types';

// 定义 AI 请求的上下文结构
interface GenerationContext {
  characters: Pick<Character, 'name' | 'description'>[];
  recentEvents: Pick<StoryEvent, 'title' | 'description'>[];
}

// 定义 AI 响应的结构
export interface CreativeIdea {
  title: string;
  description: string;
  involvedCharacterNames: string[];
  precedingEventTitle: string;
}

// 服务在失败时抛出错误，在成功时返回结构化对象
const throwError = (title: string, description: string) => {
  throw new Error(JSON.stringify({ title, description }));
};

export const generateCreativeIdea = async (context: GenerationContext, settings: AppSettings['ai']): Promise<CreativeIdea> => {
  if (!settings.enabled) {
    throwError("AI 已禁用", "请在设置中启用 AI 功能。");
  }

  const { activeVendor, vendors } = settings;
  const config = vendors[activeVendor];
  
  // Pre-condition check for API key
  if (!config.apiKey || config.apiKey.trim() === '') {
    const vendorName = activeVendor.charAt(0).toUpperCase() + activeVendor.slice(1);
    throwError("API 密钥未配置", `请在设置中为 ${vendorName} 配置 API 密钥。`);
  }

  const charactersPrompt = context.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
  const eventsPrompt = context.recentEvents.map(e => `- ${e.title}: ${e.description}`).join('\n');

  const prompt = `你是一位为小说家提供服务的人工智能创意助手。请根据以下故事背景，构思一个合乎逻辑的后续事件。

**现有角色:**
${charactersPrompt || '无'}

**最近发生的事件 (按时间顺序):**
${eventsPrompt || '无'}

**你的任务:**
生成一个 JSON 对象，用于描述一个新事件，其结构如下:
- "title": 新事件的简短、引人注目的标题。
- "description": 一句话描述事件中发生的事情。
- "involvedCharacterNames": 一个字符串数组，包含所提供列表中与这个新事件最相关的角色姓名。
- "precedingEventTitle": 从提供的最近事件列表中，选择一个此新事件最直接的起因或前序事件的标题。

请确保生成的事件在所提供的故事和角色背景下是合理的。`;

  if (activeVendor === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const { model, systemPrompt, advanced } = config;

      const responseSchema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: '一个简短、引人注目的事件标题。' },
            description: { type: Type.STRING, description: '一句事件的描述。' },
            involvedCharacterNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '参与此事件的相关人物姓名列表。'
            },
            precedingEventTitle: {
              type: Type.STRING,
              description: '这个新事件是哪个最近发生的事件的直接后续。'
            }
          },
          required: ["title", "description", "involvedCharacterNames", "precedingEventTitle"]
      };

      const apiConfig: { [key: string]: any } = {
        systemInstruction: systemPrompt,
        temperature: advanced.temperature,
        topP: advanced.topP,
        topK: advanced.topK,
        maxOutputTokens: advanced.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      };

      if (model.includes('flash') && advanced.maxOutputTokens) {
        apiConfig.thinkingConfig = {
          thinkingBudget: Math.floor(advanced.maxOutputTokens / 2)
        };
      }
      
      const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: apiConfig
      });

      const text = response.text;
      if (text) {
          const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanedText);
      } else {
          const finishReason = response.candidates?.[0]?.finishReason;
          const safetyRatings = response.candidates?.[0]?.safetyRatings;
          let detailedError = "API did not return any text content.";
          if (finishReason && finishReason !== 'STOP') {
              detailedError += ` The generation process finished unexpectedly (Reason: ${finishReason}).`;
              if (finishReason === 'MAX_TOKENS') {
                detailedError += ' Consider increasing "Max Output Tokens" in advanced settings.'
              }
          }
          if (safetyRatings?.some(r => r.blocked)) {
             detailedError += ` The response may have been blocked due to safety settings.`;
          }
          throw new Error(detailedError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("调用 Gemini API 时出错:", error);
      throwError("Gemini API 错误", `无法从 AI 获取建议。请检查您的模型名称和 API 密钥。错误: ${errorMessage}`);
    }
  } else if (activeVendor === 'openai') {
    try {
        const { model, systemPrompt, advanced, baseUrl, apiKey } = config;
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: advanced.temperature,
                top_p: advanced.topP,
                max_tokens: advanced.maxOutputTokens,
                response_format: { "type": "json_object" }
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
            return JSON.parse(content);
        } else {
            throw new Error("No content returned from OpenAI API.");
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("调用 OpenAI API 时出错:", error);
        throwError("OpenAI API 错误", `无法从 AI 获取建议。请检查您的模型、API 密钥和地址。错误: ${errorMessage}`);
    }
  }

  // This should not be reached if throwError works as expected
  throw new Error(JSON.stringify({ title: "未知错误", description: "发生了一个意料之外的错误。" }));
};
