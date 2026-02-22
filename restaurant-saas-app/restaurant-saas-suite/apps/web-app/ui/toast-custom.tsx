"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
}

let toastCount = 0;

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
        const id = `toast-${toastCount++}`;
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts((prev) => prev.slice(1));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    return { toasts, addToast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto
            ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
            ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}
            ${toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : ""}
            ${toast.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : ""}
          `}
                >
                    {toast.type === "success" && <CheckCircle className="size-4" />}
                    {toast.type === "error" && <XCircle className="size-4" />}
                    {toast.type === "info" && <Info className="size-4" />}
                    {toast.type === "warning" && <AlertTriangle className="size-4" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
