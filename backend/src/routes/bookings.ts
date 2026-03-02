import { Router, Request, Response } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { calculateRefundAmount, calculateRefundRate } from "../lib/cancellation.js";
import { sendCancellationEmail } from "../lib/email.js";

const router = Router();
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" as any }) : null;

const bookingSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1),
});

// GET /api/bookings — 予約一覧
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = { userId: req.user!.userId };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: {
            include: {
              accommodation: {
                select: { id: true, name: true, city: true, prefecture: true, coverImage: true },
              },
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: bookings,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// POST /api/bookings — 予約作成 (SELECT FOR UPDATE + トランザクション)
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const body = bookingSchema.parse(req.body);
    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);

    if (checkIn >= checkOut) {
      res.status(400).json({ code: "INVALID_DATES", message: "チェックアウトはチェックインより後でなければなりません" });
      return;
    }

    // 泊数計算
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // 日付リスト生成（チェックイン日〜チェックアウト前日）
    const dates: Date[] = [];
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // トランザクション内で SELECT FOR UPDATE
    const result = await prisma.$transaction(async (tx) => {
      // 部屋の存在確認
      const room = await tx.room.findUnique({ where: { id: body.roomId } });
      if (!room || !room.isActive) throw new Error("ROOM_NOT_FOUND");
      if (body.guests > room.capacity) throw new Error("CAPACITY_EXCEEDED");

      // SELECT FOR UPDATE で行ロック取得
      const blocked = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Availability"
        WHERE "roomId" = ${body.roomId}
        AND "date" = ANY(${dates}::date[])
        AND "isBlocked" = true
        FOR UPDATE
      `;

      if (Number(blocked[0].count) > 0) {
        throw new Error("ROOM_NOT_AVAILABLE");
      }

      const totalPrice = room.pricePerNight * nights;

      // 予約レコード作成
      const booking = await tx.booking.create({
        data: {
          userId: req.user!.userId,
          roomId: body.roomId,
          checkIn,
          checkOut,
          guests: body.guests,
          totalPrice,
          status: "PENDING",
        },
      });

      // Availability に isBlocked=true をセット
      for (const date of dates) {
        await tx.availability.upsert({
          where: { roomId_date: { roomId: body.roomId, date } },
          create: { roomId: body.roomId, date, isBlocked: true },
          update: { isBlocked: true },
        });
      }

      return { booking, totalPrice };
    });

    // Stripe が設定されていない場合は決済なしで予約確定
    if (!stripe) {
      await prisma.booking.update({
        where: { id: result.booking.id },
        data: { status: "CONFIRMED" },
      });
      res.status(201).json(result.booking);
      return;
    }

    // トランザクション外で Stripe PaymentIntent 作成
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: result.totalPrice,
        currency: "jpy",
        metadata: { bookingId: result.booking.id },
      });
    } catch (stripeErr) {
      // Stripe 失敗時: Availability を戻す
      const dates: Date[] = [];
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      await prisma.$transaction(async (tx) => {
        for (const date of dates) {
          await tx.availability.updateMany({
            where: { roomId: body.roomId, date },
            data: { isBlocked: false },
          });
        }
        await tx.booking.update({
          where: { id: result.booking.id },
          data: { status: "CANCELLED" },
        });
      });
      throw stripeErr;
    }

    // PaymentIntent ID を Booking に紐付け
    await prisma.booking.update({
      where: { id: result.booking.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    // Payment レコード作成
    await prisma.payment.create({
      data: {
        stripePaymentIntentId: paymentIntent.id,
        amount: result.totalPrice,
        status: "PENDING",
        bookingId: result.booking.id,
      },
    });

    res.status(201).json({
      ...result.booking,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e: any) {
    if (e.message === "ROOM_NOT_FOUND") {
      res.status(404).json({ code: "ROOM_NOT_FOUND", message: "部屋が見つかりません" });
      return;
    }
    if (e.message === "ROOM_NOT_AVAILABLE") {
      res.status(409).json({ code: "ROOM_NOT_AVAILABLE", message: "指定の日程は満室です" });
      return;
    }
    if (e.message === "CAPACITY_EXCEEDED") {
      res.status(400).json({ code: "CAPACITY_EXCEEDED", message: "人数が定員を超えています" });
      return;
    }
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: e.issues[0].message });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// GET /api/bookings/:id — 予約詳細
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
      include: {
        room: {
          include: {
            accommodation: {
              select: { id: true, name: true, city: true, prefecture: true, coverImage: true, images: true },
            },
          },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ code: "NOT_FOUND", message: "予約が見つかりません" });
      return;
    }

    res.json(booking);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// PUT /api/bookings/:id/cancel — キャンセル
router.put("/:id/cancel", authenticate, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });

    if (!booking) {
      res.status(404).json({ code: "NOT_FOUND", message: "予約が見つかりません" });
      return;
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      res.status(400).json({ code: "CANNOT_CANCEL", message: "この予約はキャンセルできません" });
      return;
    }

    const refundAmount = calculateRefundAmount(booking.totalPrice, booking.checkIn);
    const refundRate = calculateRefundRate(booking.checkIn);

    // Stripe 返金
    if (refundAmount > 0 && booking.stripePaymentIntentId && stripe) {
      await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        amount: refundAmount,
      });
    }

    // トランザクションで Booking + Availability を更新
    const dates: Date[] = [];
    for (let d = new Date(booking.checkIn); d < booking.checkOut; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationNote: req.body.reason || null,
        },
      });

      for (const date of dates) {
        await tx.availability.updateMany({
          where: { roomId: booking.roomId, date },
          data: { isBlocked: false },
        });
      }

      if (booking.stripePaymentIntentId) {
        await tx.payment.updateMany({
          where: { stripePaymentIntentId: booking.stripePaymentIntentId },
          data: { status: refundAmount > 0 ? "REFUNDED" : "SUCCEEDED", refundedAmount: refundAmount },
        });
      }

      return updatedBooking;
    });

    // キャンセル確認メール送信
    const bookingWithDetails = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        user: { select: { email: true, name: true } },
        room: {
          include: {
            accommodation: { select: { name: true } },
          },
        },
      },
    });
    if (bookingWithDetails) {
      await sendCancellationEmail({
        to: bookingWithDetails.user.email,
        guestName: bookingWithDetails.user.name,
        accommodationName: bookingWithDetails.room.accommodation.name,
        roomName: bookingWithDetails.room.name,
        checkIn: bookingWithDetails.checkIn.toISOString(),
        checkOut: bookingWithDetails.checkOut.toISOString(),
        totalPrice: bookingWithDetails.totalPrice,
        refundAmount,
        refundRate,
        bookingId: bookingWithDetails.id,
      });
    }

    res.json({
      ...updated,
      refundAmount,
      refundRate,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

export default router;
