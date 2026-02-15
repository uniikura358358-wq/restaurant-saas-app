'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"

function LoginFormContent() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password)
                toast.success('ログインしました')
                router.push('/')
            } else {
                await createUserWithEmailAndPassword(auth, email, password)
                toast.success('アカウントを作成しました')
                router.push('/')
            }
        } catch (error: any) {
            console.error(error)
            let errorMessage = 'エラーが発生しました'
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'メールアドレスまたはパスワードが間違っています'
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'このメールアドレスは既に使用されています'
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'パスワードは6文字以上で設定してください'
            }

            setMessage({ type: 'error', text: errorMessage })
            toast.error(errorMessage)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        placeholder="example@test.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

            <div className="text-center text-xs text-gray-400 mt-4">
                Powered by Firebase Auth
            </div>
        </div>
    )
}

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