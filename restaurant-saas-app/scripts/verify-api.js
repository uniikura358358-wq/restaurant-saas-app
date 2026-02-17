const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

// .env.localから環境変数を簡易ロード
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match) {
        let key = match[1].trim();
        let val = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = val;
    }
});

async function verify() {
    console.log('--- Vertex AI Opening Test ---');
    const serviceAccountKey = env['FIREBASE_SERVICE_ACCOUNT_KEY'];

    if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is missing in .env.local');
        return;
    }

    try {
        const credentials = JSON.parse(serviceAccountKey);
        const projectId = credentials.project_id;
        console.log(`Using Project ID: ${projectId}`);

        const vertexAI = new VertexAI({
            project: projectId,
            location: 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                }
            }
        });

        // ユーザー指定の Gemini 2.5 Flash (2.0 Flash) をテスト
        const modelId = 'gemini-2.0-flash-001';
        console.log(`Testing Model: ${modelId}...`);

        const model = vertexAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent('Say "Hello, connectivity test passed!" in Japanese.');

        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        console.log('✅ Success!');
        console.log('Response:', text);
    } catch (error) {
        console.error('❌ Failed!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
    }
}

verify();
