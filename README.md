# Mayuko Chat

まゆこ・だいや・あつと・せれな・るちえ のためのチャットアプリ。

## 技術スタック

- **フロントエンド / API**: Next.js (App Router) + TypeScript + Tailwind CSS
- **データベース**: Neon (PostgreSQL)
- **ファイルストレージ**: Vercel Blob
- **プッシュ通知**: Web Push API / Service Worker
- **デプロイ**: Vercel

## 機能

- ユーザー選択ログイン（まゆこ / だいや / あつと / せれな / るちえ）
- テキストチャット
- 画像送信
- 動画送信
- メッセージ削除（自分のメッセージのみ）
- 既読 / 未読管理（まゆこ向け）
- メッセージ文字サイズ変更（小 / 中 / 大）
- 定型文フロートウィンドウ
- ユーザーごとの色テーマ
- チャット吹き出しの上に送信者名を表示
- プッシュ通知送信
- 通知許可 / 購読登録
- 3秒ごとの自動ポーリング
- ログイン時の最下部スクロール
- 最下部到達時の自動スクロール維持
- 設定ページ（/settings）

---

## セットアップ手順

### 1. Neon でデータベースを作成

1. [neon.tech](https://neon.tech) でアカウントを作成
2. 新しいプロジェクトを作成
3. **Connection string** (`DATABASE_URL`) をコピー

### 2. Vercel でプロジェクトを作成

1. [vercel.com](https://vercel.com) でアカウントを作成
2. このリポジトリを GitHub にプッシュ
3. Vercel Dashboard → **Add New Project** → リポジトリを選択

### 3. Vercel Blob Storage を作成

1. Vercel Dashboard → プロジェクト → **Storage** タブ
2. **Create Blob Store** をクリック
3. `BLOB_READ_WRITE_TOKEN` が自動的に環境変数に追加される

### 4. 環境変数を設定

Vercel Dashboard → **Settings** → **Environment Variables** に以下を追加:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon の接続文字列 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob のトークン（自動追加済みの場合はスキップ） |
| `NEXT_PUBLIC_STUN_URLS` | `stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302` |
| `NEXT_PUBLIC_TURN_URLS` | `turn:standard.relay.metered.ca:80,turn:standard.relay.metered.ca:80?transport=tcp,turn:standard.relay.metered.ca:443,turns:standard.relay.metered.ca:443?transport=tcp` |
| `NEXT_PUBLIC_TURN_USERNAME` | Metered の Username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Metered の Password |

### 4-1. 通話が Wi-Fi × 5G で失敗する場合

この症状は、P2P 直結ができず TURN 経由の中継が必要なケースがほとんどです。`NEXT_PUBLIC_TURN_URLS` を設定し、`turns:...:443` を必ず含めてください。`candidate type: relay` が出れば TURN が使えています。

注意:

- Metered の API Key をブラウザ側に置かないでください。
- TURN の接続先と資格情報だけを環境変数で渡してください。
- `NEXT_PUBLIC_...` はブラウザに公開されます。ここには TURN の接続情報だけを置き、管理用 API Key は入れないでください。

### 5. デプロイ

Vercel Dashboard から **Deploy** を実行。

### 6. DB テーブルを初期化

デプロイ後、ブラウザで以下の URL にアクセス（1度だけ）:

```
https://あなたのドメイン.vercel.app/api/init
```

`{ "ok": true, "message": "テーブルを作成しました" }` が返ればOK。

---

## ローカル開発

```bash
# 依存関係インストール
npm install

# .env.local を作成して環境変数を設定
cp .env.example .env.local
# .env.local を編集して DATABASE_URL, BLOB_READ_WRITE_TOKEN を設定

# 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

---

## ファイル構成

```
src/
├── app/
│   ├── api/
│   │   ├── clear-mayuko-read/route.ts # まゆこ未読リセット
│   │   ├── init/route.ts              # DB初期化エンドポイント
│   │   ├── log/route.ts               # ログ記録
│   │   ├── messages/route.ts          # メッセージCRUD
│   │   ├── notify/route.ts            # プッシュ通知送信
│   │   ├── subscribe/route.ts         # 通知購読登録
│   │   └── upload/route.ts            # 画像・動画アップロード
│   ├── chat/page.tsx                  # チャット画面
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                       # ユーザー選択画面
│   └── settings/page.tsx              # 管理ページ
└── lib/
    ├── db.ts                          # Neon DB クライアント
    └── schema.sql                     # テーブル定義参照用
```

---

## 補足

- まゆこの既読管理は `mayuko_read_at` を使って保存しています。
- 通知は Service Worker 経由で配信されます。
- ログイン後のチャット画面は、初回表示時と最下部到達時の更新で自動スクロールします。
