import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/accommodations — 一覧（検索）
router.get("/", async (req: Request, res: Response) => {
  try {
    const { location, checkIn, checkOut, guests, minPrice, maxPrice, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const where: any = { status: "PUBLISHED" };
    if (location) {
      where.OR = [
        { city: { contains: location as string, mode: "insensitive" } },
        { prefecture: { contains: location as string, mode: "insensitive" } },
        { name: { contains: location as string, mode: "insensitive" } },
      ];
    }

    const [accommodations, total] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        include: {
          rooms: {
            where: { isActive: true },
            select: { pricePerNight: true, capacity: true },
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
      amenities: a.amenities,
      minPrice: a.rooms.length > 0 ? Math.min(...a.rooms.map((r) => r.pricePerNight)) : null,
      maxCapacity: a.rooms.length > 0 ? Math.max(...a.rooms.map((r) => r.capacity)) : null,
      status: a.status,
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

// GET /api/accommodations/:id — 詳細
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const accommodation = await prisma.accommodation.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: { where: { isActive: true } },
        owner: { select: { name: true, avatarUrl: true } },
      },
    });

    if (!accommodation) {
      res.status(404).json({ code: "NOT_FOUND", message: "施設が見つかりません" });
      return;
    }

    res.json(accommodation);
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// GET /api/accommodations/:id/availability — 空き状況
router.get("/:id/availability", async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "year と month が必要です" });
      return;
    }

    const y = parseInt(year as string);
    const m = parseInt(month as string);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const accommodation = await prisma.accommodation.findUnique({
      where: { id: req.params.id },
      include: { rooms: { where: { isActive: true }, select: { id: true } } },
    });

    if (!accommodation) {
      res.status(404).json({ code: "NOT_FOUND", message: "施設が見つかりません" });
      return;
    }

    const roomIds = accommodation.rooms.map((r) => r.id);
    const blocked = await prisma.availability.findMany({
      where: {
        roomId: { in: roomIds },
        date: { gte: startDate, lte: endDate },
        isBlocked: true,
      },
    });

    const blockedMap = new Map<string, Set<string>>();
    for (const b of blocked) {
      const dateStr = b.date.toISOString().split("T")[0];
      if (!blockedMap.has(dateStr)) blockedMap.set(dateStr, new Set());
      blockedMap.get(dateStr)!.add(b.roomId);
    }

    const totalRooms = roomIds.length;
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const blockedRooms = blockedMap.get(dateStr)?.size ?? 0;
      dates.push({
        date: dateStr,
        available: blockedRooms < totalRooms,
        remainingRooms: totalRooms - blockedRooms,
      });
    }

    res.json({ data: dates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

export default router;
