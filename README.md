<div align="center">
  <h1>🔀 LLM Router</h1>
  <p><b>A high-performance, round-robin proxy across 11 permanently free LLM API providers.</b></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
</div>

<br />

LLM Router is a lightweight Node.js/Express proxy that aggregates permanently free LLM APIs (like Groq, Cerebras, OpenRouter, Google Gemini, and more) into a **single, unified OpenAI-compatible endpoint**. 

It automatically handles rate limits, implements round-robin key rotation (supporting multiple accounts/keys per provider), and falls back gracefully when a provider fails or hits a quota.

## ✨ Features

- **OpenAI-Compatible API**: Drop-in replacement for OpenAI SDKs and tools. Just point your `baseURL` to `http://localhost:3000/v1`.
- **11 Free Providers**: Pre-configured with the best permanent free tiers available today.
- **Intelligent Routing**: Automatic round-robin load balancing across all configured API keys.
- **Rate Limit Handling**: Detects `429 Too Many Requests` and places the exhausted key on a temporary cooldown, seamlessly routing the request to the next available slot.
- **Multiple Keys**: Multiply your quotas by providing multiple keys for the same provider (e.g., `GROQ_API_KEY_1`, `GROQ_API_KEY_2`).
- **Real-time Dashboard**: Built-in visual dashboard to monitor key health, success rates, and rate-limits.

## 🧠 Supported Providers & Free Tiers

| Provider | Default Model | Free Quota / Notes |
|----------|---------------|--------------------|
| **⚡ Groq** | `llama-3.3-70b-versatile` | 1,000 req/day (70B) · Fastest inference available |
| **🧠 Cerebras** | `llama3.1-8b` | 14,400 req/day · Huge daily quota, great fallback |
| **🔀 OpenRouter** | `meta-llama/llama-3.3-70b-instruct:free` | 50 req/day (free models) |
| **🔮 Google AI Studio** | `gemini-2.5-flash-lite-preview-06-17` | 500 req/day (Flash-Lite) · 20 req/day (Flash) |
| **🟩 NVIDIA NIM** | `meta/llama-3.3-70b-instruct` | 40 req/min · Permanently free |
| **🌬️ Mistral La Plateforme** | `mistral-small-latest` | 500K tokens/min |
| **💻 Mistral Codestral** | `codestral-latest` | 2,000 req/day · Code-specialised model |
| **🤗 HuggingFace Inference** | `meta-llama/Llama-3.3-70B-Instruct` | $0.10/month in free credits (renews monthly) |
| **🌊 Cohere** | `command-r-08-2024` | 1,000 req/month · 20 req/min |
| **🐙 GitHub Models** | `meta-llama/Llama-3.3-70B-Instruct` | 150 req/day (free) · Uses GitHub PAT |
| **☁️ Cloudflare Workers AI** | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 10,000 neurons/day · Needs Account ID + API Key |

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/llm-router.git
cd llm-router
npm install
```

### 2. Configure API Keys
Copy the example environment file and add your API keys:
```bash
cp .env.example .env
```
Open `.env` and fill in the keys for the providers you want to use. You only need **one** key to start, but adding more keys and providers gives you higher limits and better reliability.

**Using Multiple Keys:**
To use multiple keys for a single provider, append `_2`, `_3`, etc., up to `_10`:
```env
GROQ_API_KEY=your_first_key
GROQ_API_KEY_2=your_second_key
```

### 3. Start the Server

**Option A: Using Docker (Recommended)**
The easiest way to run and deploy the router is using Docker Compose. It ensures a consistent environment:
```bash
docker-compose up -d
```

**Option B: Using Node.js**
If you prefer running it directly on your machine:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

**Option C: Using the Standalone Executable (.exe)**
If you are on Windows, you can compile the router into a single standalone `.exe` that requires no Node.js or Docker installation to run.
First, build the executable:
```bash
npm run build:exe
```
This will generate `llm-router.exe`. You can place this file alongside your `.env` file in any folder and run it directly by double-clicking it.

The server will start on `http://localhost:3000`.

## 💻 Usage

### Making a Request
Since LLM Router is fully OpenAI-compatible, you can make standard Chat Completion requests:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Explain quantum computing in one sentence."}]
  }'
```

*Note: If you omit `model` or set it to `"auto"`, the router will use the default model of whichever provider receives the request.*

### Using with OpenAI SDK (Python)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-dummy" # The router doesn't require an API key from the client
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

## 📊 Dashboard & Admin API

LLM Router includes a built-in UI dashboard and Admin API to monitor your keys.

- **Dashboard UI**: Open `http://localhost:3000` in your browser.
- **Status API**: `GET /api/status` - Returns detailed stats on key success/failure rates, cooldowns, and active slots.
- **Pool Info API**: `GET /api/pool` - View loaded slots.
- **Reset Stats API**: `POST /api/reset-stats` - Clear all success/failure counts and logs.

## 🛠️ Architecture

1. **Key Pool**: On startup, the server reads all keys from `.env` and creates a pool of "slots".
2. **Round Robin**: Requests are distributed sequentially across all available slots in the pool.
3. **Cooldowns**: If a provider returns a `429 Rate Limit` error, that specific slot is put on a 60-second cooldown, and the request is immediately retried on the next available slot.
4. **Adapter Pattern**: A unified adapter normalizes requests/responses between OpenAI-style, Cohere, and Cloudflare formats.

## ⚖️ Legal & Disclaimer

- **Terms of Service**: By using this software, you agree to comply with the Terms of Service (ToS) and Acceptable Use Policies of all third-party LLM providers configured in your `.env` file.
- **Fair Use**: The free tiers provided by these APIs are intended for individual, development, or testing purposes. Do not abuse these services. If you intend to use them for high-volume production traffic, please consider upgrading to their respective paid tiers.
- **Liability**: The authors and contributors of `llm-router` are not responsible for any bans, quota exhaustion, or account suspensions that may result from excessive usage or ToS violations of the proxied services. Use responsibly and at your own risk.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
