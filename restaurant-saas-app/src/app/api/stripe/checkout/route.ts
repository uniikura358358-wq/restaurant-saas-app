import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/stripe/config";

const stripe = new Stripe(STRIPE_CONFIG.secretKey || "sk_test_dummy", {
    apiVersion: "2023-10-16" as any, // Use latest stable
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { priceId, userId, planName, billingCycle } = await req.json();

        if (!priceId || !userId) {
            return NextResponse.json(
                { error: "Missing priceId or userId" },
                { status: 400 }
            );
        }

        const origin = req.headers.get("origin") || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card", "customer_balance"],
            payment_method_options: {
                customer_balance: {
                    funding_type: "bank_transfer",
                    bank_transfer: {
                        type: "jp_bank_transfer",
                    },
                },
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            client_reference_id: userId,
            metadata: {
                userId,
                planName,
                billingCycle,
            },
            success_url: `${origin}/settings/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/plans?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
