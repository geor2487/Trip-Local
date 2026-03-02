import { describe, it, expect, vi } from 'vitest';
import { authenticate, requireRole } from '../middleware/auth.js';
import { signAccessToken } from '../lib/jwt.js';
import type { Request, Response, NextFunction } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: any } {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) { res.statusCode = code; return res; },
    json(data: any) { res.body = data; return res; },
  };
  return res;
}

describe('authenticate middleware', () => {
  it('Authorizationヘッダーがない場合は401', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(next).not.toHaveBeenCalled();
  });

  it('Bearer prefixがない場合は401', () => {
    const req = mockReq({ headers: { authorization: 'Token abc123' } });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('無効なトークンの場合は401', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token' } });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('有効なトークンの場合はnextが呼ばれ、req.userが設定される', () => {
    const token = signAccessToken({ userId: 'user-123', role: 'USER' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-123');
    expect(req.user!.role).toBe('USER');
  });
});

describe('requireRole middleware', () => {
  it('ユーザーが必要なロールを持っている場合はnextが呼ばれる', () => {
    const req = mockReq();
    (req as any).user = { userId: 'user-1', role: 'ADMIN' };
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('複数ロール指定で一致する場合はnextが呼ばれる', () => {
    const req = mockReq();
    (req as any).user = { userId: 'user-1', role: 'OWNER' };
    const res = mockRes();
    const next = vi.fn();

    requireRole('OWNER', 'ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('ユーザーが必要なロールを持っていない場合は403', () => {
    const req = mockReq();
    (req as any).user = { userId: 'user-1', role: 'USER' };
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('req.userが未定義の場合は403', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
