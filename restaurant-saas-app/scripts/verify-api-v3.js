const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

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
    let log = "--- Vertex AI Opening Test (V3) ---\n";
    const serviceAccountKey = env['FIREBASE_SERVICE_ACCOUNT_KEY'];

    if (!serviceAccountKey) {
        fs.writeFileSync('scripts/test_result.txt', "ERROR: Missing FIREBASE_SERVICE_ACCOUNT_KEY", 'utf8');
        return;
    }

    try {
        const credentials = JSON.parse(serviceAccountKey);
        const vertexAI = new VertexAI({
            project: credentials.project_id,
            location: 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                }
            }
        });

        const modelId = 'gemini-2.0-flash-001';
        log += `Testing Model: ${modelId}\n`;

        const model = vertexAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent('OK');
        const response = await result.response;
        log += `✅ SUCCESS: ${response.candidates[0].content.parts[0].text}\n`;
    } catch (error) {
        log += `❌ FAILED\n`;
        log += `Message: ${error.message}\n`;
        if (error.stack) log += `Stack: ${error.stack}\n`;
        if (error.response) log += `Response Details: ${JSON.stringify(error.response.data || error.response, null, 2)}\n`;
    }

    fs.writeFileSync('scripts/test_result.txt', log, 'utf8');
    console.log("Done. Check scripts/test_result.txt");
}

verify();
