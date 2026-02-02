import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { authKit } from "./auth";

const http = httpRouter();
authKit.registerRoutes(http);

// Razorpay Webhook Handler
http.route({
    path: "/webhooks/razorpay",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Get raw body for signature verification
            const body = await request.text();
            const signature = request.headers.get("x-razorpay-signature");

            if (!signature) {
                return new Response(
                    JSON.stringify({ error: "Missing signature header" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }

            // Verify webhook signature
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.error("RAZORPAY_WEBHOOK_SECRET not configured");
                return new Response(
                    JSON.stringify({ error: "Webhook not configured" }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            const expectedSignature = await generateWebhookSignature(body, webhookSecret);
            if (expectedSignature !== signature) {
                console.error("Invalid webhook signature");
                return new Response(
                    JSON.stringify({ error: "Invalid signature" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }

            // Parse the webhook payload
            const payload = JSON.parse(body);
            const event = payload.event;

            // Only process order.paid events
            if (event === "order.paid") {
                const orderId = payload.payload.order.entity.id;
                const paymentId = payload.payload.payment.entity.id;

                // Process the payment (add credits)
                await ctx.runMutation(api.topup.processWebhookPayment, {
                    orderId,
                    razorpayPaymentId: paymentId,
                });

                console.log(`Processed order.paid for order: ${orderId}`);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error) {
            console.error("Webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// Helper function to generate HMAC-SHA256 signature for webhook verification
async function generateWebhookSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default http;