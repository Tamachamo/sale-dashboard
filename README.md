# ネイルチップ販売管理（Sheets + Apps Script + React）

## セットアップ
1. Googleスプレッドシートに `sales` シートを用意。
2. `server/Code.gs` を Apps Script に貼り、スクリプトプロパティ `API_TOKEN` を設定 → WebApp公開（/exec URL取得）。
3. `.env.local` を作成（コミットしない）:

```
VITE_API_BASE="https://script.google.com/macros/s/XXXX/exec"
VITE_API_KEY="your-secret-token"
```

4. 実行:

```
npm i
npm run dev
```

## 構成
- Frontend: Vite + React + Tailwind + Recharts
- API: Apps Script WebApp
- DB: Google Sheets (`sales`)

## ビルド

```
npm run build
npm run preview
```
