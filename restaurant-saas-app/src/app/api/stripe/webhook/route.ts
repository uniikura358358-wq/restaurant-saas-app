import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { adminDb } from "@/lib/firebase-admin";

const stripe = new Stripe(STRIPE_CONFIG.secretKey || "sk_test_dummy", {
    apiVersion: "2023-10-16" as any,
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            STRIPE_CONFIG.webhookSecret || ""
        );
    } catch (err) {
        console.error("Webhook signature verification failed.", err);
        return NextResponse.json(
            { error: "Webhook signature verification failed." },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id;
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                // Metadata from checkout session
                const planName = session.metadata?.planName || "Unknown";
                const billingCycle = session.metadata?.billingCycle || "unknown";

                if (userId) {
                    await adminDb.collection("users").doc(userId).set(
                        {
                            planStatus: "active", // Or "pro", "business", etc. based on planName
                            planName: planName, // E.g., "Business Premium"
                            billingInterval: billingCycle,
                            stripeSubscriptionId: subscriptionId,
                            stripeCustomerId: customerId,
                            updatedAt: new Date().toISOString(),
                        },
                        { merge: true }
                    );
                    console.log(`User ${userId} upgraded to ${planName}.`);
                }
                break;

            case "invoice.payment_failed":
                // Handle payment failure (e.g., notify user, downgrade)
                const invoice = event.data.object as Stripe.Invoice;
                // Logic to update user status to 'past_due' or similar
                break;

            default:
            // console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error("Error handling webhook event:", error);
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }

    return NextResponse.json({ received: true });
}
