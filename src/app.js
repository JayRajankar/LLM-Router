const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { getEnvPath } = require('./setup');
require('dotenv').config({ path: getEnvPath() });

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
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'qwen/qwen3-32b',
      'openai/gpt-oss-20b',
      'groq/compound-mini',
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
      'qwen-3-32b',
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
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-4-31b-it:free',
      'qwen/qwen3-coder:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openai/gpt-oss-120b:free',
      'minimax/minimax-m2.5:free',
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
    defaultModel: 'gemini-2.5-flash-lite-preview-06-17',
    models: [
      'gemini-2.5-flash-lite-preview-06-17',
      'gemini-2.5-flash',
      'gemma-3-27b-it',
      'gemma-3-12b-it',
      'gemma-3-4b-it',
      'gemma-3-1b-it',
    ],
    rateLimit: { rpm: 15, rpd: '500 (Flash-Lite) · 20 (Flash)' },
    format: 'openai',
    signupUrl: 'https://aistudio.google.com',
    freeInfo: '500 req/day (Flash-Lite) · 20 req/day (Gemini Flash)',
    note: 'Data used for training outside EU/EEA/UK/CH. Use Flash-Lite for high volume.',
  },

  nvidia: {
    name: 'NVIDIA NIM', icon: '🟩',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: [
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'mistralai/mistral-7b-instruct-v0.3',
      'qwen/qwen2.5-72b-instruct',
      'google/gemma-3-27b-it',
      'nvidia/nemotron-4-340b-instruct',
      'deepseek-ai/deepseek-r1',
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
      'mistral-small-latest',
      'open-mistral-nemo',
      'open-mixtral-8x7b',
      'open-mixtral-8x22b',
      'mistral-large-latest',
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
    models: ['codestral-latest'],
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
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen2.5-72B-Instruct',
      'google/gemma-2-27b-it',
      'microsoft/Phi-4-mini-instruct',
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
    defaultModel: 'command-r-08-2024',
    models: [
      'command-r-08-2024',
      'command-r-plus-08-2024',
      'command-a-03-2025',
      'command-r7b-12-2024',
      'command-r7b-arabic-02-2025',
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
      'openai/gpt-4o-mini',
      'openai/gpt-4o',
      'mistral-ai/Mistral-small',
      'deepseek/DeepSeek-R1',
      'Phi-4',
      'Phi-4-mini-instruct',
      'openai/o1-mini',
      'openai/o3-mini',
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
      '@cf/qwen/qwen2.5-coder-32b-instruct',
      '@cf/google/gemma-4-26b-a4b-it',
      '@cf/openai/gpt-oss-120b',
      '@cf/moonshotai/kimi-k2.5',
      '@cf/moonshotai/kimi-k2.6',
      '@cf/qwen/qwen3-30b-a3b-fp8',
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

// ─────────────────────────────────────────────────────────────────────────────
//  KEY POOL — every (provider, key) pair is one independent rotation slot
// ─────────────────────────────────────────────────────────────────────────────
function loadKeyPool() {
  const pool = [];

  // Standard single-key providers
  for (const [providerId, envPrefix] of Object.entries(ENV_PREFIXES)) {
    for (let i = 1; i <= 10; i++) {
      const envVar = i === 1 ? envPrefix : `${envPrefix}_${i}`;
      const key = process.env[envVar];
      if (key && key.trim()) {
        pool.push({
          slotId: `${providerId}#${i}`,
          providerId,
          keyIndex: i,
          apiKey: key.trim(),
          baseURL: PROVIDER_DEFS[providerId].baseURL,
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
      pool.push({
        slotId: `cloudflare#${i}`,
        providerId: 'cloudflare',
        keyIndex: i,
        apiKey,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
        stats: { success: 0, failure: 0, rateLimited: 0, lastUsed: null },
      });
    }
  }

  return pool;
}

const KEY_POOL = loadKeyPool();
const cooldowns  = {};   // slotId → timestamp when cooldown expires
const COOLDOWN_MS = 60_000; // 60s cooldown after a 429

const state = {
  poolIndex: 0,
  requestLog: [],
  providerStats: Object.fromEntries(
    Object.keys(PROVIDER_DEFS).map(id => [id, { success: 0, failure: 0, rateLimited: 0 }])
  ),
};

function getNextSlot(excludeSlotIds = []) {
  const now = Date.now();
  const available = KEY_POOL.filter(
    s => !excludeSlotIds.includes(s.slotId) && !(cooldowns[s.slotId] > now)
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
  const { messages, model, max_tokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: { message: 'messages array is required' } });

  if (!KEY_POOL.length)
    return res.status(503).json({ error: { message: 'No API keys configured. Copy .env.example → .env and add at least one key.' } });

  const triedSlots  = [];
  const maxAttempts = Math.min(KEY_POOL.length, 30);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slot = getNextSlot(triedSlots);
    if (!slot) break;

    triedSlots.push(slot.slotId);
    slot.stats.lastUsed = new Date().toISOString();

    try {
      const result = await callSlot(slot, messages, model, { max_tokens, temperature });
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

  res.status(503).json({
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

// ─────────────────────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const byProv = {};
  KEY_POOL.forEach(s => { byProv[s.providerId] = (byProv[s.providerId] || 0) + 1; });

  console.log(`\n⚡ LLM Router — http://localhost:${PORT}`);
  console.log(`🎯 ${KEY_POOL.length} slot(s) across ${Object.keys(byProv).length} provider(s)\n`);

  if (!KEY_POOL.length) {
    console.log('⚠️  No keys loaded. Copy .env.example → .env and add your free API keys.\n');
    return;
  }
  Object.entries(byProv).forEach(([id, n]) =>
    console.log(`   ${PROVIDER_DEFS[id]?.icon || '•'} ${PROVIDER_DEFS[id]?.name || id}: ${n} key(s)`)
  );
  console.log(`\n📖 POST  http://localhost:${PORT}/v1/chat/completions`);
  console.log(`📊 Dashboard: http://localhost:${PORT}\n`);
});
