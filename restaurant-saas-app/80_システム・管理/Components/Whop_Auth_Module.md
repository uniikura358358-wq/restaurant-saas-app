---
title: Whop Auth 統合モジュール
description: Whop OAuth2.0 を使用した認証およびメンバーシップ確認ロジック
category: System Module
scalability_score: S
updated_at: 2026-02-16
---

## Whop Auth 統合モジュール

このモジュールは、Whopプラットフォームを使用した認証（SSO）およびサブスクリプション状態（メンバーシップ）の検証を、複数のSaaSアプリ（口コミ返信、Instagram運用等）で共通化するための設計図である。

## 1. 認証フロー (OAuth 2.0 + PKCE)

### Login with Whop ボタン (Frontend)

ユーザーをWhopの承認画面へリダイレクトさせる。

```tsx
// components/WhopLoginButton.tsx
export const WhopLoginButton = () => {
    const clientId = process.env.NEXT_PUBLIC_WHOP_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/whop/callback`);
    const scope = encodeURIComponent("openid email profile billing:memberships:read");
    
    // PKCE用ステート生成（推奨）
    const authUrl = `https://whop.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    return (
        <a href={authUrl} className="flex items-center gap-2 bg-[#FF5C00] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
            <WhopIcon className="w-5 h-5" />
            Whopでログイン
        </a>
    );
};
```

### トークン交換 & メンバーシップ判定 (Backend/API Route)

コールバックURLで取得した `code` を `access_token` に変換し、プランを確認する。

```typescript
// app/api/auth/whop/callback/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // 1. Token Exchange
    const tokenRes = await fetch('https://whop.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.WHOP_CLIENT_ID,
            client_secret: process.env.WHOP_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.WHOP_REDIRECT_URI,
        }),
    });
    const tokens = await tokenRes.json(); // { access_token, refresh_token, ... }

    // 2. メンバーシップ確認 (V2 API)
    const membershipRes = await fetch('https://api.whop.com/api/v2/memberships?status=active', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    const memberships = await membershipRes.json();

    // 3. 有効なプランの判定
    // WhopのProduct IDやPlan IDに基づいて判定
    const activePass = memberships.data.find((m: any) => 
        m.product_id === process.env.WHOP_PRODUCT_ID_BUSINESS || 
        m.product_id === process.env.WHOP_PRODUCT_ID_LIGHT
    );

    if (!activePass) {
        return NextResponse.redirect('/plans?error=no_active_membership');
    }

    // 4. セッション保存 (Cookie/Supabase Auth等)
    // ここでSupabase Authのカスタムトークンを発行するか、独自のJWTセッションを開始
    return NextResponse.redirect('/dashboard');
}
```

## 2. 事業リスク管理 (反証への5つの対策)

### ① APIダウン対策 (接続維持)

- **対策**: `access_token` の取得後、独自のセッション（JWT）を **7日間** 有効にする。
- **実装**: Whop APIが一時的に停止しても、発行済みのアプリセッションが有効であれば、Gatekeeperを通さず利用可能にする。

### ② アカウントBAN対策 (顧客情報保護)

- **対策**: **毎日AM3:00に顧客リストを自動エクスポート。**
- **場所**: `00_経営・戦略/Backup_Customer_List`
- **目的**: 万が一Whopが利用不可になっても、メールアドレスベースでSupabase Auth単体ログインへ切り替えられる冗長性を確保。

### ③ 開発環境のテスト (検証)

- **対策**: Whop Developer Dashboardで **Test Mode** を有効化。
- **運用**: `.env.local` にてテスト用の `CLI_API_KEY` を使い、実際に課金せずモックデータで開発を回す。

### ④ プラン変更の即時反映 (同期)

- **対策**: ダッシュボードに「**プラン情報を更新**」ボタンを設置。
- **ロジック**: キャッシュを無視して最新の `/memberships` APIを叩き、セッション情報を上書きする。

### ⑤ 複数アプリ間のログイン維持 (SSO)

- **対策**: 全アプリを同一ルートドメインのサブドメインで運用。
- **設定**: Cookieのパスを `Domain=.yourdomain.com` に指定し、口コミ返信アプリでログインすれば、Instagramアプリでもログイン済み状態にする。

## 3. 次のステップ (横展開)

1. `src/hooks/useWhopAuth.ts` の作成（各アプリ共通）
2. 各ページへの `withWhopGuard` (HOC) の適用
3. Supabase AuthとのID紐付け（uuidとしての統合）
