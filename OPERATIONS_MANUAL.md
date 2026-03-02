# TripLocal 運用マニュアル

## 1. システム構成

| コンポーネント | 技術 | デプロイ先 |
|---------------|------|-----------|
| フロントエンド | React + TypeScript + Vite | Vercel |
| バックエンド | Express + TypeScript + Prisma | Render |
| データベース | PostgreSQL | Neon |
| 決済 | Stripe (PaymentIntent + Webhook) | — |
| メール送信 | SendGrid | — |

---

## 2. 環境変数一覧

### バックエンド (`backend/.env`)

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | アクセストークン署名鍵 | ランダム文字列（32文字以上） |
| `JWT_REFRESH_SECRET` | リフレッシュトークン署名鍵 | ランダム文字列（32文字以上） |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook署名シークレット | `whsec_...` |
| `SENDGRID_API_KEY` | SendGrid APIキー | `SG.xxxxx` |
| `FROM_EMAIL` | 送信元メールアドレス | `noreply@triplocal.jp` |
| `FRONTEND_URL` | CORS許可オリジン | `https://triplocal.jp` |
| `PORT` | サーバーポート | `4000` |

### フロントエンド

Viteの `server.proxy` でAPIリクエストをバックエンドに転送。
本番ではVercelの `rewrites` でRenderのバックエンドに転送。

---

## 3. ローカル開発

### 前提条件

- Node.js 20+
- npm

### セットアップ

```bash
# バックエンド
cd backend
cp .env.example .env   # 環境変数を設定
npm install
npx prisma generate
npx prisma db push     # スキーマをDBに反映
npm run db:seed         # テストデータ投入

# フロントエンド
cd frontend
npm install
```

### 起動

```bash
# ターミナル1: バックエンド
cd backend && npm run dev    # http://localhost:4000

# ターミナル2: フロントエンド
cd frontend && npm run dev   # http://localhost:5173
```

### テスト

```bash
cd backend && npm test       # ユニットテスト（Vitest）
```

---

## 4. テストアカウント

| メール | パスワード | ロール | 用途 |
|--------|-----------|--------|------|
| `test@triplocal.jp` | `password123` | USER | 一般ユーザー操作 |
| `owner@triplocal.jp` | `password123` | OWNER | 施設管理 |
| `organizer@triplocal.jp` | `password123` | ORGANIZER | イベント管理 |
| `admin@triplocal.jp` | `password123` | ADMIN | 管理者ダッシュボード |

---

## 5. デプロイ手順

### 5.1 バックエンド（Render）

1. Render で New Web Service を作成
2. リポジトリを接続、`backend` をルートディレクトリに指定
3. ビルドコマンド: `npm install && npx prisma generate && npm run build`
4. 起動コマンド: `npm start`
5. 環境変数をすべて設定
6. Stripe Webhook URL を `https://<render-url>/api/payments/webhook` に設定

### 5.2 フロントエンド（Vercel）

1. Vercel でプロジェクトをインポート
2. ルートディレクトリ: `frontend`
3. ビルドコマンド: `npm run build`
4. 出力ディレクトリ: `dist`
5. 環境変数は不要（APIはrewriteで転送）
6. `frontend/vercel.json` の `<render-url>` を実際のRender URLに書き換え

### 5.3 データベースマイグレーション

```bash
cd backend
npx prisma db push    # スキーマ変更を本番DBに反映
```

---

## 6. Stripe 設定

### Webhook 設定

1. Stripe ダッシュボード → 開発者 → Webhook
2. エンドポイントURL: `https://<backend-url>/api/payments/webhook`
3. 対象イベント:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. 署名シークレットを `STRIPE_WEBHOOK_SECRET` に設定

### 決済フロー

**宿泊予約:**
1. ユーザーが予約作成 → PaymentIntent 生成（metadata: `bookingId`）
2. 決済成功 → Webhook → Booking を CONFIRMED + 確認メール送信
3. 決済失敗 → Webhook → Booking を CANCELLED + 空き状況を解放

**イベント参加（有料）:**
1. ユーザーが参加登録 → PaymentIntent 生成（metadata: `eventId`, `userId`）
2. 決済成功 → Webhook → Registration を CONFIRMED + チケットコード発行
3. 決済失敗 → Webhook → Registration を CANCELLED

---

## 7. SendGrid 設定

1. SendGrid ダッシュボード → Settings → API Keys でキーを作成
2. `SENDGRID_API_KEY` に設定
3. Settings → Sender Authentication でドメイン認証を完了
4. `FROM_EMAIL` に認証済みドメインのアドレスを設定

### 送信されるメール

| メール種別 | トリガー | 内容 |
|-----------|---------|------|
| 予約確認 | `payment_intent.succeeded`（宿泊） | 施設名・部屋・日程・金額 |
| キャンセル確認 | キャンセルAPI実行時 | 返金額・返金率 |

---

## 8. キャンセルポリシー

| 期間 | 返金率 |
|------|--------|
| チェックイン7日以上前 | 100% |
| チェックイン3〜6日前 | 50% |
| チェックイン2日前〜当日 | 0% |

ロジック実装: `backend/src/lib/cancellation.ts`

---

## 9. ロール管理

| ロール | 権限 |
|--------|------|
| USER | 宿泊検索・予約・イベント参加 |
| OWNER | USERの権限 + 施設CRUD・部屋管理・予約一覧 |
| ORGANIZER | USERの権限 + イベント作成・管理・参加者一覧 |
| ADMIN | 全権限 + ユーザー管理・施設管理・統計閲覧 |

管理者によるロール変更: 管理者ダッシュボード → ユーザー管理 → ロール変更

---

## 10. API エンドポイント

詳細は `PROGRESS_REPORT.md` の「API エンドポイント一覧」を参照。

### 主要エンドポイント

- `POST /api/auth/register` — ユーザー登録
- `POST /api/auth/login` — ログイン
- `GET /api/accommodations` — 施設検索
- `POST /api/bookings` — 予約作成
- `POST /api/payments/webhook` — Stripe Webhook
- `GET /api/events` — イベント一覧
- `POST /api/events/:id/register` — イベント参加登録

---

## 11. フロントエンド URL構成

| パス | 画面 |
|------|------|
| `/` | トップ / 検索 |
| `/properties/:id` | 施設詳細 |
| `/login` | ログイン |
| `/register` | 新規登録 |
| `/bookings` | マイ予約 |
| `/events` | イベント一覧 |
| `/events/:id` | イベント詳細 |
| `/owner` | オーナーダッシュボード |
| `/admin` | 管理者ダッシュボード |

---

## 12. 多言語対応（i18n）

- **対応言語**: 日本語 / 英語
- **切り替え**: ナビバーの言語ボタン（JA / EN）
- **永続化**: localStorage（キー: `triplocal_lang`）
- **翻訳ファイル**: `frontend/src/i18n/en.json`, `ja.json`
- **DBコンテンツ翻訳**: `frontend/src/lib/content-i18n.ts`（施設名・説明文の辞書方式マッピング）

---

## 13. トラブルシューティング

### よくある問題

| 症状 | 原因 | 対処 |
|------|------|------|
| API が 401 を返す | トークン期限切れ | フロントエンドのリフレッシュ処理を確認 |
| Webhook が動作しない | 署名検証失敗 | `STRIPE_WEBHOOK_SECRET` を確認 |
| メールが届かない | SendGrid ドメイン未認証 | Sender Authentication を完了 |
| DB接続エラー | DATABASE_URL が不正 | SSL パラメータ含むURLを確認 |
| イベント機能が動作しない | マイグレーション未適用 | `npx prisma db push` を実行 |

### ログ確認

```bash
# Render ログ
# Render ダッシュボード → サービス → Logs タブ

# ローカル開発
# バックエンドのコンソール出力を確認（Webhook処理結果等）
```

---

## 14. セキュリティ

- **JWT**: アクセストークン15分 + リフレッシュトークン7日（ハッシュ化してDB保存）
- **パスワード**: bcrypt（コスト12）でハッシュ化
- **レート制限**: 認証エンドポイントに15分/20リクエスト
- **CORS**: `FRONTEND_URL` のみ許可
- **Helmet**: HTTPセキュリティヘッダー自動設定
- **Stripe Webhook**: 署名検証必須
