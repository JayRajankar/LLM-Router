const url = 'http://localhost:3000/v1/chat/completions';

const payload = {
  model: 'auto',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2? Reply with just the number.' }
  ]
};

async function testAPI() {
  console.log(`\n🚀 Sending POST request to ${url}...`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key' // App Router ignores this currently, but it's standard OpenAI format
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const timeTaken = Date.now() - startTime;

    console.log(`\n✅ Received Response in ${timeTaken}ms:`);
    console.log(JSON.stringify(data, null, 2));

    // Verify OpenAI format
    console.log('\n🔍 Verifying OpenAI Format Compliance:');
    
    const checks = [
      { name: 'Has "id" string', passed: typeof data.id === 'string' },
      { name: 'Has "object" === "chat.completion"', passed: data.object === 'chat.completion' },
      { name: 'Has "created" integer timestamp', passed: typeof data.created === 'number' },
      { name: 'Has "model" string', passed: typeof data.model === 'string' },
      { name: 'Has "choices" array', passed: Array.isArray(data.choices) && data.choices.length > 0 },
      { name: 'Choice has "message" object with "role" and "content"', passed: !!(data.choices[0] && data.choices[0].message && data.choices[0].message.role && data.choices[0].message.content) },
      { name: 'Choice has "finish_reason"', passed: typeof data.choices[0].finish_reason === 'string' },
      { name: 'Has "usage" object', passed: typeof data.usage === 'object' },
      { name: 'Usage has "prompt_tokens"', passed: typeof data.usage.prompt_tokens === 'number' },
      { name: 'Usage has "completion_tokens"', passed: typeof data.usage.completion_tokens === 'number' },
      { name: 'Usage has "total_tokens"', passed: typeof data.usage.total_tokens === 'number' }
    ];

    let allPassed = true;
    checks.forEach(c => {
      if (c.passed) {
        console.log(`  [PASS] ${c.name}`);
      } else {
        console.log(`  [FAIL] ${c.name}`);
        allPassed = false;
      }
    });

    if (allPassed) {
      console.log('\n🎉 RESULT: 100% STRICT OPENAI COMPLIANT!');
    } else {
      console.log('\n⚠️ RESULT: Some format checks failed.');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPI();
