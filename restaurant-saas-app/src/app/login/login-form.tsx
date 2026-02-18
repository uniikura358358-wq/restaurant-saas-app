'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth'
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

    async function handleGoogleLogin() {
        setLoading(true)
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            toast.success('Googleでログインしました')
            router.push('/dashboard')
        } catch (error: any) {
            console.error(error)
            toast.error('Googleログインに失敗しました')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            if (isLogin) {
                try {
                    await signInWithEmailAndPassword(auth, email, password)
                    toast.success('ログインしました')
                    router.push('/dashboard')
                } catch (error: any) {
                    // Firebase MFA Challenge
                    if (error.code === 'auth/multi-factor-auth-required') {
                        toast.info("2段階認証が必要です");
                        // ここで MFAResolver を取得し、MFAチャレンジUIを表示するフローをシミュレーション
                        // 実際には resolver.resolveSignIn(...) を呼び出す
                        const resolver = error.resolver;

                        // デモ用: プロンプトでコード入力を求めて続行するような流れ
                        const mfaCode = window.prompt("2段階認証コードを入力してください (デモ用: 123456)");
                        if (mfaCode === "123456") {
                            toast.success("認証に成功しました");
                            router.push('/dashboard');
                        } else {
                            throw new Error("MFA認証に失敗しました");
                        }
                    } else {
                        throw error;
                    }
                }
            } else {
                await createUserWithEmailAndPassword(auth, email, password)
                toast.success('アカウントを作成しました')
                router.push('/dashboard')
            }
        } catch (error: any) {
            console.error(error)
            let errorMessage = 'エラーが発生しました'
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = 'メールアドレスまたはパスワードが間違っています'
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'このメールアドレスは既に登録されています'
            }
            setMessage({ type: 'error', text: errorMessage })
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium ml-1">メールアドレス</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        placeholder="example@test.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="h-12 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/30"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium ml-1">パスワード</Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="h-12 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/30"
                    />
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-sm p-4 rounded-xl border ${message.type === 'error'
                            ? 'bg-red-50 border-red-100 text-red-600'
                            : 'bg-green-50 border-green-100 text-green-600'
                            }`}>
                        {message.text}
                    </motion.div>
                )}

                <Button
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-all"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            処理中...
                        </>
                    ) : (
                        isLogin ? 'ログイン' : '新規登録'
                    )}
                </Button>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-100" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-4 text-gray-400 font-medium">または</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition-all flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Google
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-xl border-2 border-[#FF5C00] text-[#FF5C00] hover:bg-[#FF5C00] hover:text-white font-bold transition-all flex items-center justify-center gap-2 group"
                        onClick={() => {
                            const clientId = process.env.NEXT_PUBLIC_WHOP_CLIENT_ID;
                            const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/whop/callback`);
                            const authUrl = `https://whop.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile%20billing:memberships:read`;
                            window.location.href = authUrl;
                        }}
                        disabled={loading}
                    >
                        Whop
                    </Button>
                </div>

            </form>

            <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                    アカウントをお持ちでない方は{' '}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setMessage(null)
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                        disabled={loading}
                    >
                        {isLogin ? '新規登録' : 'ログイン'}
                    </button>
                </p>
                <div className="mt-4">
                    <button
                        onClick={() => router.push('/plans')}
                        className="text-xs text-gray-400 hover:text-indigo-500 underline transition-colors"
                    >
                        料金プランを確認する
                    </button>
                </div>
            </div>

            {/* 開発環境用：管理者デモパネル (画面下中央に固定) */}
            {process.env.NODE_ENV === "development" && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[99999] w-auto">
                    <div className="bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-orange-200 flex flex-col items-center gap-4 min-w-[340px] border-b-4 border-b-orange-500">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-black text-white bg-gradient-to-r from-orange-500 to-red-600 px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
                                ADMIN DEBUG PANEL
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">開発環境（localhost）専用</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 w-full">
                            {[
                                { id: 'Light', label: 'ライト', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                                { id: 'Standard', label: '標準', color: 'bg-orange-50 text-orange-700 border-orange-100' },
                                { id: 'Premium', label: 'プレミアム', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' }
                            ].map((p) => (
                                <Button
                                    key={p.id}
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className={`h-12 rounded-xl border-2 font-black transition-all hover:scale-105 active:scale-95 ${p.color}`}
                                    onClick={() => {
                                        localStorage.setItem("demo_user", "true");
                                        localStorage.setItem("simulatedPlan", p.id);
                                        toast.success(`${p.label}プランとしてログインしました`);
                                        window.location.href = "/dashboard";
                                    }}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem("demo_user");
                                localStorage.removeItem("simulatedPlan");
                                toast.info("デモ設定をリセットしました");
                                window.location.reload();
                            }}
                            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors font-bold border-t border-gray-100 w-full pt-3 mt-1 flex items-center justify-center gap-1"
                        >
                            <Loader2 className="w-3 h-3" />
                            すべてのシミュレーションをリセット
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
        </svg>
    );
}

export default function LoginForm() {
    return (
        <Suspense fallback={
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        }>
            <LoginFormContent />
        </Suspense>
    )
}
