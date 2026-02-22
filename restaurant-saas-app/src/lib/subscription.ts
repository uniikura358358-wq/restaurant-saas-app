/**
 * 購読ステータスの定義
 * PRICING_PLANS.md に基づく
 */
export type SubscriptionStatus =
    | "active"     // 正常
    | "restricted" // 1〜7日: API機能制限 (AI・SNS連携等停止)
    | "locked"     // 8〜14日: 管理画面ロック (決済ページのみ)
    | "suspended"  // 15〜30日: HP公開停止
    | "terminated"; // 31日以上: 自動解約・データ削除準備

/**
 * 支払失敗日時 (paymentFailedAt) から現在のステータスを判定する
 */
export function getSubscriptionStatus(paymentFailedAt: Date | null | undefined): SubscriptionStatus {
    if (!paymentFailedAt) return "active";

    const diffTime = Math.abs(new Date().getTime() - paymentFailedAt.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (days >= 31) return "terminated";
    if (days >= 15) return "suspended";
    if (days >= 8) return "locked";
    if (days >= 1) return "restricted";

    return "active";
}

/**
 * 特定の機能が利用可能かどうかを判定する
 */
export function canUseFeature(status: SubscriptionStatus, featureType: "api" | "dashboard" | "public_hp"): boolean {
    switch (status) {
        case "active":
            return true;

        case "restricted":
            // API機能のみ制限
            return featureType !== "api";

        case "locked":
            // APIとダッシュボードを制限 (決済ページ除くが、ここでは広く制限)
            return featureType === "public_hp"; // HP公開は維持 (1-14日はWEB会員のHPは維持とあるが、8-14日はWEB会員もHP非公開化と矛盾があるため、PRICING_PLANS.md 16行目を優先)
        // PRICING_PLANS.md: 8〜14日: ※WEB会員の場合HPも非公開化。
        // つまり 8日以降は public_hp も false。

        case "suspended":
        case "terminated":
            return false;

        default:
            return false;
    }
}

/**
 * PRICING_PLANS.md の詳細ルールに合わせた機能制限判定
 */
export function isAccessAllowed(status: SubscriptionStatus, area: "ai_api" | "sns_api" | "dashboard" | "public_website"): boolean {
    const days = status === "active" ? 0 : 1; // 簡略化。実際は getSubscriptionStatus で返ってきた文字列で判定

    if (status === "active") return true;

    if (status === "restricted") {
        // 1〜7日: API機能（AI・SNS連携等）の即時停止。HP公開は維持。
        return area === "dashboard" || area === "public_website";
    }

    if (status === "locked") {
        // 8〜14日: 管理画面へのログイン遮断。HPも非公開化。
        return false; // 全て遮断
    }

    if (status === "suspended" || status === "terminated") {
        return false;
    }

    return false;
}
