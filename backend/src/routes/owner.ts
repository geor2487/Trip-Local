import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

// 全ルートに認証 + OWNER/ADMIN ロール必須
router.use(authenticate, requireRole("OWNER", "ADMIN"));

// ================================================================
// オーナーシップ検証ヘルパー
// ================================================================
async function verifyOwnership(
  accommodationId: string,
  userId: string,
  role: string,
  res: Response
): Promise<boolean> {
  const accommodation = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    select: { ownerId: true },
  });

  if (!accommodation) {
    res.status(404).json({ code: "NOT_FOUND", message: "施設が見つかりません" });
    return false;
  }

  // ADMIN はオーナーシップ検証をスキップ
  if (role !== "ADMIN" && accommodation.ownerId !== userId) {
    res.status(403).json({ code: "FORBIDDEN", message: "この施設の操作権限がありません" });
    return false;
  }

  return true;
}

// ================================================================
// バリデーションスキーマ
// ================================================================
const accommodationCreateSchema = z.object({
  name: z.string().min(1, "施設名は必須です"),
  description: z.string().min(1, "説明は必須です"),
  address: z.string().min(1, "住所は必須です"),
  city: z.string().min(1, "市区町村は必須です"),
  prefecture: z.string().min(1, "都道府県は必須です"),
  zipCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません"),
  coverImage: z.string().url().optional(),
  images: z.array(z.string().url()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/, "時刻の形式が正しくありません（HH:MM）").optional().default("15:00"),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/, "時刻の形式が正しくありません（HH:MM）").optional().default("11:00"),
});

const accommodationUpdateSchema = z.object({
  name: z.string().min(1, "施設名は必須です").optional(),
  description: z.string().min(1, "説明は必須です").optional(),
  address: z.string().min(1, "住所は必須です").optional(),
  city: z.string().min(1, "市区町村は必須です").optional(),
  prefecture: z.string().min(1, "都道府県は必須です").optional(),
  zipCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません").optional(),
  coverImage: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  amenities: z.array(z.string()).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/, "時刻の形式が正しくありません（HH:MM）").optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/, "時刻の形式が正しくありません（HH:MM）").optional(),
});

const roomCreateSchema = z.object({
  name: z.string().min(1, "部屋名は必須です"),
  description: z.string().optional(),
  capacity: z.number().int().min(1, "定員は1以上で指定してください"),
  pricePerNight: z.number().int().min(1, "1泊料金は1円以上で指定してください"),
  images: z.array(z.string().url()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
});

const roomUpdateSchema = z.object({
  name: z.string().min(1, "部屋名は必須です").optional(),
  description: z.string().nullable().optional(),
  capacity: z.number().int().min(1, "定員は1以上で指定してください").optional(),
  pricePerNight: z.number().int().min(1, "1泊料金は1円以上で指定してください").optional(),
  images: z.array(z.string().url()).optional(),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ================================================================
// GET /api/owner — オーナーの施設一覧（部屋数・予約統計付き）
// ================================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {};
    // ADMIN は全施設、OWNER は自分の施設のみ
    if (req.user!.role !== "ADMIN") {
      where.ownerId = req.user!.userId;
    }

    const [accommodations, total] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        include: {
          rooms: {
            select: {
              id: true,
              _count: {
                select: { bookings: true },
              },
            },
          },
          _count: {
            select: { rooms: true },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.accommodation.count({ where }),
    ]);

    const data = accommodations.map((a) => ({
      id: a.id,
      name: a.name,
      city: a.city,
      prefecture: a.prefecture,
      coverImage: a.coverImage,
      status: a.status,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      createdAt: a.createdAt,
      roomCount: a._count.rooms,
      totalBookings: a.rooms.reduce((sum, r) => sum + r._count.bookings, 0),
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

// ================================================================
// POST /api/owner — 施設の新規作成
// ================================================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = accommodationCreateSchema.parse(req.body);

    const accommodation = await prisma.accommodation.create({
      data: {
        ownerId: req.user!.userId,
        name: body.name,
        description: body.description,
        address: body.address,
        city: body.city,
        prefecture: body.prefecture,
        zipCode: body.zipCode,
        coverImage: body.coverImage ?? null,
        images: body.images,
        amenities: body.amenities,
        checkInTime: body.checkInTime,
        checkOutTime: body.checkOutTime,
      },
    });

    res.status(201).json(accommodation);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: (e as any).errors?.[0]?.message || "バリデーションエラー" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /api/owner/:id — 施設の更新（オーナーシップ検証）
// ================================================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    const body = accommodationUpdateSchema.parse(req.body);

    const accommodation = await prisma.accommodation.update({
      where: { id: req.params.id as string },
      data: body,
    });

    res.json(accommodation);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: (e as any).errors?.[0]?.message || "バリデーションエラー" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// DELETE /api/owner/:id — 施設の停止（ソフトデリート: SUSPENDED に変更）
// ================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    const accommodation = await prisma.accommodation.update({
      where: { id: req.params.id as string },
      data: { status: "SUSPENDED" },
    });

    res.json({ message: "施設を停止しました", accommodation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// GET /api/owner/:id/rooms — 施設の部屋一覧（オーナーシップ検証）
// ================================================================
router.get("/:id/rooms", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    const { page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where = { accommodationId: req.params.id as string };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          _count: { select: { bookings: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      data: rooms,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// POST /api/owner/:id/rooms — 部屋の新規作成（オーナーシップ検証）
// ================================================================
router.post("/:id/rooms", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    const body = roomCreateSchema.parse(req.body);

    const room = await prisma.room.create({
      data: {
        accommodationId: req.params.id as string,
        name: body.name,
        description: body.description ?? null,
        capacity: body.capacity,
        pricePerNight: body.pricePerNight,
        images: body.images,
        amenities: body.amenities,
      },
    });

    res.status(201).json(room);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: (e as any).errors?.[0]?.message || "バリデーションエラー" });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// ================================================================
// PUT /api/owner/:id/rooms/:roomId — 部屋の更新（オーナーシップ検証）
// ================================================================
router.put("/:id/rooms/:roomId", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    // 部屋がこの施設に属しているか確認
    const room = await prisma.room.findFirst({
      where: { id: req.params.roomId as string, accommodationId: req.params.id as string },
    });
    if (!room) {
      res.status(404).json({ code: "NOT_FOUND", message: "部屋が見つかりません" });
      return;
    }

    const body = roomUpdateSchema.parse(req.body);

    const updated = await prisma.room.update({
      where: { id: req.params.roomId as string },
      data: body,
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

// ================================================================
// GET /api/owner/:id/bookings — 施設の予約一覧（オーナーシップ検証、ゲスト情報付き）
// ================================================================
router.get("/:id/bookings", async (req: Request, res: Response) => {
  try {
    const ok = await verifyOwnership(req.params.id as string, req.user!.userId, req.user!.role, res);
    if (!ok) return;

    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = {
      room: { accommodationId: req.params.id as string },
    };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          room: { select: { id: true, name: true, capacity: true, pricePerNight: true } },
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

export default router;
