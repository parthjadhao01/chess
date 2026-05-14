interface ModelPricing {
    inputPer1M: number;
    outputPer1M: number;
}

const PRICING: Record<string, ModelPricing> = {
    // Free models
    "google/gemma-4-26b-a4b-it:free":        { inputPer1M: 0,      outputPer1M: 0      },
    "google/gemma-2-9b-it:free":             { inputPer1M: 0,      outputPer1M: 0      },
    "meta-llama/llama-3.1-8b-instruct:free": { inputPer1M: 0,      outputPer1M: 0      },
    "mistralai/mistral-7b-instruct:free":    { inputPer1M: 0,      outputPer1M: 0      },
    "~google/gemini-flash-latest":           { inputPer1M: 0,      outputPer1M: 0      },

    // OpenAI
    "openai/gpt-4o":                         { inputPer1M: 2.50,   outputPer1M: 10.00  },
    "openai/gpt-4o-mini":                    { inputPer1M: 0.15,   outputPer1M: 0.60   },
    "openai/gpt-4-turbo":                    { inputPer1M: 10.00,  outputPer1M: 30.00  },
    "openai/o1-mini":                        { inputPer1M: 3.00,   outputPer1M: 12.00  },

    // Anthropic
    "anthropic/claude-3.5-sonnet":           { inputPer1M: 3.00,   outputPer1M: 15.00  },
    "anthropic/claude-3.5-haiku":            { inputPer1M: 0.80,   outputPer1M: 4.00   },
    "anthropic/claude-3-opus":               { inputPer1M: 15.00,  outputPer1M: 75.00  },
    "anthropic/claude-3-haiku":              { inputPer1M: 0.25,   outputPer1M: 1.25   },

    // Google
    "google/gemini-pro-1.5":                 { inputPer1M: 1.25,   outputPer1M: 5.00   },
    "google/gemini-flash-1.5":               { inputPer1M: 0.075,  outputPer1M: 0.30   },
    "google/gemini-flash-1.5-8b":            { inputPer1M: 0.0375, outputPer1M: 0.15   },

    // Meta
    "meta-llama/llama-3.1-70b-instruct":     { inputPer1M: 0.52,   outputPer1M: 0.75   },
    "meta-llama/llama-3.1-405b-instruct":    { inputPer1M: 2.70,   outputPer1M: 2.70   },
};

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING[model];
    if (!pricing) {
        console.warn(`[Cost] No pricing found for model "${model}" — cost recorded as $0.00`);
        return 0;
    }
    return (promptTokens / 1_000_000) * pricing.inputPer1M
         + (completionTokens / 1_000_000) * pricing.outputPer1M;
}

export function formatCost(usd: number): string {
    if (usd === 0)      return "$0.00 (free)";
    if (usd < 0.000001) return "<$0.000001";
    if (usd < 0.01)     return `$${usd.toFixed(6)}`;
    return `$${usd.toFixed(4)}`;
}
