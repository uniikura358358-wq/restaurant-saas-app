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
    console.log('--- Vertex AI Opening Test (V2) ---');
    const serviceAccountKey = env['FIREBASE_SERVICE_ACCOUNT_KEY'];

    if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is missing');
        return;
    }

    try {
        const credentials = JSON.parse(serviceAccountKey);
        const projectId = credentials.project_id;
        console.log(`Using Project ID: ${projectId}`);
        console.log(`Using Client Email: ${credentials.client_email}`);

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

        // 2.0 Flash (User's 2.5 Flash)
        const modelId = 'gemini-2.0-flash-001';
        console.log(`Testing Model: ${modelId}...`);

        const model = vertexAI.getGenerativeModel({
            model: modelId,
            generationConfig: { maxOutputTokens: 20 }
        });

        const result = await model.generateContent('Say OK');
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        console.log('✅ Success!');
        console.log('Response:', text);
    } catch (error) {
        console.error('❌ Test Execution Failed');
        if (error.response) {
            console.error('API Error Response:', JSON.stringify(error.response, null, 2));
        } else {
            console.error('Error Details:', error);
        }
        process.exit(1);
    }
}

verify();
