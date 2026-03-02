import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" as any });

// POST /api/payments/webhook — Stripe Webhook 受信
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;

      if (bookingId) {
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED", confirmedAt: new Date() },
          });
          await tx.payment.updateMany({
            where: { stripePaymentIntentId: paymentIntent.id },
            data: { status: "SUCCEEDED" },
          });
        });
        console.log(`Booking ${bookingId} confirmed via webhook`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;

      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
          const dates: Date[] = [];
          for (let d = new Date(booking.checkIn); d < booking.checkOut; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }

          await prisma.$transaction(async (tx) => {
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: "CANCELLED" },
            });
            for (const date of dates) {
              await tx.availability.updateMany({
                where: { roomId: booking.roomId, date },
                data: { isBlocked: false },
              });
            }
            await tx.payment.updateMany({
              where: { stripePaymentIntentId: paymentIntent.id },
              data: { status: "FAILED" },
            });
          });
        }
      }
      break;
    }
  }

  res.json({ received: true });
});

export default router;
