import LoginForm from './login-form'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">飲食店SaaS AI</h1>
                    <p className="mt-2 text-sm text-gray-500">店舗管理とAI口コミ返信ツール</p>
                </div>
                <LoginForm />
            </div>
        </div>
    )
}