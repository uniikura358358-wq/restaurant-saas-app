import { createBrowserClient } from '@supabase/ssr'

// 環境変数のバリデーション
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

export const createClient = () =>
    createBrowserClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    )

// シングルトンインスタンス
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = () => {
    if (!supabaseInstance) {
        supabaseInstance = createClient()
    }
    return supabaseInstance
}

// デフォルトエクスポート（既存コードとの互換性のため）
export default supabase()
