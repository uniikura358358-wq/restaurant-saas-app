'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn, signUp } from '../auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"

// useSearchParamsを利用するため、Suspenseでラップした子コンポーネントを作成
function LoginFormContent() {
    const searchParams = useSearchParams()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

    // 反証対策：URLパラメータからエラーを検知して通知（期限切れリンクなど）
    useEffect(() => {
        const errorCode = searchParams.get('error')
        if (errorCode) {
            let errorText = '認証に失敗しました。もう一度やり直してください。'

            if (errorCode === 'expired_token') {
                errorText = '認証リンクの期限が切れました。再度登録・ログインしてください。'
            } else if (errorCode === 'network_error') {
                errorText = '通信エラーが発生しました。接続を確認して再度お試しください。'
            } else if (errorCode === 'auth_failed') {
                errorText = '認証に失敗しました。リンクが無効、または既に使用されています。'
            }

            // eslint-disable-next-line
            setMessage({ type: 'error', text: errorText })
            toast.error(errorText)
        }
    }, [searchParams])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = isLogin ? await signIn(formData) : await signUp(formData)

        // TypeScriptの型ガード（'error' in result）を用いて安全にアクセス
        if (result && 'error' in result && result.error) {
            setMessage({ type: 'error', text: result.error })
            toast.error(result.error)
            setLoading(false)
        } else if (result && 'success' in result && result.success) {
            setMessage({ type: 'success', text: result.success })
            toast.success(result.success)
            setLoading(false)
        }
        // ログイン成功時は actions.ts 内で redirect('/settings') が実行されるため、loadingは維持
    }

    return (
        <div className="space-y-6">
            <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="example@test.com"
                        disabled={loading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        disabled={loading}
                    />
                </div>

                {message && (
                    <div className={`text-sm p-3 rounded-md border ${message.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-green-50 border-green-200 text-green-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            処理中...
                        </>
                    ) : (
                        isLogin ? 'ログイン' : '新規登録'
                    )}
                </Button>
            </form>

            <div className="text-center border-t pt-4">
                <button
                    type="button"
                    onClick={() => {
                        setIsLogin(!isLogin)
                        setMessage(null)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    disabled={loading}
                >
                    {isLogin ? 'アカウントをお持ちでない方はこちら（新規登録）' : '既にアカウントをお持ちの方はこちら（ログイン）'}
                </button>
            </div>
        </div>
    )
}

// メインコンポーネント：Next.jsの仕様に基づきSuspenseでラップ
export default function LoginForm() {
    return (
        <Suspense fallback={
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        }>
            <LoginFormContent />
        </Suspense>
    )
}