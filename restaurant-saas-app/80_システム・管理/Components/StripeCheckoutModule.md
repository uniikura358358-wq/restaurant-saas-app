---
uuid: 4a2b3c4d-5e6f-7a8b-9c0d-1e2f3g4h5i6j
created_date: 2026-02-16
last_modified: 2026-02-16
author: Antigravity
type: component
project: cross-functional
tags: 
  - Stripe
  - Checkout
  - Next.js
status: draft
scalability_score: S:即転用可
tech_stack: [Stripe, Next.js, TypeScript, Supabase]
---

# Stripe Checkout 統合モジュール

## Overview
複数プロダクト（Google口コミ、Instagram等）で共通利用可能なStripe Checkoutセッション作成API。顧客ID、価格ID、メタデータを動的に受け取り、日本国内向けの銀行振込オプション（JP Bank Transfer）にも対応する。

## Dependencies
- `stripe`: ^14.0.0
- `next`: ^14.0.0

## Code Block

### 1. API Route (`src/app/api/stripe/checkout/route.ts`)
```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/stripe/config";

const stripe = new Stripe(STRIPE_CONFIG.secretKey!, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, planName, billingCycle, productType } = await req.json();

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "customer_balance"],
      payment_method_options: {
        customer_balance: {
          funding_type: "bank_transfer",
          bank_transfer: { type: "jp_bank_transfer" },
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        userId,
        planName,
        billingCycle,
        productType, // 'google-review', 'instagram', etc.
      },
      success_url: `${origin}/settings/account?success=true`,
      cancel_url: `${origin}/plans?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

## Integration Guide
1. **環境変数の設定**: `.env.local` に `STRIPE_SECRET_KEY` を設定。
2. **価格設定の定義**: `src/lib/stripe/config.ts` に各種プランの `priceId` を定義。
3. **フロントエンドからの呼び出し**:
   ```typescript
   const response = await fetch('/api/stripe/checkout', {
     method: 'POST',
     body: JSON.stringify({
       priceId: 'price_xxx',
       userId: user.id,
       productType: 'google-review' // ここを切り替えて他プロダクトへ転用
     }),
   });
   const data = await response.json();
   window.location.href = data.url;
   ```

💡 横展開・応用可能性
- **他プロダクトへの転用**: `productType` メタデータを活用することで、同一のStripeアカウント内で売上統計をプロダクトごとに分離可能。Instagram運用ツールや日替わりメニュー作成ツールにも、APIエンドポイントをコピーするだけで即時導入できる。
- **異業種への応用**: 飲食店だけでなく、美容室やサロン向けの予約サブスクリプションにも、フロントエンドのプラン表示を変更するだけで対応可能。
- **モジュール化の提案**: `stripe.checkout.sessions.create` のオプション部分を `config` オブジェクトとして分離し、プロダクトごとに支払い方法（コンビニ決済等）を動的に変更する抽象化レイヤーの作成を推奨。

### Risk Management (反証)
1. **Webhook未実装**: 本コードはセッション作成のみ。決済完了後のDB更新（権限付与）にはWebhook処理が必要。
2. **エラーハンドリングの簡略化**: `stripe.checkout.sessions.create` の失敗時のリトライロジックがない。
3. **セキュリティ**: `userId` をリクエストボディから直接受け取っているが、プロダクト環境ではセッション（Auth）から取得することを推奨。
4. **日本独自仕様の制約**: `jp_bank_transfer` はStripe側での有効化設定が必要であり、設定漏れがあるとエラーになる。
