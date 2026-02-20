import { chromium } from 'playwright';

/**
 * Google 審査用自動デモスクリプト
 * 
 * 実行方法:
 * 1. サーバーを起動 (npm run dev)
 * 2. 別のターミナルで実行: npx tsx scripts/generate-demo-video.ts
 */
async function runDemo() {
    // ブラウザの起動 (headless: false で実際の動きを見せる)
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000, // 動きを分かりやすくするためにゆっくりにする
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: 'public/videos/demo/' } // 動画を自動録画
    });

    const page = await context.newPage();

    try {
        console.log('🎬 デモ開始: ログイン画面へ');
        await page.goto('http://localhost:3000/login', { waitUntil: 'load' });
        await page.waitForTimeout(4000); // UIの描画待ちを長めに

        // 管理者デモパネルを特定してボタンを探す
        console.log('🔑 デモログインボタンを探します');

        // テキストで直接探す方法と、セレクターで探す方法を併用
        const standardDemoButton = page.locator('button').filter({ hasText: '標準' });
        const loginButton = page.locator('button:has-text("ログイン")').first();

        if (await standardDemoButton.isVisible()) {
            await standardDemoButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await standardDemoButton.click();
            console.log('🖱️ 「標準」プランボタンをクリックしました');
        } else if (await loginButton.isVisible()) {
            console.log('🖱️ 通常ログインボタンをクリックします');
            await loginButton.click();
        } else {
            console.log('⚠️ ボタンが見つかりません。直接ダッシュボードへ遷移を試みます。');
            // ここでLocalStorageに強制的にデモフラグを立てる
            await page.evaluate(() => {
                localStorage.setItem("demo_user", "true");
                localStorage.setItem("simulatedPlan", "Standard");
            });
            await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
        }

        // ダッシュボードへの遷移を待機
        await page.waitForURL('**/dashboard', { timeout: 20000 });
        await page.waitForLoadState('networkidle');

        // 念のため、要素が表示されるまで待つ
        await page.waitForSelector('text=ダッシュボード', { timeout: 10000 });

        console.log('📊 ダッシュボード表示成功');
        await page.waitForTimeout(3000);

        // 2. 店舗設定画面の見学
        console.log('⚙️ 店舗設定の確認');
        await page.click('text=店舗設定');
        await page.waitForTimeout(2000);

        // Google口コミタブへ
        await page.click('text=Google口コミ');
        await page.waitForTimeout(2000);

        // タイムラグ設定などをスクロールして見せる
        await page.evaluate(() => window.scrollBy(0, 400));
        await page.waitForTimeout(2000);

        // 3. 口コミ同期デモ
        console.log('🔄 口コミ同期の実行');
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);

        // ボタンのテキストやアイコンをより広く探索
        const syncButton = page.locator('button:has-text("同期"), button:has-text("更新")').first();
        if (await syncButton.isVisible()) {
            await syncButton.scrollIntoViewIfNeeded();
            await syncButton.click();
            console.log('✅ 同期完了 (Mockデータ注入)');
            await page.waitForTimeout(6000); // 同期後のリスト描画を待機
        }

        // 4. AI返信の生成と送信
        console.log('🤖 AI返信の生成');

        // 「返信が必要」なタブやカードを探す
        const replyButton = page.locator('button:has-text("返信")').first();
        if (await replyButton.isVisible()) {
            await replyButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await replyButton.click();
            console.log('🖱️ 返信ボタンをクリックしました');

            // AI生成の待機
            await page.waitForTimeout(7000);

            console.log('🚀 返信の送信（確定）');
            const sendButton = page.locator('button:has-text("送信"), button:has-text("確定")').first();
            if (await sendButton.isVisible()) {
                await sendButton.click();
                await page.waitForTimeout(4000);
            }
        } else {
            console.log('⚠️ 返信ボタンが見つかりませんでした。');
        }

        console.log('🏁 デモ終了');
    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
    } finally {
        await page.waitForTimeout(2000);
        await browser.close();
        console.log('🎥 動画が public/videos/demo/ に保存されました。');
    }
}

runDemo();
