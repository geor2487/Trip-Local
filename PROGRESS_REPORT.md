# TripLocal Phase 1 — 進捗レポート

**報告日**: 2026-03-02
**報告者**: 開発チーム
**フェーズ**: Phase 1（Today MVP）

---

## サマリー

Phase 1 のバックエンド・フロントエンド実装がほぼ完了。
コア機能（宿泊検索 → 予約 → Stripe 決済 → メール通知 → キャンセル）のコードは一通り揃っている。
結合テスト・動作確認が残っている状況。

---

## 全体進捗: **約 85%**

| カテゴリ | 進捗 | 備考 |
|----------|------|------|
| DB スキーマ + マイグレーション | 100% | Prisma + Neon PostgreSQL。スキーマ適用済み |
| 認証 API（JWT） | 100% | 登録・ログイン・トークンリフレッシュ実装済み |
| 施設一覧・詳細 API | 100% | エリア検索・空き状況カレンダーAPI 含む |
| 予約作成 API | 100% | SELECT FOR UPDATE + トランザクションによる二重予約防止済み |
| Stripe 決済 | 100% | PaymentIntent 作成（予約時）+ Webhook（succeeded / failed）対応済み |
| キャンセル API | 100% | 統一キャンセルポリシー（7日前100% / 3日前50% / 2日前〜0%）+ Stripe 返金処理済み |
| メール通知（SendGrid） | 100% | 予約確認メール + キャンセル確認メール。HTML/テキスト両対応 |
| シードデータ | 100% | 施設・部屋のテストデータ準備済み |
| フロントエンド画面 | 100% | 4画面実装済み（トップ / 施設詳細 / 認証 / マイ予約） |
| API クライアント | 100% | 自動トークンリフレッシュ付き |
| デザイン・CSS | 100% | デザイントークン適用済み。フォントは Noto Serif JP に変更済み |
| Git リポジトリ | 100% | 初期化＋初回コミット完了 |
| Google OAuth | 0% | スキーマ対応済みだが API 未実装。Phase 1 では JWT 認証のみ |
| 結合テスト（E2E） | 0% | 未着手 |
| デプロイ | 0% | 未着手（Vercel + Render 予定） |

---

## 実装済み機能の詳細

### バックエンド（Express 5 + TypeScript）

**API エンドポイント一覧**:

| メソッド | パス | 機能 | 認証 |
|----------|------|------|------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/refresh` | トークンリフレッシュ | 不要 |
| GET | `/api/auth/me` | ユーザー情報取得 | 必要 |
| GET | `/api/accommodations` | 施設一覧（検索） | 不要 |
| GET | `/api/accommodations/:id` | 施設詳細 | 不要 |
| GET | `/api/accommodations/:id/availability` | 空き状況 | 不要 |
| GET | `/api/bookings` | 予約一覧 | 必要 |
| POST | `/api/bookings` | 予約作成 | 必要 |
| GET | `/api/bookings/:id` | 予約詳細 | 必要 |
| PUT | `/api/bookings/:id/cancel` | キャンセル | 必要 |
| POST | `/api/payments/webhook` | Stripe Webhook | 不要（署名検証） |

**セキュリティ対策**:
- Helmet（HTTP ヘッダー保護）
- CORS 設定（フロントエンド URL 制限）
- レート制限（認証エンドポイント: 15分あたり20リクエスト）
- Stripe Webhook 署名検証
- SELECT FOR UPDATE による二重予約防止

**メール通知（SendGrid）**:
- 予約確認メール: Stripe Webhook（`payment_intent.succeeded`）受信後に自動送信
- キャンセル確認メール: キャンセル API 実行後に自動送信（返金額・返金率を含む）
- HTML + プレーンテキストの両形式対応
- キャンセルポリシーをメール本文にも記載（設計仕様の「3箇所表示」要件に対応）

### フロントエンド（React 19 + Vite + TypeScript）

**画面構成**:

| 画面 | ファイル | 主要機能 |
|------|----------|----------|
| トップ / 検索 | `HomePage.tsx` (208行) | エリア・日程・人数で施設検索、注目施設カード表示 |
| 施設詳細 | `PropertyDetailPage.tsx` (322行) | 画像・施設情報・空き状況カレンダー・予約フォーム |
| 認証 | `AuthPage.tsx` (148行) | ログイン・新規登録フォーム |
| マイ予約 | `MyBookingsPage.tsx` (247行) | 予約一覧（タブ切替）・キャンセル機能 |

**共通基盤**:
- API クライアント（401 時の自動トークンリフレッシュ）
- 認証 Context（ログイン状態のグローバル管理）
- React Query（データフェッチ + キャッシュ）

---

## 環境変数（設定状況）

| 変数名 | 状態 |
|--------|------|
| `DATABASE_URL` | 設定済み（Neon PostgreSQL） |
| `JWT_SECRET` | 設定済み |
| `JWT_REFRESH_SECRET` | 設定済み |
| `STRIPE_SECRET_KEY` | 設定済み |
| `STRIPE_WEBHOOK_SECRET` | 設定済み |
| `SENDGRID_API_KEY` | 設定済み |
| `FROM_EMAIL` | 未設定（デフォルト: noreply@triplocal.jp。SendGrid ドメイン認証後に設定） |
| `GOOGLE_CLIENT_ID` | 未設定（Phase 1 スコープ外） |

---

## 未完了タスク（残作業）

### 優先度: 高

| タスク | 見積もり | ブロッカー |
|--------|----------|-----------|
| バックエンド起動 + フロントエンド接続の動作確認 | — | なし |
| Stripe テストモードでの決済フロー確認 | — | なし |
| SendGrid ドメイン認証 + メール送信テスト | — | ドメイン認証が必要（未実施の場合サンドボックス制限あり） |
| シードデータ投入 → 検索 → 予約 → 決済 → メール受信の一気通貫テスト | — | 上記すべて |

### 優先度: 中

| タスク | 見積もり | ブロッカー |
|--------|----------|-----------|
| Vercel（FE）+ Render（BE）へのデプロイ | — | 動作確認完了後 |
| Stripe Webhook のデプロイ先 URL 設定 | — | デプロイ先確定後 |

### 優先度: 低（Phase 2 以降でも可）

| タスク | 見積もり | ブロッカー |
|--------|----------|-----------|
| Google OAuth 実装 | — | Google Cloud Console で client_id 取得が必要 |
| React Router 導入（現在は state ベースルーティング） | — | なし |

---

## 技術的なメモ

1. **決済フローの構造**: PaymentIntent の作成は予約作成 API（`POST /api/bookings`）内で行い、Webhook 受信は別エンドポイント（`POST /api/payments/webhook`）で処理する設計。Webhook が `payment_intent.succeeded` を受信した時点で予約ステータスが `CONFIRMED` に更新される。

2. **フォント変更**: 当初予定の `Source Han Serif Japanese` ではなく `Noto Serif JP`（Variable Font）を採用。同じ源ノ明朝ベースのフォントだが、Variable Font 対応により軽量。

3. **ルーティング**: React Router は未導入。`useState` ベースの簡易ルーティングで実装されている。Phase 1 の4画面であれば問題ないが、Phase 2 以降で画面が増える場合は React Router への移行を推奨。

4. **メール通知**: メール送信は非同期で実行し、送信失敗時はログ出力のみ（API レスポンスには影響しない）。メール送信失敗が予約・キャンセル処理をブロックしない設計。SendGrid ドメイン認証が未完了の場合はサンドボックス制限（認証済みメールアドレスのみに送信可能）がかかる点に注意。

---

## リスク・懸念事項

| リスク | 影響 | 対策 |
|--------|------|------|
| 結合テスト未実施 | 画面間の連携不具合の可能性 | 動作確認を優先的に実施 |
| Google OAuth 未実装 | ソーシャルログインが使えない | Phase 1 は email/password 認証で代替 |
| state ベースルーティング | ブラウザの戻る/進むが効かない | Phase 2 で React Router 導入予定 |
| SendGrid ドメイン認証未実施 | 本番でメール到達率が低下する可能性 | デプロイ前にドメイン認証を完了させる |
