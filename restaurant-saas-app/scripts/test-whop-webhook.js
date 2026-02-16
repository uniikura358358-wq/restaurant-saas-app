/**
 * Whop Webhook Simulation Script
 * 
 * このスクリプトは、Whop からの Webhook を擬似的に送信し、
 * ローカル環境（http://localhost:3000）でのメンバーシップ同期をテストします。
 * 
 * 使用方法:
 * 1. .env.local に WHOP_WEBHOOK_SECRET が設定されていることを確認。
 * 2. node scripts/test-whop-webhook.js <テストしたいメールアドレス>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 1. .env.local から秘密鍵を読み込む
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
    const match = envContent.match(new RegExp(`^${name}=["']?([^"'\r\n]+)["']?`, 'm'));
    return match ? match[1] : null;
}

const secret = getEnvVar('WHOP_WEBHOOK_SECRET');
const businessProductId = getEnvVar('WHOP_PRODUCT_ID_BUSINESS');
const email = process.argv[2] || 'test@example.com';

if (!secret) {
    console.error('Error: WHOP_WEBHOOK_SECRET が .env.local に見つかりません。');
    process.exit(1);
}

// 2. Webhook ペイロードの作成
const payload = {
    action: 'membership.created',
    data: {
        id: 'mem_test_' + Date.now(),
        product_id: businessProductId || 'prod_business_id',
        status: 'active',
        user: {
            email: email
        }
    }
};

const body = JSON.stringify(payload);

// 3. 署名の作成 (Whop の仕様に合わせる)
const hmac = crypto.createHmac('sha256', secret);
const signature = hmac.update(body).digest('hex');

// 4. 送信
async function sendWebhook() {
    console.log(`Sending simulated webhook for: ${email}`);
    console.log(`Action: ${payload.action}`);
    console.log(`Product ID: ${payload.data.product_id}`);

    try {
        const response = await fetch('http://localhost:3000/api/auth/whop/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-whop-signature': signature
            },
            body: body
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Webhook sent successfully!');
            console.log('Result:', JSON.stringify(result, null, 2));
        } else {
            console.error('❌ Webhook failed.');
            console.error('Status:', response.status);
            console.error('Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

sendWebhook();
