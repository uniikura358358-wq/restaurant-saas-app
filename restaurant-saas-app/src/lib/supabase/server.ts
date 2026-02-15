import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        // クッキーの書き込み（Server ActionsやRoute Handlersで有効）
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // Server Componentから呼ばれた場合は書き込めないが、無視して問題ない
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        // クッキーの削除
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // 同上
                    }
                },
            },
        }
    )
}