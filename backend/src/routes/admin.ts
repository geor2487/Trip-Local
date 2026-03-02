import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

// 全ルートに ADMIN 認証を適用
router.use(authenticate, requireRole("ADMIN"));

// ================================================================
// GET /stats — ダッシュボード統計
// ================================================================
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalAccommodations,
      totalEvents,
      totalBookings,
      revenueResult,
      eventRevenueResult,
      accommodationsByStatus,
      eventsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.accommodation.count(),
      prisma.event.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.eventPayment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.accommodation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const accommodationStatusCounts: Record<string, number> = {};
    for (const row of accommodationsByStatus) {
      accommodationStatusCounts[row.status] = row._count._all;
    }

    const eventStatusCounts: Record<string, number> = {};
    for (const row of eventsByStatus) {
      eventStatusCounts[row.status] = row._count._all;
    }

    res.json({
      users: totalUsers,
      accommodations: totalAccommodations,
      events: totalEvents,
      bookings: totalBookings,
      revenue: (revenueResult._sum.amount ?? 0) + (eventRevenueResult._sum.amount ?? 0),
      byStatus: { ...accommodationStatusCounts, ...eventStatusCounts },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// GET /users — ユーザー一覧
// ================================================================
router.get("/users", async (req: Request, res: Response) => {
  try {
    const { role, search, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /users/:id/role — ユーザーロール変更
// ================================================================
const updateRoleSchema = z.object({
  role: z.enum(["USER", "OWNER", "ORGANIZER", "ADMIN"]),
});

router.put("/users/:id/role", async (req: Request, res: Response) => {
  try {
    const body = updateRoleSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) {
      res.status(404).json({ code: "NOT_FOUND", message: "ユーザーが見つかりません" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "無効なロールです" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /users/:id/deactivate — ユーザー無効化
// ================================================================
router.put("/users/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) {
      res.status(404).json({ code: "NOT_FOUND", message: "ユーザーが見つかりません" });
      return;
    }

    if (!user.isActive) {
      res.status(400).json({ code: "ALREADY_DEACTIVATED", message: "このユーザーは既に無効化されています" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// GET /accommodations — 宿泊施設一覧（管理用）
// ================================================================
router.get("/accommodations", async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    if (status) where.status = status;

    const [accommodations, total] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          rooms: { select: { id: true, name: true, pricePerNight: true, isActive: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.accommodation.count({ where }),
    ]);

    res.json({
      data: accommodations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /accommodations/:id/status — 宿泊施設ステータス変更
// ================================================================
const updateAccommodationStatusSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "PUBLISHED", "SUSPENDED", "REJECTED"]),
});

router.put("/accommodations/:id/status", async (req: Request, res: Response) => {
  try {
    const body = updateAccommodationStatusSchema.parse(req.body);

    const accommodation = await prisma.accommodation.findUnique({ where: { id: req.params.id as string } });
    if (!accommodation) {
      res.status(404).json({ code: "NOT_FOUND", message: "施設が見つかりません" });
      return;
    }

    const updated = await prisma.accommodation.update({
      where: { id: req.params.id as string },
      data: { status: body.status },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "無効なステータスです" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// GET /events — イベント一覧（管理用）
// ================================================================
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          _count: { select: { registrations: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      data: events,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /events/:id/status — イベントステータス変更
// ================================================================
const updateEventStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
});

router.put("/events/:id/status", async (req: Request, res: Response) => {
  try {
    const body = updateEventStatusSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ code: "NOT_FOUND", message: "イベントが見つかりません" });
      return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id as string },
      data: { status: body.status },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "無効なステータスです" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// GET /bookings — 予約一覧（管理用）
// ================================================================
router.get("/bookings", async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          room: {
            include: {
              accommodation: {
                select: { id: true, name: true, city: true, prefecture: true },
              },
            },
          },
          payment: true,
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

// ================================================================
// GET /payments — 支払い一覧（管理用）
// ================================================================
router.get("/payments", async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              totalPrice: true,
              status: true,
              user: { select: { id: true, name: true, email: true } },
              room: {
                select: {
                  name: true,
                  accommodation: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

export default router;
