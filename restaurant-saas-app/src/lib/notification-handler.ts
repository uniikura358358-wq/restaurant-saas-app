/**
 * 通知ハンドラ
 *
 * 機能:
 * - 星数に応じた通知判定
 * - メール/SMS送信のアダプターパターン
 * - 重複排除（last_notified_at）
 * - 夜間サイレント判定
 * - 入力バリデーション（メール/電話番号）
 * - SMS月間送信制限（sms-quota.ts と連携、store_usage テーブル参照）
 *
 * 注意: SMS送信前には必ず store_usage テーブルを参照し、月間上限を
 *       超えていないかバリデーションを行うこと（.cursorrules 準拠）。
 */

// --- 型定義 ---

/** 通知設定（DBカラム notification_config と対応） */
interface NotificationConfig {
    email_enabled: boolean;
    sms_enabled: boolean;
    email_address: string;
    phone_number: string;
    /** メールアドレスが確認済みかどうか */
    email_verified: boolean;
    /** 電話番号が確認済みかどうか */
    phone_verified: boolean;
    target_stars: number[];
    silent_hours: {
        start: string; // "HH:mm" 形式
        end: string;
    };
    last_notified_at: string | null;
}

/** 料金プランの種別 */
type PlanType = "free" | "basic" | "premium" | "enterprise";

/**
 * プラン別SMS月間送信上限（参考値）
 * 実際の上限は store_settings.sms_limit_override で管理する
 * 将来のプラン拡張時はここに追加するだけで対応可能
 */
const SMS_MONTHLY_LIMITS: Record<PlanType, number> = {
    free: 0,       // 無料プラン: SMS不可
    basic: 10,     // 基本プラン: 月10件
    premium: 20,   // 上級プラン: 月20件
    enterprise: 50, // 法人プラン: 月50件
};

/** 通知対象のレビューデータ */
interface ReviewData {
    reviewId: string;
    rating: number;
    reviewerName: string;
    reviewText: string;
    storeName: string;
    receivedAt: string;
}

/** 通知送信結果 */
interface NotificationResult {
    sent: boolean;
    channel: "email" | "sms";
    error?: string;
}

/** SMS利用状況（sms-quota.ts から渡される） */
interface SmsUsageInfo {
    /** 今月の送信済み件数 */
    sent: number;
    /** 月間上限件数 */
    limit: number;
    /** 残り送信可能件数 */
    remaining: number;
}

// --- 通知プロバイダ・インターフェース（アダプターパターン） ---

/**
 * 送信プロバイダのインターフェース
 * Resend / Twilio / SendGrid 等を差し替え可能にする
 */
interface NotificationProvider {
    sendEmail(to: string, subject: string, body: string): Promise<NotificationResult>;
    sendSms(to: string, message: string): Promise<NotificationResult>;
}

// --- デフォルト設定 ---

/** デフォルトの通知設定 */
const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
    email_enabled: false,
    sms_enabled: false,
    email_address: "",
    phone_number: "",
    email_verified: false,
    phone_verified: false,
    target_stars: [1, 2],
    silent_hours: { start: "23:00", end: "08:00" },
    last_notified_at: null,
};

/** 重複排除の最小間隔（5分 = 300000ミリ秒）— リスク対策5: API連打防止と併用 */
const DEDUP_INTERVAL_MS = 5 * 60 * 1000;

// --- バリデーション ---

/** メールアドレスの形式チェック */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 国際電話番号の形式チェック（+81 等） */
const PHONE_REGEX = /^\+\d{1,3}\d{7,14}$/;

/**
 * メールアドレスの形式を検証する
 */
export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim());
}

/**
 * 国際電話番号の形式を検証する
 * 例: +819012345678
 */
export function isValidPhone(phone: string): boolean {
    return PHONE_REGEX.test(phone.replace(/[\s-]/g, ""));
}

// --- 夜間サイレント判定 ---

/**
 * 現在時刻が夜間サイレント時間帯に該当するか判定する
 *
 * @param silentHours - サイレント時間帯（HH:mm 形式）
 * @param now - 判定時刻（デフォルト: 現在時刻）
 * @returns サイレント時間帯内なら true
 */
export function isSilentHour(
    silentHours: { start: string; end: string },
    now: Date = new Date()
): boolean {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = silentHours.start.split(":").map(Number);
    const [endH, endM] = silentHours.end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // 日をまたぐ場合（例: 23:00 〜 08:00）
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    // 日をまたがない場合（例: 01:00 〜 06:00）
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// --- 重複排除（クールタイム — リスク対策5） ---

/**
 * 直前の通知から十分な間隔が経過しているか判定する
 *
 * @param lastNotifiedAt - 直前の通知時刻（ISO文字列 or null）
 * @returns 通知可能なら true
 */
export function canNotify(lastNotifiedAt: string | null): boolean {
    if (!lastNotifiedAt) return true;
    const elapsed = Date.now() - new Date(lastNotifiedAt).getTime();
    return elapsed > DEDUP_INTERVAL_MS;
}

// --- SMS送信残枠チェック（DB連携 — sms-quota.ts と併用） ---

/**
 * SMS送信が月間上限内かを判定する
 *
 * @param smsUsage - sms-quota.ts から取得した利用状況
 * @returns 送信可能なら true
 */
export function canSendSms(smsUsage: SmsUsageInfo): boolean {
    return smsUsage.remaining > 0;
}

/**
 * SMS月間残り送信可能件数を返す
 *
 * @param smsUsage - sms-quota.ts から取得した利用状況
 * @returns 残り送信可能件数
 */
export function getRemainingSmsCount(smsUsage: SmsUsageInfo): number {
    return smsUsage.remaining;
}

/**
 * プラン別のSMS月間上限件数を取得する（参考値）
 * 実際の上限は store_settings.sms_limit_override で管理する
 */
export function getSmsMonthlyLimit(plan: PlanType = "basic"): number {
    return SMS_MONTHLY_LIMITS[plan];
}

// --- 通知判定 ---

/**
 * 通知を送信すべきかを総合的に判定する
 *
 * @param rating - 口コミの星数
 * @param config - 通知設定
 * @returns 通知すべきなら true
 */
export function shouldNotify(
    rating: number,
    config: NotificationConfig = DEFAULT_NOTIFICATION_CONFIG
): boolean {
    // 通知が無効の場合
    if (!config.email_enabled && !config.sms_enabled) return false;

    // 対象星数に含まれていない場合
    if (!config.target_stars.includes(rating)) return false;

    // 夜間サイレント時間帯の場合
    if (isSilentHour(config.silent_hours)) return false;

    // 重複排除（直前の通知から十分な間隔が経過していない場合）
    if (!canNotify(config.last_notified_at)) return false;

    return true;
}

// --- プレースホルダ送信プロバイダ ---

/**
 * プレースホルダの通知プロバイダ
 * 将来的に Resend / Twilio 等に差し替える
 */
const placeholderProvider: NotificationProvider = {
    async sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
        // TODO: Resend / SendGrid 連携時に実装
        console.log(`[通知] メール送信（プレースホルダ）: to=${to}, subject=${subject}, body=${body.substring(0, 50)}...`);
        return { sent: true, channel: "email" };
    },

    async sendSms(to: string, message: string): Promise<NotificationResult> {
        // TODO: Twilio 連携時に実装
        console.log(`[通知] SMS送信（プレースホルダ）: to=${to}, message=${message.substring(0, 50)}...`);
        return { sent: true, channel: "sms" };
    },
};

// --- 通知メッセージ生成 ---

/**
 * 通知メッセージを生成する（事実ベース）
 */
function buildNotificationContent(review: ReviewData): { subject: string; body: string } {
    const subject = `【${review.storeName}】星${review.rating}の口コミを受信しました`;
    const body = [
        `店舗: ${review.storeName}`,
        `評価: 星${review.rating}`,
        `投稿者: ${review.reviewerName}`,
        `内容: ${review.reviewText.substring(0, 100)}${review.reviewText.length > 100 ? "…" : ""}`,
        `受信日時: ${review.receivedAt}`,
        "",
        "管理画面で確認してください。",
    ].join("\n");

    return { subject, body };
}

// --- 統合ハンドラ ---

/**
 * レビューの緊急通知を処理する統合ハンドラ
 *
 * SMS送信前には必ず store_usage テーブルの月間上限を確認すること。
 * 送信成功時には sms_sent_count をインクリメントする処理を別途実行すること。
 *
 * @param review - レビューデータ
 * @param config - 通知設定
 * @param smsUsage - SMS利用状況（sms-quota.ts から取得）
 * @param provider - 送信プロバイダ（省略時はプレースホルダ）
 * @returns 送信結果の配列
 */
export async function handleNotification(
    review: ReviewData,
    config: NotificationConfig = DEFAULT_NOTIFICATION_CONFIG,
    smsUsage: SmsUsageInfo = { sent: 0, limit: 10, remaining: 10 },
    provider: NotificationProvider = placeholderProvider
): Promise<NotificationResult[]> {
    // 通知判定
    if (!shouldNotify(review.rating, config)) {
        return [];
    }

    const { subject, body } = buildNotificationContent(review);
    const results: NotificationResult[] = [];

    // メール通知
    if (config.email_enabled && config.email_address && isValidEmail(config.email_address)) {
        try {
            const result = await provider.sendEmail(config.email_address, subject, body);
            results.push(result);
        } catch (error) {
            results.push({
                sent: false,
                channel: "email",
                error: error instanceof Error ? error.message : "メール送信に失敗しました",
            });
        }
    }

    // SMS通知（月間上限チェック付き — store_usage テーブル参照）
    if (config.sms_enabled && config.phone_number && isValidPhone(config.phone_number)) {
        // 月間送信上限チェック（リスク対策1,3: DB連携、上限到達通知）
        if (!canSendSms(smsUsage)) {
            results.push({
                sent: false,
                channel: "sms",
                error: `SMS月間送信上限（${smsUsage.limit}件）に達しました。上位プランへのアップグレードで送信可能件数が増加します。`,
            });

            // リスク対策3: SMS枠切れ時はメールでフォールバック通知
            if (config.email_enabled && config.email_address && isValidEmail(config.email_address)) {
                try {
                    const fallbackResult = await provider.sendEmail(
                        config.email_address,
                        `【SMS枠切れ通知】${review.storeName} - 新しい口コミがあります`,
                        `SMS送信枠（月${smsUsage.limit}件）を使い切りました。\n\n${body}`
                    );
                    results.push({ ...fallbackResult, channel: "email" });
                } catch {
                    // フォールバックの失敗は無視
                }
            }
        } else {
            try {
                // SMSは簡潔に
                const smsMessage = `【${review.storeName}】星${review.rating}の口コミを受信。管理画面で確認してください。`;
                const result = await provider.sendSms(config.phone_number, smsMessage);
                results.push(result);
                // 注意: 送信成功後、呼び出し元で incrementSmsCount() を実行すること
            } catch (error) {
                results.push({
                    sent: false,
                    channel: "sms",
                    error: error instanceof Error ? error.message : "SMS送信に失敗しました",
                });
            }
        }
    }

    return results;
}

// --- 型のエクスポート ---
export type { NotificationConfig, ReviewData, NotificationResult, NotificationProvider, PlanType, SmsUsageInfo };
export { DEFAULT_NOTIFICATION_CONFIG, SMS_MONTHLY_LIMITS };
