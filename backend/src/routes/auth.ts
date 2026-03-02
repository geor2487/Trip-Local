import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) {
      res.status(409).json({ code: "EMAIL_EXISTS", message: "このメールアドレスは既に登録されています" });
      return;
    }

    const passwordHash = await bcryptjs.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, name: body.name },
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: e.errors[0].message });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "メールアドレスまたはパスワードが正しくありません" });
      return;
    }

    const valid = await bcryptjs.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "メールアドレスまたはパスワードが正しくありません" });
      return;
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: e.errors[0].message });
      return;
    }
    console.error(e);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "サーバーエラー" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(401).json({ code: "NO_TOKEN", message: "リフレッシュトークンが必要です" });
      return;
    }

    const payload = verifyRefreshToken(token);
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });

    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ code: "INVALID_TOKEN", message: "トークンが無効です" });
      return;
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, role: payload.role });

    await prisma.refreshToken.create({
      data: {
        token: crypto.createHash("sha256").update(newRefreshToken).digest("hex"),
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 });
  } catch {
    res.status(401).json({ code: "INVALID_TOKEN", message: "トークンが無効です" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, role: true, locale: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ code: "NOT_FOUND", message: "ユーザーが見つかりません" });
    return;
  }
  res.json(user);
});

export default router;
