# Pourō — デプロイ手順書（PWA / オフライン対応）

> 対象：Step 1–7 統合版 `index.html` を **インストール可能なオフラインPWA** として配布する。
> 構成：静的ファイルのみ（HTML / CSS / Vanilla JS / PNGアイコン）。サーバー側処理・ビルド工程なし。

---

## 1. 配布ファイル一覧

デプロイ時はこのフォルダの中身を **そのままの相対構造で** 公開する。

```
/
├── index.html              ← アプリ本体（SPA・PWAメタ・SW登録済み）
├── manifest.webmanifest    ← インストール定義
├── service-worker.js       ← オフラインキャッシュ（cache-first）
├── icons/                  ← PWAインストール用アイコン（ホーム画面/スプラッシュ）
│   ├── icon-192.png / icon-512.png / icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon-32.png / favicon-180.png
└── assets/
    └── icons/              ← UI内アイコン（採用確定セット）
        ├── 128/  …  method / ui / info（各 dark·muted·active·white）
        └── 64/   …  同上（軽量版）
```

> UIアイコンは `assets/icons/128`（既定参照）と `assets/icons/64`（軽量）。
> 1024px のマスター素材は `assets/icons/1024`（配布不要・編集用に保管）。
> index.html が実際に参照する 128px 分のみ service-worker.js の precache に登録済み。

> 補足：`MASTER_SPEC.md` や `Pourō System Map.html`、`Pourō *.html`（個別画面プロトタイプ）は
> ドキュメント／設計資料であり、**本番デプロイには含めない**（含めても害はないが不要）。

---

## 2. 前提・必須条件

- **HTTPS 必須**：Service Worker は `https://` か `http://localhost` でしか動かない。
  独自ドメインを使うなら証明書が必要（下記ホスティングは自動でHTTPS）。
- **相対パスで配置**：`manifest.webmanifest` / `service-worker.js` / `icons/` は
  `index.html` と同じ階層に置く。サブディレクトリ配下（例 `/pouro/`）に置いても
  すべて相対パスなのでそのまま動く。
- **MIMEタイプ**：`.webmanifest` は `application/manifest+json`、`.js` は
  `text/javascript` で配信されること（下記ホスティングは自動）。

---

## 3. デプロイ手順（推奨：いずれか1つ）

### A. Netlify（ドラッグ&ドロップ／最短）
1. https://app.netlify.com/drop を開く。
2. このフォルダ（上記ファイル一式）を **フォルダごとドラッグ&ドロップ**。
3. 発行された `https://〇〇.netlify.app` が公開URL。HTTPS自動。
4. 更新時は同じ画面に新しいフォルダを再ドロップ。

### B. Vercel（CLI）
```bash
npm i -g vercel
cd <このフォルダ>
vercel            # 初回はログイン→プロジェクト作成
vercel --prod     # 本番公開
```

### C. GitHub Pages
1. リポジトリを作成し、ファイル一式をルートに push。
2. Settings → Pages → Branch を `main` / `(root)` に設定。
3. `https://<user>.github.io/<repo>/` で公開（サブパス配下でも相対パスなので動作）。

### D. ローカル確認（デプロイ前テスト）
SWは `file://` では動かないので簡易サーバーを立てる：
```bash
cd <このフォルダ>
python3 -m http.server 8080
# → http://localhost:8080 を開く（localhost は SW 許可対象）
```

---

## 4. 動作確認チェックリスト（デプロイ後・PC Chrome）

DevTools → **Application** タブで確認：

- [ ] **Manifest**：name / icons / theme_color / display=standalone が表示される。
- [ ] **Service Workers**：`service-worker.js` が `activated and running`。
- [ ] **Cache Storage**：`pouro-v1.2.0` に index.html / manifest / icons（新Brewアイコン含む）が入っている。
- [ ] **オフライン再現**：DevTools → Network → `Offline` に切替 → リロード → 通常表示される。
- [ ] Lighthouse → PWA カテゴリで installable 判定。

---

## 5. iPhone 実機インストール（Safari）

> iOS は PWA を **Safari からのみ** ホーム追加できる（Chrome等は不可）。

1. iPhone の **Safari** で公開URL（`https://…`）を開く。
2. 下部の **共有ボタン**（□↑）→ **「ホーム画面に追加」**。
3. 名称が **Pourō**、アイコンがドリッパー（チャコール地）になっていることを確認 → 追加。
4. ホーム画面のアイコンから起動 → **ブラウザのアドレスバーが消えた全画面（standalone）** で開けばOK。
5. **オフライン確認**：機内モードにして再度アイコンから起動 → アプリが通常通り表示されれば完成。

### iPhone で見るべきポイント
- ステータスバー（時刻・電池）の文字が背景（cream）に対して読めるか（`status-bar-style: default`）。
- セーフエリア（ノッチ／ホームインジケータ）にUIが被っていないか（`viewport-fit=cover` ＋ `env(safe-area-inset-*)` 対応済み）。
- 抽出中（Active Brew）にタブバー非表示・タイマーが正確か。

---

## 6. 更新（リリース）手順

アプリを更新したら **キャッシュを無効化** するためにバージョンを上げる：

1. `service-worker.js` の先頭 `CACHE_VERSION` を変更（現行 `pouro-v1.2.0`、例 → `pouro-v1.2.1`）。
2. ファイル一式を再デプロイ。
3. 既存ユーザーは次回起動時に新SWが入り、**さらに次の起動で**新バージョンへ切替わる
   （`SKIP_WAITING` 実装済みのため、2回目の起動で確実に反映）。
4. 確実に最新を見たいときは：iOSは一度ホームから削除→再追加、PCはDevTools → Application →
   Service Workers → `Unregister` 後リロード。

> アイコンやファイルを **追加** した場合は `service-worker.js` の `PRECACHE_URLS` にも追記すること。

---

## 7. 既知の制約（v1.0）

- iOS PWA はプッシュ通知・バックグラウンド動作に制限あり（本アプリは未使用なので影響なし）。
- 「画面スリープ抑止（Keep screen awake）」は Settings 上の状態表示のみ。実機での Wake Lock 連動は v1.1 検討。
- History 詳細表示・Rebrew・Export は v1.1 以降（仕様どおり）。

---

*次工程：デプロイ → iPhone 実機でインストール＆オフライン確認 → 問題なければ v1.0 公開。*
