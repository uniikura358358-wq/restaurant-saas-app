const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// マルチライン JSON キーを抽出するためのより確実な方法
let serviceAccountKey = "";
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY="({[\s\S]*?})"/);
if (match) {
    serviceAccountKey = match[1];
}

async function verify() {
    let log = "--- Vertex AI Opening Test (V4) ---\n";

    if (!serviceAccountKey) {
        fs.writeFileSync('scripts/test_result.txt', "ERROR: Could not extract FIREBASE_SERVICE_ACCOUNT_KEY from .env.local", 'utf8');
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

        // 2.0 Flash (User's 2.5 Flash)
        const modelId = 'gemini-2.0-flash-001';
        log += `Testing Model: ${modelId}\n`;

        const model = vertexAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent('Say OK in Japanese');
        const response = await result.response;
        log += `✅ SUCCESS: ${response.candidates[0].content.parts[0].text}\n`;
    } catch (error) {
        log += `❌ FAILED\n`;
        log += `Message: ${error.message}\n`;
        if (error.stack) log += `Stack: ${error.stack}\n`;

        // Vertex AI / Google Cloud エラーの詳細を抽出
        if (error.response) {
            log += `API Status: ${error.response.status}\n`;
            log += `API Data: ${JSON.stringify(error.response.data, null, 2)}\n`;
        } else if (error.errors) {
            log += `Additional Errors: ${JSON.stringify(error.errors, null, 2)}\n`;
        }
    }

    fs.writeFileSync('scripts/test_result.txt', log, 'utf8');
    console.log("Done. Check scripts/test_result.txt");
}

verify();
