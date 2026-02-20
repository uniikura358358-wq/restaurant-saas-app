import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(STRIPE_CONFIG.secretKey || "sk_test_dummy", {
    apiVersion: "2023-10-16" as any,
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get("stripe-signature") as string;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                bodyText,
                signature,
                STRIPE_CONFIG.webhookSecret || ""
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json(
                { error: `Webhook Error: ${err.message}` },
                { status: 400 }
            );
        }

        try {
            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    await handleCheckoutSessionCompleted(session);
                    break;
                }
                case "customer.subscription.updated": {
                    const subscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionUpdated(subscription);
                    break;
                }
                case "customer.subscription.deleted": {
                    const subscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionDeleted(subscription);
                    break;
                }
                case "invoice.payment_failed": {
                    const invoice = event.data.object as Stripe.Invoice;
                    await handleInvoicePaymentFailed(invoice);
                    break;
                }
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }
        } catch (handlerError) {
            console.error("Event handler error:", handlerError);
            return NextResponse.json({ error: "Handler failed" }, { status: 500 });
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("Stripe Webhook Fatal Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !subscriptionId) {
        console.error("Missing userId or subscriptionId in session metadata");
        return;
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const db = adminDb;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Map Stripe Price ID to internal Plan Name
    const planName = session.metadata?.planName || "Standard";

    try {
        await db.collection("users").doc(userId).update({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan: planName.toLowerCase(),
            subscriptionStatus: subscription.status,
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`User ${userId} upgraded to ${planName}`);
    } catch (e) {
        console.error(`Failed to update user ${userId} after checkout:`, e);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const snapshot = await adminDb.collection("users").where("stripeSubscriptionId", "==", subscription.id).limit(1).get();

    if (snapshot.empty) {
        console.warn(`No user found for subscription ${subscription.id}`);
        return;
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
        subscriptionStatus: subscription.status,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const snapshot = await adminDb.collection("users").where("stripeSubscriptionId", "==", subscription.id).limit(1).get();

    if (snapshot.empty) {
        console.warn(`No user found for subscription ${subscription.id}`);
        return;
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
        plan: "free",
        subscriptionStatus: "canceled",
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`User ${doc.id} subscription canceled.`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const snapshot = await adminDb.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();

    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const profile = userDoc.data();
        const now = new Date();

        const failedAtProp = profile.paymentFailedAt;
        const failedAt = failedAtProp ? failedAtProp.toDate() : now;

        const daysDiff = Math.floor((now.getTime() - failedAt.getTime()) / (1000 * 60 * 60 * 24));

        let newStatus = "locked";
        let shouldDeleteSubscription = false;

        if (profile.hasWebOption && daysDiff >= 14) {
            newStatus = "suspended";
        }

        if (profile.hasWebOption && daysDiff >= 31) {
            shouldDeleteSubscription = true;
            newStatus = "free";
        }

        await userDoc.ref.update({
            planStatus: newStatus,
            paymentFailedAt: profile.paymentFailedAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        if (shouldDeleteSubscription && profile.stripeSubscriptionId) {
            try {
                await stripe.subscriptions.cancel(profile.stripeSubscriptionId);
                console.log(`Phase 3: Subscription ${profile.stripeSubscriptionId} cancelled for ${userDoc.id}`);
            } catch (e) {
                console.error("Failed to cancel subscription:", e);
            }
        }

        console.log(`Customer ${customerId} handled for failure. Phase/Days: ${daysDiff}. Status: ${newStatus}`);
    }
}
