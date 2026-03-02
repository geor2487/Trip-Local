import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, JwtPayload } from '../lib/jwt.js';

const testPayload: JwtPayload = {
  userId: 'user-123',
  role: 'USER',
};

describe('JWT Access Token', () => {
  it('アクセストークンの生成と検証', () => {
    const token = signAccessToken(testPayload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.role).toBe('USER');
  });

  it('不正なトークンは検証に失敗', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('空のトークンは検証に失敗', () => {
    expect(() => verifyAccessToken('')).toThrow();
  });

  it('リフレッシュ用シークレットで署名されたトークンはアクセス検証に失敗', () => {
    const refreshToken = signRefreshToken(testPayload);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe('JWT Refresh Token', () => {
  it('リフレッシュトークンの生成と検証', () => {
    const token = signRefreshToken(testPayload);
    expect(token).toBeTruthy();

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.role).toBe('USER');
  });

  it('アクセス用シークレットで署名されたトークンはリフレッシュ検証に失敗', () => {
    const accessToken = signAccessToken(testPayload);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('JWT ペイロード', () => {
  it('ADMINロールのペイロードが正しく保持される', () => {
    const adminPayload: JwtPayload = { userId: 'admin-1', role: 'ADMIN' };
    const token = signAccessToken(adminPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.role).toBe('ADMIN');
  });

  it('OWNERロールのペイロードが正しく保持される', () => {
    const ownerPayload: JwtPayload = { userId: 'owner-1', role: 'OWNER' };
    const token = signAccessToken(ownerPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.role).toBe('OWNER');
  });
});
