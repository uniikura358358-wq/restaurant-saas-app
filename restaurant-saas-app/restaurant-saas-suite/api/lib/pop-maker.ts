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
    [key: string]: any;
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
        shadow?: string;
        stroke?: string;
    }>;
}

export interface ManualPosition {
    x: number;
    y: number;
    scale?: number;
    rotate?: number;
}

export interface PopShape {
    id: string;
    type: "line" | "rect" | "circle";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    rotate: number;
    zIndex: number;
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
    shapes: PopShape[];
    elementScales: Record<string, number>;
    elementStyles: Record<string, {
        shadow?: string;
        stroke?: string;
        glass?: boolean;
        letterSpacing?: string;
        lineHeight?: string;
        color?: string;
        rotate?: number;
    }>;
    isWizardMode: boolean;
    wizardStep: number;
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
