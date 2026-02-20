import crypto from 'crypto';

/**
 * Canva OAuth 関連の定数
 */
export const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
export const CANVA_TOKEN_URL = 'https://www.canva.com/api/oauth/token';

export const CANVA_SCOPES = [
    'design:content:read',
    'design:content:write',
    'asset:read',
    'asset:write',
    'brandtemplate:meta:read',
    'brandtemplate:content:read',
    'profile:read'
].join(' ');

/**
 * PKCE 用の code_verifier を生成
 */
export function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * code_verifier から code_challenge を生成 (S256)
 */
export function generateCodeChallenge(verifier: string): string {
    return crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
}

/**
 * Canva のアクセストークンを取得・更新するためのユーティリティ
 */
export async function getCanvaToken(code: string, codeVerifier: string) {
    const basicAuth = Buffer.from(
        `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(CANVA_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.CANVA_REDIRECT_URI || '',
            code_verifier: codeVerifier,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(`Canva Token Error: ${JSON.stringify(error)}`);
    }

    return res.json();
}

/**
 * リフレッシュトークンを使用してアクセストークンを更新
 */
export async function refreshCanvaToken(refreshToken: string) {
    const basicAuth = Buffer.from(
        `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(CANVA_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(`Canva Refresh Error: ${JSON.stringify(error)}`);
    }

    return res.json();
}
