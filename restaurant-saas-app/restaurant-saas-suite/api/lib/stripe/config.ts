export const STRIPE_PLANS = {
    // 【集客特化モード】(Singles)
    STANDARD: {
        id: 'price_standard_monthly',
        name: 'Standard (集客特化)',
        price: 3980,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_standard_yearly',
            price: 43780,
            discountLabel: '1ヶ月分お得',
            badge: '🥈'
        }
    },
    PRO: {
        id: 'price_pro_monthly',
        name: 'Pro (集客特化)',
        price: 9800,
        interval: 'month',
        type: 'set',
        yearly: {
            id: 'price_pro_yearly',
            price: 98000,
            discountLabel: '2ヶ月分お得',
            badge: '🥇'
        }
    },
    PRO_PREMIUM: {
        id: 'price_pro_premium_monthly',
        name: 'Pro Premium (集客特化)',
        price: 14800,
        interval: 'month',
        type: 'set',
        yearly: {
            id: 'price_pro_premium_yearly',
            price: 148000,
            discountLabel: '2ヶ月分お得',
            badge: '🏆'
        }
    },

    // 【HP制作モード】(HP packages)
    WEB_LIGHT: {
        id: 'price_web_light_monthly',
        name: 'web Light',
        price: 3280,
        interval: 'month',
        type: 'package',
        yearly: {
            id: 'price_web_light_yearly',
            price: 36080,
            discountLabel: '1ヶ月分お得',
            badge: '🥈'
        }
    },
    WEB_STANDARD: {
        id: 'price_web_standard_monthly',
        name: 'web Standard',
        price: 3980,
        interval: 'month',
        type: 'package',
        yearly: {
            id: 'price_web_standard_yearly',
            price: 43780,
            discountLabel: '1ヶ月分お得',
            badge: '🥈'
        }
    },
    WEB_PRO: {
        id: 'price_web_pro_monthly',
        name: 'web Pro',
        price: 9800,
        interval: 'month',
        type: 'package',
        yearly: {
            id: 'price_web_pro_yearly',
            price: 98000,
            discountLabel: '2ヶ月分お得',
            badge: '🥇'
        }
    },
    WEB_PRO_PREMIUM: {
        id: 'price_web_pro_premium_monthly',
        name: 'web Pro Premium',
        price: 14800,
        interval: 'month',
        type: 'package',
        yearly: {
            id: 'price_web_pro_premium_yearly',
            price: 148000,
            discountLabel: '2ヶ月分お得',
            badge: '🏆'
        }
    },

    // Legacy / Add-ons (Keep for compatibility if needed)
    AI_POP: {
        id: 'price_ai_pop_monthly',
        name: 'AI POP / メニュー作成',
        price: 2480,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_ai_pop_yearly',
            price: 25800,
            discountLabel: '1.5ヶ月分お得',
            badge: '🥈'
        }
    },

    // HP Creation Expense
    HP_CREATION: {
        initial: 39800,
        maintenance: {
            monthly: 0, // Now included in web plans
            yearly: 0
        }
    }
};

export const STRIPE_CONFIG = {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};
