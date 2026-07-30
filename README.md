# Mayuko Chat

まゆこ・だいや・あつと・せれな のためのチャットアプリ。

## 技術スタック

- **フロントエンド / API**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **データベース**: Neon (PostgreSQL)
- **ファイルストレージ**: Vercel Blob
- **デプロイ**: Vercel

## 機能

- ユーザー選択ログイン（まゆこ / だいや / あつと / せれな）
- テキストチャット
- 画像送信
- 動画送信
- チャット吹き出しの上に送信者名を表示
- 3秒ごとの自動ポーリング

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
│   │   ├── init/route.ts      # DB初期化エンドポイント
│   │   ├── messages/route.ts  # メッセージCRUD
│   │   └── upload/route.ts    # 画像・動画アップロード
│   ├── chat/page.tsx          # チャット画面
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # ユーザー選択画面
└── lib/
    ├── db.ts                  # Neon DB クライアント
    └── schema.sql             # テーブル定義参照用
```
