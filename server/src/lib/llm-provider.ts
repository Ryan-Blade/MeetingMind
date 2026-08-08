import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

export interface ToolCallParams {
  systemPrompt?: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: any;
}

interface ProviderKeyConfig {
  provider: "gemini" | "nvidia" | "anthropic" | "openai" | "groq";
  keys: string[];
  currentIndex: number;
}

function parseKeys(envVarValue?: string, singleFallback?: string): string[] {
  const keys: string[] = [];
  if (envVarValue) {
    envVarValue.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => keys.push(k));
  }
  if (singleFallback && singleFallback.trim() && !keys.includes(singleFallback.trim())) {
    keys.push(singleFallback.trim());
  }
  return keys.filter(
    (k) =>
      k &&
      !k.startsWith("your-") &&
      k !== "sk-ant-key-1" &&
      k !== "your-gemini-key-1" &&
      k !== "nvapi-key-1"
  );
}

export class LlmProviderManager {
  private providers: Map<string, ProviderKeyConfig> = new Map();

  constructor() {
    this.reloadKeys();
  }

  public reloadKeys() {
    this.providers.set("gemini", {
      provider: "gemini",
      keys: parseKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY),
      currentIndex: 0,
    });
    this.providers.set("nvidia", {
      provider: "nvidia",
      keys: parseKeys(process.env.NVIDIA_API_KEYS, process.env.NVIDIA_API_KEY),
      currentIndex: 0,
    });
    this.providers.set("groq", {
      provider: "groq",
      keys: parseKeys(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY),
      currentIndex: 0,
    });
    this.providers.set("anthropic", {
      provider: "anthropic",
      keys: parseKeys(process.env.ANTHROPIC_API_KEYS, process.env.ANTHROPIC_API_KEY),
      currentIndex: 0,
    });
    this.providers.set("openai", {
      provider: "openai",
      keys: parseKeys(process.env.OPENAI_API_KEYS, process.env.OPENAI_API_KEY),
      currentIndex: 0,
    });
  }

  public async executeToolCall(params: ToolCallParams): Promise<any | null> {
    this.reloadKeys(); // Refresh from process.env dynamically
    const rawOrder = process.env.LLM_PROVIDER_ORDER || "gemini,nvidia,anthropic,openai,groq";
    const providerOrder = rawOrder.split(",").map((p) => p.trim().toLowerCase());

    for (const providerName of providerOrder) {
      const config = this.providers.get(providerName);
      if (!config || config.keys.length === 0) continue;

      const attempts = config.keys.length;
      for (let i = 0; i < attempts; i++) {
        const keyIndex = (config.currentIndex + i) % config.keys.length;
        const key = config.keys[keyIndex];

        try {
          console.log(
            `[LLM Provider] Invoking ${providerName.toUpperCase()} with key #${keyIndex + 1}/${config.keys.length}`
          );
          const result = await this.callProvider(providerName, key, params);
          if (result !== null) {
            config.currentIndex = keyIndex; // update active key index on success
            return result;
          }
        } catch (err: any) {
          const isRateLimit =
            err?.status === 429 ||
            err?.message?.includes("429") ||
            err?.message?.includes("quota") ||
            err?.message?.includes("rate limit") ||
            err?.message?.includes("RESOURCE_EXHAUSTED");

          console.warn(
            `[LLM Provider Warning] ${providerName.toUpperCase()} Key #${keyIndex + 1} failed:`,
            err?.message || err
          );

          if (isRateLimit) {
            console.warn(
              `[LLM Key Rotation] Rate limit detected for ${providerName.toUpperCase()} Key #${
                keyIndex + 1
              }. Rotating to next stacked key...`
            );
            continue; // try next key in stack
          } else {
            // Try next key or fall back to next provider
            continue;
          }
        }
      }
    }

    return null;
  }

  private async callProvider(provider: string, apiKey: string, params: ToolCallParams): Promise<any | null> {
    if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        tools: [
          {
            name: params.toolName,
            description: params.toolDescription,
            input_schema: params.inputSchema,
          },
        ] as any,
        tool_choice: { type: "tool", name: params.toolName },
        messages: [{ role: "user", content: params.userPrompt }],
      });

      const toolUseBlock = response.content.find((b) => b.type === "tool_use");
      if (toolUseBlock && toolUseBlock.type === "tool_use") {
        return toolUseBlock.input;
      }
      return null;
    }

    // OpenAI-compatible providers: Gemini, Nvidia, Groq, OpenAI
    let baseURL: string | undefined;
    let modelName = "gpt-4o-mini";

    if (provider === "gemini") {
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
      modelName = "gemini-1.5-flash";
    } else if (provider === "nvidia") {
      baseURL = "https://integrate.api.nvidia.com/v1";
      modelName = "meta/llama-3.3-70b-instruct";
    } else if (provider === "groq") {
      baseURL = "https://api.groq.com/openai/v1";
      modelName = "llama-3.3-70b-versatile";
    } else if (provider === "openai") {
      baseURL = undefined;
      modelName = "gpt-4o-mini";
    }

    const client = new OpenAI({ apiKey, baseURL });
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        ...(params.systemPrompt ? [{ role: "system" as const, content: params.systemPrompt }] : []),
        { role: "user" as const, content: params.userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: params.toolName,
            description: params.toolDescription,
            parameters: params.inputSchema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: params.toolName } },
    });

    const toolCalls = response.choices[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const argsStr = toolCalls[0].function.arguments;
      try {
        return JSON.parse(argsStr);
      } catch (err) {
        console.warn(`Failed to parse tool JSON output from ${provider}:`, argsStr);
      }
    }
    return null;
  }
}

export const llmProviderManager = new LlmProviderManager();
