const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const vault = require('./vault');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────────────────────────────────────
//  PROVIDER DEFINITIONS — only permanently free tiers, no expiring credits
// ─────────────────────────────────────────────────────────────────────────────
const PROVIDER_DEFS = {

  groq: {
    name: 'Groq', icon: '⚡',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'qwen-2.5-32b',
      'deepseek-r1-distill-llama-70b',
      'deepseek-r1-distill-qwen-32b'
    ],
    rateLimit: { rpm: 30, rpd: '1,000 (70B) / 14,400 (8B)' },
    format: 'openai',
    signupUrl: 'https://console.groq.com',
    freeInfo: '1,000 req/day (70B) · 14,400 req/day (8B)',
    note: 'Fastest inference available. Best starting point.',
  },

  cerebras: {
    name: 'Cerebras', icon: '🧠',
    baseURL: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.1-8b',
    models: [
      'llama3.1-8b',
      'llama3.3-70b',
    ],
    rateLimit: { rpm: 30, rpd: '14,400' },
    format: 'openai',
    signupUrl: 'https://cloud.cerebras.ai',
    freeInfo: '14,400 req/day',
    note: 'Huge free daily quota — great as a primary fallback.',
  },

  openrouter: {
    name: 'OpenRouter', icon: '🔀',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3.2-1b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-2-9b-it:free',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'deepseek/deepseek-chat:free',
      'deepseek/deepseek-r1:free',
      'cognitivecomputations/dolphin-3.0-r1-mistral-24b:free',
      'huggingfaceh4/zephyr-7b-beta:free',
      'openchat/openchat-7b:free',
      'undi95/toppy-m-7b:free',
      'nousresearch/hermes-3-llama-3.1-405b:free'
    ],
    rateLimit: { rpm: 20, rpd: '50 (1,000 with $10 topup)' },
    format: 'openai',
    extraHeaders: { 'HTTP-Referer': 'https://llm-router-local', 'X-Title': 'LLM Router' },
    signupUrl: 'https://openrouter.ai',
    freeInfo: '50 req/day free · 1,000/day with one-time $10 topup',
    note: 'Access to many frontier :free models. Multiple accounts multiply quota.',
  },

  google_ai: {
    name: 'Google AI Studio', icon: '🔮',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    models: [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-pro-exp-02-05',
      'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro'
    ],
    rateLimit: { rpm: 15, rpd: '1,500' },
    format: 'openai',
    signupUrl: 'https://aistudio.google.com',
    freeInfo: '1,500 req/day (Flash) · 50 req/day (Pro)',
    note: 'Data used for training outside EU/EEA/UK/CH. Use Flash-Lite for high volume.',
  },

  nvidia: {
    name: 'NVIDIA NIM', icon: '🟩',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: [
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'meta/llama-3.2-3b-instruct',
      'meta/llama-3.2-1b-instruct',
      'mistralai/mistral-large-2-instruct',
      'mistralai/mistral-nemo-12b-instruct',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'mistralai/mixtral-8x22b-instruct-v0.1',
      'google/gemma-2-9b-it',
      'google/gemma-2-27b-it',
      'qwen/qwen2.5-7b-instruct',
      'qwen/qwen2.5-72b-instruct',
      'qwen/qwen2.5-coder-32b-instruct',
      'nvidia/nemotron-4-340b-instruct',
      'deepseek-ai/deepseek-r1'
    ],
    rateLimit: { rpm: 40 },
    format: 'openai',
    signupUrl: 'https://build.nvidia.com',
    freeInfo: '40 req/min — permanently free (phone verification required)',
    note: 'Wide model selection including DeepSeek-R1. Models are context-window limited.',
  },

  mistral: {
    name: 'Mistral La Plateforme', icon: '🌬️',
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    models: [
      'mistral-large-latest',
      'mistral-small-latest',
      'open-mistral-nemo',
      'open-mixtral-8x7b',
      'open-mixtral-8x22b',
      'pixtral-large-latest',
      'pixtral-12b-2409',
      'ministral-3b-latest',
      'ministral-8b-latest'
    ],
    rateLimit: { rps: 1, rpm_tokens: '500,000' },
    format: 'openai',
    signupUrl: 'https://console.mistral.ai',
    freeInfo: 'Free Experiment plan · 500K tokens/min · requires data training opt-in',
    note: 'Requires opting into training data. Phone number verification required.',
  },

  codestral: {
    name: 'Mistral Codestral', icon: '💻',
    baseURL: 'https://codestral.mistral.ai/v1',
    defaultModel: 'codestral-latest',
    models: [
      'codestral-latest',
      'codestral-2405',
      'codestral-2501'
    ],
    rateLimit: { rpm: 30, rpd: '2,000' },
    format: 'openai',
    signupUrl: 'https://codestral.mistral.ai',
    freeInfo: '30 req/min · 2,000 req/day · currently free (monthly subscription model)',
    note: 'Code-specialised model. Separate key from La Plateforme.',
  },

  huggingface: {
    name: 'HuggingFace Inference', icon: '🤗',
    baseURL: 'https://api-inference.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-3.2-3B-Instruct',
      'meta-llama/Llama-3.2-1B-Instruct',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-Nemo-Instruct-2407',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'google/gemma-2-2b-it',
      'google/gemma-2-9b-it',
      'google/gemma-2-27b-it',
      'microsoft/Phi-3.5-mini-instruct',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B'
    ],
    rateLimit: { note: '$0.10/month in free credits' },
    format: 'openai',
    signupUrl: 'https://huggingface.co',
    freeInfo: '$0.10/month in free inference credits (renews monthly)',
    note: 'Credits renew every month — effectively permanent free tier.',
  },

  cohere: {
    name: 'Cohere', icon: '🌊',
    baseURL: 'https://api.cohere.ai/v1',
    defaultModel: 'command-r-plus-08-2024',
    models: [
      'command-r-plus-08-2024',
      'command-r-08-2024',
      'command-r-plus',
      'command-r',
      'command-light',
      'command',
      'c4ai-aya-expanse-8b',
      'c4ai-aya-expanse-32b'
    ],
    rateLimit: { rpm: 20, rpm_month: '1,000' },
    format: 'cohere',
    signupUrl: 'https://cohere.com',
    freeInfo: '1,000 req/month · 20 req/min · permanent free tier',
    note: 'Shared quota across all models.',
  },

  github_models: {
    name: 'GitHub Models', icon: '🐙',
    baseURL: 'https://models.inference.ai.azure.com',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-3.2-90B-Vision-Instruct',
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'meta-llama/Meta-Llama-3.1-405B-Instruct',
      'meta-llama/Meta-Llama-3.1-70B-Instruct',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/o1',
      'openai/o1-mini',
      'openai/o3-mini',
      'mistral-ai/Mistral-large',
      'mistral-ai/Mistral-large-2407',
      'mistral-ai/Mistral-small',
      'mistral-ai/Mistral-Nemo',
      'deepseek/DeepSeek-R1',
      'Cohere/command-r-plus-08-2024',
      'Cohere/command-r-08-2024',
      'microsoft/Phi-3.5-MoE-instruct',
      'microsoft/Phi-3.5-mini-instruct',
      'microsoft/Phi-4',
      'AI21/jamba-1.5-large',
      'AI21/jamba-1.5-mini'
    ],
    rateLimit: { rpm: 15, rpd: '150 (free) · higher with Copilot plan' },
    format: 'openai',
    signupUrl: 'https://github.com/marketplace/models',
    freeInfo: 'Free with any GitHub account · uses Personal Access Token',
    note: 'Create a PAT at github.com/settings/tokens (no scopes needed). GPT-4o and o-series included free.',
  },

  cloudflare: {
    name: 'Cloudflare Workers AI', icon: '☁️',
    baseURL: null, // built dynamically per account
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    models: [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-fp8',
      '@cf/meta/llama-3.1-8b-instruct-awq',
      '@cf/meta/llama-3.2-1b-instruct',
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/meta/llama-3-8b-instruct',
      '@cf/meta/llama-2-7b-chat-int8',
      '@cf/mistral/mistral-7b-instruct-v0.2',
      '@hf/mistral/mistral-7b-instruct-v0.2',
      '@cf/google/gemma-2b-it-lora',
      '@cf/google/gemma-7b-it-lora',
      '@cf/qwen/qwen1.5-0.5b-chat',
      '@cf/qwen/qwen1.5-1.8b-chat',
      '@cf/qwen/qwen1.5-7b-chat-awq',
      '@cf/qwen/qwen1.5-14b-chat-awq',
      '@cf/microsoft/phi-2',
      '@cf/tinyllama/tinyllama-1.1b-chat-v1.0',
      '@cf/openchat/openchat-3.5-0106',
      '@cf/thebloke/discolm-german-7b-v1-awq',
      '@hf/nousresearch/hermes-2-pro-mistral-7b',
      '@cf/deepseek-ai/deepseek-math-7b-instruct'
    ],
    rateLimit: { rpd: '10,000 neurons/day' },
    format: 'cloudflare',
    signupUrl: 'https://dash.cloudflare.com',
    freeInfo: '10,000 neurons/day · permanent free tier · needs Account ID + API Key',
    note: 'Free even without a paid plan. Create multiple CF accounts to multiply quota.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ENV VAR PREFIX MAP — _2 _3 … _10 suffixes add more slots per provider
// ─────────────────────────────────────────────────────────────────────────────
const ENV_PREFIXES = {
  groq:          'GROQ_API_KEY',
  cerebras:      'CEREBRAS_API_KEY',
  openrouter:    'OPENROUTER_API_KEY',
  google_ai:     'GOOGLE_AI_KEY',
  nvidia:        'NVIDIA_API_KEY',
  mistral:       'MISTRAL_API_KEY',
  codestral:     'CODESTRAL_API_KEY',
  huggingface:   'HUGGINGFACE_API_KEY',
  cohere:        'COHERE_API_KEY',
  github_models: 'GITHUB_TOKEN',
  // cloudflare handled separately below (needs ACCOUNT_ID + API_KEY pair)
};

// Override default models from environment
for (const [id, prefix] of Object.entries(ENV_PREFIXES)) {
  const envKey = prefix.replace(/_API_KEY|_TOKEN|_KEY$/, '') + '_DEFAULT_MODEL';
  if (process.env[envKey]) PROVIDER_DEFS[id].defaultModel = process.env[envKey];
}
if (process.env.CF_DEFAULT_MODEL) PROVIDER_DEFS.cloudflare.defaultModel = process.env.CF_DEFAULT_MODEL;

// ─────────────────────────────────────────────────────────────────────────────
//  SMART ROUTER: MODEL TIERS & SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_TIERS = {
  // Tier 1 (Light & Fast)
  'llama-3.1-8b-instant': 1, 'llama3.1-8b': 1, 'meta/llama-3.1-8b-instruct': 1,
  'meta-llama/llama-3.2-3b-instruct:free': 1, 'meta-llama/Llama-3.2-3B-Instruct': 1,
  'meta-llama/llama-3.1-8b-instruct:free': 1, 'meta-llama/llama-3.2-1b-instruct:free': 1,
  'meta-llama/Llama-3.2-1B-Instruct': 1, 'meta-llama/Meta-Llama-3-8B-Instruct': 1,
  'meta-llama/Meta-Llama-3.1-8B-Instruct': 1, 'llama3-8b-8192': 1,
  'gemma2-9b-it': 1, 'google/gemma-2-9b-it:free': 1, 'google/gemma-2-9b-it': 1,
  'google/gemma-2-2b-it': 1, 'gemma-3-4b-it': 1, 'gemma-3-1b-it': 1,
  'mistral-small-latest': 1, 'mistral-ai/Mistral-small': 1,
  'mistralai/mistral-7b-instruct:free': 1, 'mistralai/Mistral-7B-Instruct-v0.3': 1,
  'mistralai/mistral-nemo-12b-instruct': 1, 'mistralai/Mistral-Nemo-Instruct-2407': 1,
  'open-mistral-nemo': 1, 'mistral-ai/Mistral-Nemo': 1,
  'ministral-3b-latest': 1, 'ministral-8b-latest': 1,
  'microsoft/Phi-3.5-mini-instruct': 1,
  'microsoft/Phi-3.5-MoE-instruct': 1, 'Phi-4-mini-instruct': 1,
  'qwen/qwen-2.5-7b-instruct:free': 1, 'qwen/qwen2.5-7b-instruct': 1, 'Qwen/Qwen2.5-7B-Instruct': 1,
  'openai/gpt-4o-mini': 1, 'gemini-2.5-flash-lite-preview-06-17': 1,
  'gemini-2.5-flash': 1, 'gemini-2.0-flash': 1, 'gemini-2.0-flash-lite-preview-02-05': 1,
  'gemini-1.5-flash': 1, 'gemini-1.5-flash-8b': 1,
  'command-light': 1, 'c4ai-aya-expanse-8b': 1, 'command-r7b-12-2024': 1,
  '@cf/meta/llama-3.1-8b-instruct': 1, '@cf/meta/llama-3.1-8b-instruct-fp8': 1,
  '@cf/meta/llama-3.1-8b-instruct-awq': 1, '@cf/meta/llama-3.2-1b-instruct': 1,
  '@cf/meta/llama-3.2-3b-instruct': 1, '@cf/meta/llama-3-8b-instruct': 1,
  '@cf/meta/llama-2-7b-chat-int8': 1, '@cf/mistral/mistral-7b-instruct-v0.2': 1,
  '@hf/mistral/mistral-7b-instruct-v0.2': 1, '@cf/google/gemma-2b-it-lora': 1,
  '@cf/google/gemma-7b-it-lora': 1, '@cf/qwen/qwen1.5-0.5b-chat': 1,
  '@cf/qwen/qwen1.5-1.8b-chat': 1, '@cf/qwen/qwen1.5-7b-chat-awq': 1,
  '@cf/microsoft/phi-2': 1, '@cf/tinyllama/tinyllama-1.1b-chat-v1.0': 1,

  // Tier 3 (Heavy Duty / Code / Reasoning)
  'deepseek-ai/deepseek-r1': 3, 'deepseek/DeepSeek-R1': 3, 'deepseek/deepseek-r1:free': 3,
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B': 3, 'deepseek-r1-distill-llama-70b': 3,
  'openai/gpt-4o': 3, 'openai/o1': 3, 'openai/o1-mini': 3, 'openai/o3-mini': 3,
  'meta-llama/llama-3.3-70b-instruct:free': 3, 'llama-3.3-70b-versatile': 3,
  'meta-llama/Llama-3.3-70B-Instruct': 3, 'meta/llama-3.3-70b-instruct': 3,
  'llama3.1-70b': 3, 'llama3.3-70b': 3, 'meta-llama/Meta-Llama-3.1-70B-Instruct': 3,
  'meta-llama/Meta-Llama-3.1-405B-Instruct': 3, 'meta/llama-3.1-70b-instruct': 3,
  'meta/llama-3.1-405b-instruct': 3, 'nousresearch/hermes-3-llama-3.1-405b:free': 3,
  'qwen/qwen-2.5-72b-instruct:free': 3, 'qwen/qwen2.5-72b-instruct': 3, 'Qwen/Qwen2.5-72B-Instruct': 3,
  'qwen/qwen2.5-coder-32b-instruct': 3, 'Qwen/Qwen2.5-Coder-32B-Instruct': 3, 'qwen/qwen3-coder:free': 3,
  'codestral-latest': 3, 'codestral-2405': 3, 'codestral-2501': 3,
  'mistral-large-latest': 3, 'mistralai/mistral-large-2-instruct': 3, 'mistral-ai/Mistral-large': 3,
  'mistral-ai/Mistral-large-2407': 3, 'pixtral-large-latest': 3,
  'nvidia/nemotron-4-340b-instruct': 3, 'nvidia/nemotron-3-super-120b-a12b:free': 3,
  'gemini-1.5-pro': 3, 'gemini-2.0-pro-exp-02-05': 3, 'gemini-2.0-flash-thinking-exp-01-21': 3,
  'command-r-plus-08-2024': 3, 'command-r-plus': 3, 'Cohere/command-r-plus-08-2024': 3,
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 3,
  // All others default to Tier 2
};

function analyzePrompt(messages) {
  let text = '';
  for (const m of messages) if (typeof m.content === 'string') text += m.content + '\n';
  
  let score = 0;
  const paragraphs = text.split(/\n\s*\n/).length;
  score += Math.min(paragraphs * 2, 20); // up to 20
  
  const tokenEst = text.length / 4;
  score += Math.min((tokenEst / 500) * 2, 10); // up to 10
  
  const codeBlocks = (text.match(/```/g) || []).length / 2;
  score += Math.min(codeBlocks * 10, 20); // up to 20
  
  const codeRegex = /\b(function|def|class|struct|interface|import|export|#include|async|await|public|private)\b/g;
  score += Math.min((text.match(codeRegex) || []).length * 2, 20); // up to 20
  
  const logicRegex = /\b(calculate|evaluate|analyze|synthesize|deduce|matrix|derivative|integral|equation|formula|pros and cons|step by step)\b/gi;
  score += Math.min((text.match(logicRegex) || []).length * 5, 30); // up to 30
  
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  if (nonAscii > 50) score += 10; // up to 10
  
  return Math.min(Math.round(score), 100);
}

function getTargetTier(score) {
  if (score <= 30) return 1;
  if (score <= 70) return 2;
  return 3;
}

// ─────────────────────────────────────────────────────────────────────────────
//  KEY POOL — every (provider, key) pair is one independent rotation slot
// ─────────────────────────────────────────────────────────────────────────────
function loadKeyPool() {
  const pool = [];

  // Standard single-key providers
  for (const [providerId, envPrefix] of Object.entries(ENV_PREFIXES)) {
    for (let i = 1; i <= 10; i++) {
      const envVar = i === 1 ? envPrefix : `${envPrefix}_${i}`;
      const vaultKeys = vault.getKeys();
      const key = vaultKeys[envVar] || process.env[envVar];
      if (key && key.trim()) {
        const basePrefix = envPrefix.replace(/_API_KEY|_TOKEN|_KEY$/, '');
        const inAutoPool = process.env[`${basePrefix}_AUTO_POOL`] !== 'false';
        const defModel = PROVIDER_DEFS[providerId].defaultModel;
        const tier = MODEL_TIERS[defModel] || 2;

        pool.push({
          slotId: `${providerId}#${i}`,
          providerId,
          keyIndex: i,
          apiKey: key.trim(),
          baseURL: PROVIDER_DEFS[providerId].baseURL,
          inAutoPool,
          tier,
          stats: { success: 0, failure: 0, rateLimited: 0, lastUsed: null },
        });
      }
    }
  }

  // Cloudflare — needs ACCOUNT_ID + API_KEY pairs
  for (let i = 1; i <= 10; i++) {
    const s = i === 1 ? '' : `_${i}`;
    const accountId = process.env[`CF_ACCOUNT_ID${s}`];
    const apiKey    = process.env[`CF_API_KEY${s}`];
    if (accountId && apiKey) {
      const inAutoPool = process.env.CF_AUTO_POOL !== 'false';
      const defModel = PROVIDER_DEFS.cloudflare.defaultModel;
      const tier = MODEL_TIERS[defModel] || 2;
      
      pool.push({
        slotId: `cloudflare#${i}`,
        providerId: 'cloudflare',
        keyIndex: i,
        apiKey,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
        inAutoPool,
        tier,
        stats: { success: 0, failure: 0, rateLimited: 0, lastUsed: null },
      });
    }
  }

  return pool;
}

const KEY_POOL = loadKeyPool();
const cooldowns  = {};   // slotId → timestamp when cooldown expires
const COOLDOWN_MS = 60_000; // 60s cooldown after a 429

let state = {
  poolIndex: 0,
  requestLog: [],
  providerStats: Object.fromEntries(
    Object.keys(PROVIDER_DEFS).map(id => [id, { success: 0, failure: 0, rateLimited: 0 }])
  ),
  auth: {
    enabled: false,
    applications: []
  }
};

const DATA_FILE = path.join(process.cwd(), 'router_data.json');

function loadState() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.state) {
        state.poolIndex = data.state.poolIndex || 0;
        state.requestLog = data.state.requestLog || [];
        if (data.state.providerStats) {
          Object.assign(state.providerStats, data.state.providerStats);
        }
        if (data.state.auth) {
          state.auth = data.state.auth;
        }
      }
      if (data.slotStats) {
        KEY_POOL.forEach(slot => {
          if (data.slotStats[slot.slotId]) {
            Object.assign(slot.stats, data.slotStats[slot.slotId]);
          }
        });
      }
    } catch (e) {
      console.error('Failed to load router state:', e);
    }
  }
}

function saveState() {
  try {
    const slotStats = {};
    KEY_POOL.forEach(s => { slotStats[s.slotId] = s.stats; });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ state, slotStats }));
  } catch (e) {
    console.error('Failed to save router state:', e);
  }
}

loadState();
setInterval(saveState, 15000); // Save every 15s

process.on('SIGINT', () => { saveState(); process.exit(0); });
process.on('SIGTERM', () => { saveState(); process.exit(0); });

function getNextSlot(excludeSlotIds = [], filterFn = () => true) {
  const now = Date.now();
  const available = KEY_POOL.filter(
    s => !excludeSlotIds.includes(s.slotId) && !(cooldowns[s.slotId] > now) && filterFn(s)
  );
  if (!available.length) return null;
  state.poolIndex = (state.poolIndex + 1) % available.length;
  return available[state.poolIndex];
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROVIDER ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────
async function callSlot(slot, messages, model, opts = {}) {
  const def          = PROVIDER_DEFS[slot.providerId];
  const headers      = { 'Content-Type': 'application/json' };
  const resolvedModel = (model && model !== 'auto') ? model : def.defaultModel;

  // ── Cohere ──────────────────────────────────────────────────────────────────
  if (def.format === 'cohere') {
    headers['Authorization'] = `Bearer ${slot.apiKey}`;
    const systemMsg  = messages.find(m => m.role === 'system');
    const rest       = messages.filter(m => m.role !== 'system');
    const lastUser   = [...rest].reverse().find(m => m.role === 'user');
    const chatHistory = rest.slice(0, -1).map(m => ({
      role:    m.role === 'assistant' ? 'CHATBOT' : 'USER',
      message: typeof m.content === 'string' ? m.content : m.content[0]?.text || '',
    }));
    const body = {
      model:        resolvedModel,
      message:      typeof lastUser?.content === 'string' ? lastUser.content : lastUser?.content[0]?.text || '',
      chat_history: chatHistory,
      preamble:     systemMsg ? (typeof systemMsg.content === 'string' ? systemMsg.content : systemMsg.content[0]?.text) : undefined,
      max_tokens:   opts.max_tokens || 1024,
    };
    const res = await axios.post(`${slot.baseURL}/chat`, body, { headers, timeout: 30000 });
    return {
      id:      res.data.generation_id || `cohere-${Date.now()}`,
      object:  'chat.completion',
      choices: [{ message: { role: 'assistant', content: res.data.text }, finish_reason: 'stop', index: 0 }],
      model:   resolvedModel,
      usage:   { prompt_tokens: res.data.meta?.tokens?.input_tokens, completion_tokens: res.data.meta?.tokens?.output_tokens },
      _provider: slot.slotId,
    };
  }

  // ── Cloudflare ───────────────────────────────────────────────────────────────
  if (def.format === 'cloudflare') {
    headers['Authorization'] = `Bearer ${slot.apiKey}`;
    const res  = await axios.post(
      `${slot.baseURL}/chat/completions`,
      { model: resolvedModel, messages, max_tokens: opts.max_tokens || 1024, stream: false },
      { headers, timeout: 30000 }
    );
    const data = res.data?.result || res.data;
    return {
      id:      data.id || `cf-${Date.now()}`,
      object:  'chat.completion',
      choices: data.choices || [{ message: { role: 'assistant', content: data.response || '' }, finish_reason: 'stop', index: 0 }],
      model:   resolvedModel,
      usage:   data.usage,
      _provider: slot.slotId,
    };
  }

  // ── OpenAI-compatible (Groq, Cerebras, OpenRouter, Google AI, NVIDIA, Mistral,
  //    Codestral, HuggingFace, GitHub Models) ───────────────────────────────────
  headers['Authorization'] = `Bearer ${slot.apiKey}`;
  if (def.extraHeaders) Object.assign(headers, def.extraHeaders);

  const res = await axios.post(
    `${slot.baseURL}/chat/completions`,
    { model: resolvedModel, messages, max_tokens: opts.max_tokens || 1024, temperature: opts.temperature ?? 0.7, stream: false },
    { headers, timeout: 45000 }
  );
  return { ...res.data, _provider: slot.slotId };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN ROUTE  POST /v1/chat/completions
// ─────────────────────────────────────────────────────────────────────────────
app.post('/v1/chat/completions', async (req, res) => {
  if (vault.isLocked()) {
    return res.status(401).json({
      error: { message: 'Vault is locked. Please enter your Master Password in the Dashboard to unlock LLM Router.', type: 'vault_locked', code: 401 }
    });
  }

  let { messages, model, max_tokens, temperature } = req.body;

  let activeApp = null;
  if (state.auth.enabled) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Authentication required. Please provide a Bearer token.' } });
    }
    const token = authHeader.split(' ')[1];
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    activeApp = state.auth.applications.find(a => a.keyHash === hash);
    if (!activeApp) {
      return res.status(401).json({ error: { message: 'Invalid API key.' } });
    }
    
    // Apply App Overrides
    if (activeApp.modelOverride) {
      model = activeApp.modelOverride;
    }
  }

  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: { message: 'messages array is required' } });

  if (!KEY_POOL.length)
    return res.status(503).json({ error: { message: 'No API keys configured. Copy .env.example → .env and add at least one key.' } });

  const triedSlots  = [];
  const maxAttempts = Math.min(KEY_POOL.length, 30);

  let routingMode = process.env.ROUTING_MODE || 'smart';
  let customModels = (process.env.CUSTOM_POOL_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);

  if (activeApp && activeApp.routingMode !== 'inherit') {
    routingMode = activeApp.routingMode === 'smart_auto' ? 'smart' : 'custom';
    if (routingMode === 'custom' && activeApp.customPoolModels && activeApp.customPoolModels.length > 0) {
      customModels = activeApp.customPoolModels;
    }
  }

  let targetTier = null;
  if (model === 'auto' && routingMode === 'smart') {
    const score = analyzePrompt(messages);
    targetTier = getTargetTier(score);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let slot;
    let activeModel = model;
    
    if (model === 'auto') {
      if (routingMode === 'custom' && customModels.length > 0) {
        slot = getNextSlot(triedSlots, s => PROVIDER_DEFS[s.providerId].models.some(m => customModels.includes(m)));
        if (slot) {
          activeModel = customModels.find(m => PROVIDER_DEFS[slot.providerId].models.includes(m));
        }
      } else {
        slot = getNextSlot(triedSlots, s => s.inAutoPool && s.tier === targetTier);
        if (!slot) {
          const fallbacks = [2, 3, 1].filter(t => t !== targetTier);
          slot = getNextSlot(triedSlots, s => s.inAutoPool && s.tier === fallbacks[0]);
          if (!slot) slot = getNextSlot(triedSlots, s => s.inAutoPool && s.tier === fallbacks[1]);
        }
        if (!slot) slot = getNextSlot(triedSlots, s => s.inAutoPool);
      }
    } else if (model && model !== 'router-default') {
      slot = getNextSlot(triedSlots, s => PROVIDER_DEFS[s.providerId].models.includes(model));
    }
    
    // Ultimate fallback if nothing specific matched
    if (!slot) slot = getNextSlot(triedSlots);

    if (!slot) break;

    triedSlots.push(slot.slotId);
    slot.stats.lastUsed = new Date().toISOString();

    try {
      const result = await callSlot(slot, messages, activeModel, { max_tokens, temperature });
      slot.stats.success++;
      state.providerStats[slot.providerId].success++;

      const log = {
        ts: new Date().toISOString(), slotId: slot.slotId, providerId: slot.providerId,
        providerName: PROVIDER_DEFS[slot.providerId].name, keyIndex: slot.keyIndex,
        model: result.model, status: 'success', attempts: attempt + 1,
        prompt_tokens: result.usage?.prompt_tokens, completion_tokens: result.usage?.completion_tokens,
      };
      state.requestLog.unshift(log);
      if (state.requestLog.length > 500) state.requestLog.pop();

      if (activeApp) {
        activeApp.stats.requests++;
        activeApp.lastUsedAt = Date.now();
      }

      return res.json({ ...result, _router: { slot: slot.slotId, attempts: attempt + 1 } });

    } catch (err) {
      const status = err.response?.status;
      const isRL   = status === 429;

      if (isRL) {
        slot.stats.rateLimited++;
        state.providerStats[slot.providerId].rateLimited++;
        cooldowns[slot.slotId] = Date.now() + COOLDOWN_MS;
      } else {
        slot.stats.failure++;
        state.providerStats[slot.providerId].failure++;
      }

      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      state.requestLog.unshift({
        ts: new Date().toISOString(), slotId: slot.slotId, providerId: slot.providerId,
        providerName: PROVIDER_DEFS[slot.providerId].name, keyIndex: slot.keyIndex,
        status: isRL ? 'rate_limited' : status === 401 ? 'auth_error' : 'error',
        error: errMsg, attempts: attempt + 1,
      });
      if (state.requestLog.length > 500) state.requestLog.pop();
      // continue → next slot
    }
  }

  if (activeApp) {
    activeApp.stats.failures++;
    activeApp.lastUsedAt = Date.now();
  }
  res.status(502).json({
    error: { message: `All ${triedSlots.length} slot(s) tried — all rate-limited or failed.`, tried: triedSlots },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  STATUS / ADMIN API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const providers = {};
  for (const [id, def] of Object.entries(PROVIDER_DEFS)) {
    providers[id] = {
      id, name: def.name, icon: def.icon, defaultModel: def.defaultModel,
      models: def.models, rateLimit: def.rateLimit,
      signupUrl: def.signupUrl, freeInfo: def.freeInfo, note: def.note,
      keyCount: KEY_POOL.filter(s => s.providerId === id).length,
      slots: KEY_POOL.filter(s => s.providerId === id).map(s => ({
        slotId: s.slotId, keyIndex: s.keyIndex, stats: s.stats,
        coolingDown: !!(cooldowns[s.slotId] && cooldowns[s.slotId] > now),
        cooldownSecsLeft: cooldowns[s.slotId] ? Math.max(0, Math.ceil((cooldowns[s.slotId] - now) / 1000)) : 0,
      })),
      aggregateStats: state.providerStats[id],
    };
  }
  res.json({
    totalSlots:  KEY_POOL.length,
    activeSlots: KEY_POOL.filter(s => !(cooldowns[s.slotId] > now)).length,
    providers,
    requestLog: state.requestLog.slice(0, 100),
    auth: state.auth,
    modelTiers: MODEL_TIERS
  });
});

app.post('/api/reset-stats', (req, res) => {
  KEY_POOL.forEach(s => { s.stats = { success: 0, failure: 0, rateLimited: 0, lastUsed: null }; });
  Object.keys(state.providerStats).forEach(id => { state.providerStats[id] = { success: 0, failure: 0, rateLimited: 0 }; });
  state.requestLog = [];
  Object.keys(cooldowns).forEach(k => delete cooldowns[k]);
  res.json({ ok: true });
});

app.get('/api/pool', (req, res) => {
  res.json({ count: KEY_POOL.length, slots: KEY_POOL.map(s => ({ slotId: s.slotId, providerId: s.providerId, keyIndex: s.keyIndex })) });
});

app.get('/api/settings', (req, res) => {
  const envMap = {};
  const allPrefixes = Object.values(ENV_PREFIXES).concat(['CF_ACCOUNT_ID', 'CF_API_KEY']);
  for (const k of Object.keys(process.env)) {
    if (allPrefixes.some(prefix => k.startsWith(prefix)) || k.endsWith('_DEFAULT_MODEL') || k.endsWith('_AUTO_POOL') || k === 'ROUTING_MODE' || k === 'CUSTOM_POOL_MODELS') {
      const val = process.env[k];
      envMap[k] = (k.endsWith('_DEFAULT_MODEL') || k.endsWith('_AUTO_POOL') || k === 'ROUTING_MODE' || k === 'CUSTOM_POOL_MODELS') ? val : (val && val.length > 8 ? val.substring(0,4) + '...' + val.substring(val.length-4) : val);
    }
  }
  res.json({ env: envMap });
});

app.post('/api/telemetry', async (req, res) => {
  const { name, company, role, useCase } = req.body;
  const webhookUrl = "https://discordapp.com/api/webhooks/1514183533646577744/YQkOaOxc9hbmeSkhciZ65mHHMmPwrYmbGX4CWfyF1HEFocJ-O4rHaqWaesD2QZ28SaFt";
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: "🚀 **New App Router Registration!**",
          embeds: [{
            color: 6513361, // #6366f1
            fields: [
              { name: "Name", value: name || "Anonymous", inline: true },
              { name: "Company", value: company || "N/A", inline: true },
              { name: "Role", value: role || "N/A", inline: true },
              { name: "Primary Use Case", value: useCase || "Not specified", inline: false }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (err) {
      console.error('Failed to send telemetry to Discord:', err);
    }
  }
  res.json({ ok: true });
});

// Vault Endpoints
app.get('/api/vault/status', (req, res) => {
  res.json({ locked: vault.isLocked(), mode: vault.getMode() });
});

app.post('/api/vault/unlock', (req, res) => {
  if (vault.unlockVault(req.body.password)) {
    KEY_POOL.length = 0;
    KEY_POOL.push(...loadKeyPool());
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid master password' });
  }
});

app.post('/api/vault/set-password', (req, res) => {
  try {
    vault.setMasterPassword(req.body.password); // empty string = revert to hardware
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auth Application Endpoints
const crypto = require('crypto');

app.post('/api/apps/generate', (req, res) => {
  if (vault.isLocked()) return res.status(401).json({ error: 'Vault is locked' });
  const { name, routingMode, modelOverride, customPoolModels } = req.body;
  if (!name) return res.status(400).json({ error: 'App name required' });

  const rawKey = 'llmr_sk_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keySuffix = rawKey.slice(-4);
  const id = 'app_' + crypto.randomBytes(8).toString('hex');

  const appProfile = {
    id, name, keyHash, keySuffix,
    routingMode: routingMode || 'inherit',
    modelOverride: modelOverride || '',
    customPoolModels: Array.isArray(customPoolModels) ? customPoolModels : [],
    stats: { requests: 0, failures: 0 },
    createdAt: Date.now(),
    lastUsedAt: null
  };

  state.auth.applications.push(appProfile);
  saveState();

  // Return the raw key ONLY once.
  res.json({ ok: true, rawKey, appProfile });
});

app.delete('/api/apps/:id', (req, res) => {
  if (vault.isLocked()) return res.status(401).json({ error: 'Vault is locked' });
  state.auth.applications = state.auth.applications.filter(a => a.id !== req.params.id);
  saveState();
  res.json({ ok: true });
});

app.post('/api/apps/settings', (req, res) => {
  if (vault.isLocked()) return res.status(401).json({ error: 'Vault is locked' });
  if (typeof req.body.enabled === 'boolean') {
    state.auth.enabled = req.body.enabled;
    saveState();
  }
  res.json({ ok: true });
});

app.post('/api/settings', (req, res) => {
  if (vault.isLocked()) return res.status(401).json({ error: 'Vault is locked' });
  const updates = req.body;
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  const keyUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k.match(/(_KEY|_TOKEN)(_\d+)?$/)) {
      keyUpdates[k] = v;
      continue;
    }
    
    // Normal non-secret config
    process.env[k] = v;
    // Only process empty if it's a model (to reset to default) or explicitly overriding.
    process.env[k] = v;
    
    const regex = new RegExp(`^${k}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${k}=${v}`);
    } else {
      envContent += `\n${k}=${v}`;
    }

    if (k.endsWith('_DEFAULT_MODEL')) {
      if (k === 'CF_DEFAULT_MODEL') {
        PROVIDER_DEFS.cloudflare.defaultModel = v || PROVIDER_DEFS.cloudflare.models[0];
      } else {
        for (const [id, prefix] of Object.entries(ENV_PREFIXES)) {
          const expectedK = prefix.replace(/_API_KEY|_TOKEN|_KEY$/, '') + '_DEFAULT_MODEL';
          if (k === expectedK) PROVIDER_DEFS[id].defaultModel = v || PROVIDER_DEFS[id].models[0];
        }
      }
    }
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  try {
    vault.updateKeys(keyUpdates);
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }
  
  KEY_POOL.length = 0;
  KEY_POOL.push(...loadKeyPool());
  
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
//  DYNAMIC PORT & STARTUP
// ─────────────────────────────────────────────────────────────────────────────
let argPort = null;
const portIdx = process.argv.findIndex(a => a === '--port' || a === '-p');
if (portIdx !== -1 && process.argv[portIdx + 1]) argPort = parseInt(process.argv[portIdx + 1], 10);

let currentPort = argPort || process.env.PORT || 3000;
let serverInstance;

app.post('/api/port', (req, res) => {
  const newPort = parseInt(req.body.port, 10);
  if (!newPort || newPort < 1024 || newPort > 65535) return res.status(400).json({ error: 'Invalid port' });

  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (envContent.match(/^PORT=/m)) {
    envContent = envContent.replace(/^PORT=.*$/m, `PORT=${newPort}`);
  } else {
    envContent += `\nPORT=${newPort}\n`;
  }
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

  res.json({ ok: true, port: newPort });

  setTimeout(() => {
    if (serverInstance) {
      serverInstance.close(() => startServer(newPort));
    }
  }, 500);
});

function startServer(port) {
  currentPort = port;
  serverInstance = app.listen(port, () => {
    const byProv = {};
    KEY_POOL.forEach(s => { byProv[s.providerId] = (byProv[s.providerId] || 0) + 1; });

    console.log(`\n⚡ LLM Router — http://localhost:${port}`);
    console.log(`🎯 ${KEY_POOL.length} slot(s) across ${Object.keys(byProv).length} provider(s)\n`);

    if (!KEY_POOL.length) {
      console.log('⚠️  No keys loaded. Copy .env.example → .env and add your free API keys.\n');
    } else {
      Object.entries(byProv).forEach(([id, n]) =>
        console.log(`   ${PROVIDER_DEFS[id]?.icon || '•'} ${PROVIDER_DEFS[id]?.name || id}: ${n} key(s)`)
      );
    }
    console.log(`\n📖 POST  http://localhost:${port}/v1/chat/completions`);
    console.log(`📊 Dashboard: http://localhost:${port}\n`);
  });
}

startServer(currentPort);
