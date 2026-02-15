export const STRIPE_PLANS = {
    // Sets (17% OFF)
    BUSINESS: {
        id: 'price_business_monthly', // Placeholder
        name: 'Standard Plan',
        price: 9800,
        interval: 'month',
        type: 'set',
        yearly: {
            id: 'price_business_yearly', // Placeholder
            price: 97600,
            discountLabel: '17% OFF / 約2ヶ月分無料',
            badge: '🥇'
        }
    },
    BUSINESS_PREMIUM: {
        id: 'price_business_premium_monthly',
        name: 'Premium Plan',
        price: 12800,
        interval: 'month',
        type: 'set',
        yearly: {
            id: 'price_business_premium_yearly',
            price: 127400,
            discountLabel: '17% OFF / 最も選ばれています',
            badge: '🏆'
        }
    },

    // Singles (13% OFF)
    LIGHT: {
        id: 'price_light_monthly',
        name: 'Light Plan',
        price: 2480,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_light_yearly',
            price: 25800,
            discountLabel: '13% OFF / 1.5ヶ月分無料',
            badge: '🥈'
        }
    },
    STANDARD: {
        id: 'price_standard_monthly',
        name: 'Standard (Instagram)',
        price: 7980,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_standard_yearly',
            price: 83300,
            discountLabel: '13% OFF / 1.5ヶ月分無料',
            badge: '🥈'
        }
    },
    AI_POP: {
        id: 'price_ai_pop_monthly',
        name: 'AI POP / メニュー作成',
        price: 2480,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_ai_pop_yearly',
            price: 25800,
            discountLabel: '13% OFF / 1.5ヶ月分無料',
            badge: '🥈'
        }
    },
    CRM: {
        id: 'price_crm_monthly',
        name: '顧客管理・分析AI',
        price: 2480,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_crm_yearly',
            price: 25800,
            discountLabel: '13% OFF / 1.5ヶ月分無料',
            badge: '🥈'
        }
    },
    DAILY_MENU: {
        id: 'price_daily_menu_monthly',
        name: '日替わりメニュー特化プラン',
        price: 3480,
        interval: 'month',
        type: 'single',
        yearly: {
            id: 'price_daily_menu_yearly',
            price: 36200,
            discountLabel: '13% OFF / 1.5ヶ月分無料',
            badge: '🥇'
        }
    },

    // HP Creation
    HP_CREATION: {
        initial: 39800,
        maintenance: {
            monthly: 2480,
            yearly: 25800 // 13% OFF (Same as single plans)
        },
        daily_menu: {
            monthly: 3480,
            yearly: 36200
        }
    }
};

export const STRIPE_CONFIG = {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};
