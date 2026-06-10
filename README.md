<div align="center">
  <h1>🔀 LLM Router</h1>
  <p><b>A high-performance, native desktop application and proxy router across 11 permanently free LLM API providers.</b></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
</div>

<br />

LLM Router is a lightweight proxy and standalone desktop application that aggregates permanently free LLM APIs (like Groq, OpenRouter, Google Gemini, GitHub Models, and more) into a **single, unified OpenAI-compatible endpoint**. 

It handles rate limits, automatic round-robin key rotation (supporting multiple accounts/keys per provider), intelligent NLP complexity routing, and dynamic custom model load-balancing.

## ✨ Features

- **OpenAI-Compatible API**: Drop-in replacement for OpenAI SDKs and tools. Just point your `baseURL` to `http://127.0.0.1:3000/v1`.
- **11 Free Providers**: Pre-configured with the best permanent free tiers available today, automatically mapped to over 100+ frontier models.
- **Advanced Routing Strategies**:
  - **🧠 Smart Auto Mode**: Automatically calculates a mathematical Complexity Score (0-100) for your prompt in real-time, categorizing it into Tier 1 (Light), Tier 2 (General), or Tier 3 (Heavy/Reasoning), and routing it to the absolute best available provider.
  - **⚙️ Custom Pool Mode**: Select from a master list of 100+ models. The router will exclusively load-balance across providers that support the specific models in your pool.
- **Rate Limit Handling**: Detects `429 Too Many Requests` and places the exhausted key on a temporary cooldown, seamlessly retrying the request on the next available slot.
- **Multiple Keys**: Multiply your quotas by providing multiple keys for the same provider (e.g., `GROQ_API_KEY_1`, `GROQ_API_KEY_2`).
- **Tabbed Native Dashboard**: Beautiful, built-in visual dashboard to monitor key health, success rates, rate-limits, and routing configurations—shipped as a native desktop app!

## 🧠 Supported Providers & Free Tiers

| Provider | Top Models Included | Free Quota / Notes |
|----------|---------------------|--------------------|
| **⚡ Groq** | `llama-3.3-70b`, `deepseek-r1-distill`, `qwen` | 1,000 req/day (70B) · Fastest inference available |
| **🧠 Cerebras** | `llama3.1-8b`, `llama3.3-70b` | 14,400 req/day · Huge daily quota, great fallback |
| **🔀 OpenRouter** | `llama-3.3-70b:free`, `dolphin`, `deepseek` | 50 req/day (free models) |
| **🔮 Google AI Studio** | `gemini-2.0-flash`, `gemini-1.5-pro` | 1,500 req/day (Flash) · 50 req/day (Pro) |
| **🟩 NVIDIA NIM** | `meta/llama-3.1-405b`, `deepseek-r1` | 40 req/min · Permanently free |
| **🌬️ Mistral La Plateforme**| `mistral-large`, `pixtral` | 500K tokens/min |
| **💻 Mistral Codestral** | `codestral-latest`, `codestral-2501` | 2,000 req/day · Code-specialised model |
| **🤗 HuggingFace Inference** | `Qwen2.5-72B`, `Phi-3.5` | $0.10/month in free credits (renews monthly) |
| **🌊 Cohere** | `command-r-plus`, `command-r` | 1,000 req/month · 20 req/min |
| **🐙 GitHub Models** | `gpt-4o`, `o1-mini`, `o3-mini`, `DeepSeek-R1`| 150 req/day (free) · Uses GitHub PAT |
| **☁️ Cloudflare Workers AI**| `@cf/meta/llama-3.3-70b`, `qwen`, `tinyllama` | 10,000 neurons/day · Needs Account ID + API Key |

## 🚀 Getting Started

### 1. The Native Desktop App (Recommended)
You can compile LLM Router into a lightweight, native desktop executable using Tauri. This gives you a standalone app with a system tray icon, Splash Screen, and native UI, wrapping the NodeJS backend entirely!

```bash
cd tauri-app
npm install
npm run tauri build
```
This generates an installer (e.g. `.msi`, `.dmg`, `.AppImage`) in the Tauri output directories.

### 2. Standalone Server (Headless/Docker)

If you prefer running just the backend proxy:
```bash
git clone https://github.com/JayRajankar/LLM-Router.git
cd LLM-Router
npm install
```

Copy the example environment file and add your API keys:
```bash
cp .env.example .env
```
*(You only need **one** key to start. To use multiple keys for a single provider, append `_2`, `_3`, etc., up to `_10`: `GROQ_API_KEY_2=your_key`)*

Start the server:
```bash
npm start
```

## 💻 Usage

### 1. Using Dashboard Routing (Smart Auto / Custom Pool)
Pass `"auto"` as the model name. The router will delegate the decision to your active Dashboard settings.
- If **Smart Auto** is active, it analyzes the prompt complexity and sends it to the best tier.
- If **Custom Pool** is active, it round-robins exclusively across your selected custom models.

```bash
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Explain quantum computing in one sentence."}]
  }'
```

### 2. Requesting a Specific Model (Direct Override)
If you need a specific model, pass its exact ID (e.g., `"deepseek-r1"`). The router will completely bypass the dashboard logic, scan your 11 providers, and exclusively load-balance across whichever providers support that exact model natively.

### Using with OpenAI SDK (Python)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3000/v1",
    api_key="sk-dummy" # The router doesn't require an API key from the client
)

response = client.chat.completions.create(
    model="auto", # Or change this to a specific model like "meta/llama-3.1-70b-instruct"
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

## 📊 Dashboard & Architecture

LLM Router includes a built-in UI dashboard. Just open `http://127.0.0.1:3000` (or launch the Desktop App).

1. **Dashboard Tab**: Monitor your keys, rate-limits, success logs, and use the built-in Playground.
2. **Providers Tab**: View exactly which of the 11 providers are active and mapped.
3. **Routing Strategies Tab**: Switch between **Smart Auto** (NLP scoring) and **Custom Pool** (Manual model subset load-balancing).

## ⚖️ Legal & Disclaimer

- **Terms of Service**: By using this software, you agree to comply with the Terms of Service (ToS) and Acceptable Use Policies of all third-party LLM providers configured in your `.env` file.
- **Fair Use**: The free tiers provided by these APIs are intended for individual, educational, development, or testing purposes. Do not abuse these services. Not intended for high-volume production traffic.
- **Liability**: The authors and contributors are not responsible for any bans, quota exhaustion, or account suspensions that may result from excessive usage or ToS violations of the proxied services. Use responsibly and at your own risk.

## ☕ Support
If you enjoy this tool, please consider supporting the developer:
**[Support Jay Rajankar](https://www.chai4.me/jayrajankar)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
