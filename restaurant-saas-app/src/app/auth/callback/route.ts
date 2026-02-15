import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    let next = searchParams.get('next') ?? '/settings'

    // 【対策2：オープンリダイレクト防御】
    // nextが外部URL（http...）や不正な形式（//など）の場合は強制的に/settingsへ
    if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/settings'
    }

    if (code) {
        try {
            const supabase = await createClient()

            // 【対策3：ネットワークエラー・タイムアウト対応】
            const { error } = await supabase.auth.exchangeCodeForSession(code)

            if (!error) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // 【対策1：有効期限切れの判定】
            if (error.message.includes('expired') || error.status === 401) {
                return NextResponse.redirect(`${origin}/login?error=expired_token`)
            }

        } catch {
            // 通信エラーなどの予期せぬ失敗
            return NextResponse.redirect(`${origin}/login?error=network_error`)
        }
    }

    // 基本的な認証失敗
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}