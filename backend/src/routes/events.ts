import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" as any });

// ================================================================
// Zod バリデーションスキーマ
// ================================================================

const createEventSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200),
  description: z.string().min(1, "説明は必須です"),
  category: z.string().min(1, "カテゴリは必須です"),
  date: z.string().datetime({ message: "日付の形式が正しくありません" }),
  endDate: z.string().datetime({ message: "終了日の形式が正しくありません" }).optional(),
  location: z.string().min(1, "開催場所は必須です"),
  city: z.string().min(1, "市区町村は必須です"),
  prefecture: z.string().min(1, "都道府県は必須です"),
  coverImage: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  capacity: z.number().int().min(1, "定員は1以上で指定してください"),
  price: z.number().int().min(0, "価格は0以上で指定してください").optional(),
  isFree: z.boolean().optional(),
});

const updateEventSchema = createEventSchema.partial();

// ================================================================
// Public ルート
// ================================================================

// GET /api/events — イベント一覧（公開済みのみ）
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      category,
      city,
      date,
      search,
      page = "1",
      limit = "20",
    } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = { status: "PUBLISHED" };

    if (category) {
      where.category = category as string;
    }
    if (city) {
      where.city = { contains: city as string, mode: "insensitive" };
    }
    if (date) {
      const dateObj = new Date(date as string);
      where.date = { gte: dateObj };
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { location: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { name: true, avatarUrl: true } },
          _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { date: "asc" },
      }) as any,
      prisma.event.count({ where }),
    ]);

    const data = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      endDate: event.endDate,
      location: event.location,
      city: event.city,
      prefecture: event.prefecture,
      coverImage: event.coverImage,
      capacity: event.capacity,
      price: event.price,
      isFree: event.isFree,
      organizer: event.organizer,
      registrationCount: event._count.registrations,
      remainingSlots: event.capacity - event._count.registrations,
    }));

    res.json({
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// GET /api/events/my/registrations — 自分の参加登録一覧（認証必須）
// NOTE: /my/registrations は /:id より先に定義しないと "my" が :id に マッチしてしまう
router.get("/my/registrations", authenticate, async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where = { userId: req.user!.userId };

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              endDate: true,
              location: true,
              city: true,
              prefecture: true,
              coverImage: true,
              category: true,
              price: true,
              isFree: true,
              status: true,
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    res.json({
      data: registrations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// GET /api/events/:id — イベント詳細
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const event: any = await prisma.event.findUnique({
      where: { id: req.params.id as string },
      include: {
        organizer: { select: { name: true, avatarUrl: true } },
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
    });

    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    res.json({
      ...event,
      registrationCount: event._count.registrations,
      remainingSlots: event.capacity - event._count.registrations,
      _count: undefined,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// 認証済みユーザー向けルート
// ================================================================

// POST /api/events/:id/register — イベント参加登録
router.post("/:id/register", authenticate, async (req: Request, res: Response) => {
  try {
    const event: any = await prisma.event.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
    });

    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    if (event.status !== "PUBLISHED") {
      res.status(400).json({ code: "EVENT_NOT_PUBLISHED", message: "このイベントは現在受付していません" });
      return;
    }

    if (event.date < new Date()) {
      res.status(400).json({ code: "EVENT_PAST", message: "このイベントは既に終了しています" });
      return;
    }

    // 残席チェック
    const remainingSlots = event.capacity - event._count.registrations;
    if (remainingSlots <= 0) {
      res.status(409).json({ code: "EVENT_FULL", message: "定員に達しています" });
      return;
    }

    // 既存登録チェック
    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: req.user!.userId } },
    });

    if (existing && existing.status !== "CANCELLED") {
      res.status(409).json({ code: "ALREADY_REGISTERED", message: "既にこのイベントに登録済みです" });
      return;
    }

    // 無料イベント
    if (event.isFree) {
      const ticketCode = crypto.randomBytes(8).toString("hex");

      const registration = existing
        ? await prisma.eventRegistration.update({
            where: { id: existing.id },
            data: { status: "CONFIRMED", ticketCode, cancelledAt: null },
          })
        : await prisma.eventRegistration.create({
            data: {
              eventId: event.id,
              userId: req.user!.userId,
              status: "CONFIRMED",
              ticketCode,
            },
          });

      res.status(201).json(registration);
      return;
    }

    // 有料イベント — Stripe PaymentIntent 作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: event.price,
      currency: "jpy",
      metadata: { eventId: event.id, userId: req.user!.userId },
    });

    const registration = existing
      ? await prisma.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            stripePaymentIntentId: paymentIntent.id,
            ticketCode: null,
            cancelledAt: null,
          },
        })
      : await prisma.eventRegistration.create({
          data: {
            eventId: event.id,
            userId: req.user!.userId,
            status: "PENDING",
            stripePaymentIntentId: paymentIntent.id,
          },
        });

    // EventPayment レコード作成
    await prisma.eventPayment.create({
      data: {
        stripePaymentIntentId: paymentIntent.id,
        amount: event.price,
        status: "PENDING",
        registrationId: registration.id,
      },
    });

    res.status(201).json({
      ...registration,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      res.status(409).json({ code: "ALREADY_REGISTERED", message: "既にこのイベントに登録済みです" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// PUT /api/events/:id/cancel-registration — 参加キャンセル
router.put("/:id/cancel-registration", authenticate, async (req: Request, res: Response) => {
  try {
    const registration: any = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: req.params.id as string, userId: req.user!.userId } },
      include: { event: true, payment: true },
    });

    if (!registration) {
      res.status(404).json({ code: "NOT_FOUND", message: "参加登録が見つかりません" });
      return;
    }

    if (registration.status === "CANCELLED") {
      res.status(400).json({ code: "ALREADY_CANCELLED", message: "既にキャンセル済みです" });
      return;
    }

    // 有料 + CONFIRMED の場合は Stripe 返金
    if (
      !registration.event.isFree &&
      registration.status === "CONFIRMED" &&
      registration.stripePaymentIntentId
    ) {
      await stripe.refunds.create({
        payment_intent: registration.stripePaymentIntentId,
        amount: registration.event.price,
      });

      // EventPayment ステータス更新
      if (registration.payment) {
        await prisma.eventPayment.update({
          where: { id: registration.payment.id },
          data: { status: "REFUNDED", refundedAmount: registration.event.price },
        });
      }
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// オーガナイザー向けルート（ORGANIZER / ADMIN）
// ================================================================

// POST /api/events — イベント作成
router.post("/", authenticate, requireRole("ORGANIZER", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const body = createEventSchema.parse(req.body);

    const event = await prisma.event.create({
      data: {
        organizerId: req.user!.userId,
        title: body.title,
        description: body.description,
        category: body.category,
        date: new Date(body.date),
        endDate: body.endDate ? new Date(body.endDate) : null,
        location: body.location,
        city: body.city,
        prefecture: body.prefecture,
        coverImage: body.coverImage || null,
        images: body.images || [],
        capacity: body.capacity,
        price: body.price ?? 0,
        isFree: body.isFree ?? (body.price === undefined || body.price === 0),
        status: "DRAFT",
      },
    });

    res.status(201).json(event);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: (e as any).errors?.[0]?.message || "バリデーションエラー" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// PUT /api/events/:id — イベント更新（オーナー確認）
router.put("/:id", authenticate, requireRole("ORGANIZER", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const body = updateEventSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    // ADMIN 以外はオーナーシップ確認
    if (req.user!.role !== "ADMIN" && event.organizerId !== req.user!.userId) {
      res.status(403).json({ code: "FORBIDDEN", message: "このイベントを編集する権限がありません" });
      return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id as string },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.prefecture !== undefined && { prefecture: body.prefecture }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.images !== undefined && { images: body.images }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.isFree !== undefined && { isFree: body.isFree }),
      },
    });

    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: (e as any).errors?.[0]?.message || "バリデーションエラー" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// PUT /api/events/:id/publish — イベント公開（DRAFT → PUBLISHED）
router.put("/:id/publish", authenticate, requireRole("ORGANIZER", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    if (req.user!.role !== "ADMIN" && event.organizerId !== req.user!.userId) {
      res.status(403).json({ code: "FORBIDDEN", message: "このイベントを公開する権限がありません" });
      return;
    }

    if (event.status !== "DRAFT") {
      res.status(400).json({ code: "INVALID_STATUS", message: "下書きのイベントのみ公開できます" });
      return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id as string },
      data: { status: "PUBLISHED" },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// PUT /api/events/:id/cancel — イベントキャンセル
router.put("/:id/cancel", authenticate, requireRole("ORGANIZER", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    if (req.user!.role !== "ADMIN" && event.organizerId !== req.user!.userId) {
      res.status(403).json({ code: "FORBIDDEN", message: "このイベントをキャンセルする権限がありません" });
      return;
    }

    if (event.status === "CANCELLED") {
      res.status(400).json({ code: "ALREADY_CANCELLED", message: "既にキャンセル済みです" });
      return;
    }

    // トランザクション内でイベントキャンセル + 全登録者の返金処理
    const updated = await prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.event.update({
        where: { id: req.params.id as string },
        data: { status: "CANCELLED" },
      });

      // 有料イベントの場合、CONFIRMED の登録者全員に返金
      if (!event.isFree) {
        const confirmedRegistrations = await tx.eventRegistration.findMany({
          where: { eventId: event.id, status: "CONFIRMED", stripePaymentIntentId: { not: null } },
          include: { payment: true },
        });

        for (const reg of confirmedRegistrations) {
          if (reg.stripePaymentIntentId) {
            await stripe.refunds.create({
              payment_intent: reg.stripePaymentIntentId,
              amount: event.price,
            });
          }

          await tx.eventRegistration.update({
            where: { id: reg.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          });

          if (reg.payment) {
            await tx.eventPayment.update({
              where: { id: reg.payment.id },
              data: { status: "REFUNDED", refundedAmount: event.price },
            });
          }
        }
      }

      // 未払い（PENDING）の登録者もキャンセル
      await tx.eventRegistration.updateMany({
        where: { eventId: event.id, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      return updatedEvent;
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// GET /api/events/:id/participants — 参加者一覧（オーガナイザー向け）
router.get("/:id/participants", authenticate, requireRole("ORGANIZER", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    if (req.user!.role !== "ADMIN" && event.organizerId !== req.user!.userId) {
      res.status(403).json({ code: "FORBIDDEN", message: "この参加者一覧を閲覧する権限がありません" });
      return;
    }

    const where = { eventId: event.id };

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          payment: true,
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "asc" },
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    res.json({
      data: registrations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

export default router;
