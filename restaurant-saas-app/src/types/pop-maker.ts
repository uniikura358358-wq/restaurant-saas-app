/**
 * POP Makerで使用される主要な型定義
 */

export type PopCategory = "japanese" | "western" | "others";
export type CurrencyUnit = "円" | "￥" | "$";

export interface MenuItem {
    name: string;
    price: string;
    image?: string;
}

export interface PhotoArea {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
}

export interface PopLayout {
    photoAreas?: PhotoArea[];
    detectedStyle?: string;
    recommendedColor?: string;
    recommendedBgColor?: string;
    styleType?: string;
    layout?: Record<string, any>;
    bg?: string;
    decorations?: any[];
    productLayout?: any;
    productName?: any;
    price?: any;
    catchphrase?: any;
    description?: any;
    productBoundingBox?: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    zones?: Record<string, {
        zone: string;
        fontSize: number;
        align: "left" | "center" | "right";
        glass?: boolean;
        color?: string;
    }>;
}

export interface ManualPosition {
    x: number;
    y: number;
    scale?: number;
}

export interface PopState {
    [key: string]: any; // 動的アクセスのためのインデックスシグネチャ
    menuItems: MenuItem[];
    currencyUnit: CurrencyUnit;
    itemCategory: string;
    features: string;
    catchphrase: string;
    description: string;
    productImage: string | null;
    backgroundCustomImage: string | null;
    fontFamily: string;
    fontScale: number;
    aiLayout: PopLayout | null;
    manualPositions: Record<string, ManualPosition>;
    verticalText: Record<string, boolean>;
    style: string;
    elementScales: Record<string, number>;
}

export interface FavoritePop extends PopState {
    id: string;
    timestamp: string;
}

export interface ChatMessage {
    role: "user" | "model";
    content: string;
    images?: string[];
}
