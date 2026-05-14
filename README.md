# Mouse Tooltip Translator

> **"Read effortlessly, learn instantly."**
> Obsidianでの読書と学習を、マウスホバーだけで完結させる翻訳プラグイン。

<div align="center">
<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/" style="text-decoration: none">
<img alt="Mouse Tooltip Translator downloads - latest release" src="https://img.shields.io/badge/dynamic/json?query=%24%5B%22obsidian-mouse-tooltip-translator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&label=Downloads:&logo=obsidian&color=8c79de&logoColor=8c79de">
</a>
<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/stargazers" style="text-decoration: none">
<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/toki1703/obsidian-mouse-tooltip-translator?color=yellow&label=Stargazers%3A&logo=OpenTelemetry&logoColor=yellow">
</a>
<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/releases/latest" style="text-decoration: none">
<img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/toki1703/obsidian-mouse-tooltip-translator?color=%234e96af&display_name=tag&include_prereleases&label=Latest%20release%3A&logo=Dropbox&logoColor=%236abdd9">
</a>
</div>

---

## 3つの強み

### 1. 思考を止めない「ホバー翻訳」
ブラウザに切り替える必要はありません。単語や文章にマウスを重ねるだけで、ポップアップが瞬時に意味を提示。Googleの辞書機能（POS）を活用し、品詞や詳細な意味、音写（ローマ字読み）まで表示します。

### 2. 用途別に使い分けるハイブリッド・エンジン
**Speed** — 爆速のGoogle / Google GTX  
**Precision** — 信頼のDeepL / Bing / Yandex / Papago  
**Context** — 文脈を読むLLM（OpenAI互換 / Ollama / LM Studio）

ホバー・テキスト選択・ページ全体翻訳のそれぞれに、最適なエンジンを個別に割り当てられます。

### 3. 「読む」を「資産」に変える単語帳
調べた履歴は自動的にサイドバーの単語帳へ蓄積。閲覧数・最終確認日・アルファベット順でソートし、単語と文章を絞り込んで効率的に復習できます。

---

## What's New in v1.3.1

- **ページ翻訳の強化**: 翻訳後の段落にホバーすると原文がツールチップ表示される逆引き機能を追加
- **LLM対応**: Ollama / LM Studio によるローカルAI翻訳、OpenAI互換APIに対応
- **スマートフィルター**: 同言語・同一テキストの場合はツールチップを非表示にするオプションを追加
- **温度設定**: LLMエンジンの生成ランダム性を各エンジンごとに調整可能

---

## Features

- 単語・文章のホバー翻訳
- 選択テキストの翻訳
- **閲覧モード（Reading View）でのページ全体翻訳**
- **翻訳履歴 / 単語帳** — サイドバーパネルで過去の翻訳をすべて閲覧・ソート
- トリガーを選択: マウスオーバー / テキスト選択 / 両方
- ホバー単位を選択: 単語 / 文章
- **コンテキスト別エンジン選択** — ホバー・選択・ページ翻訳に異なるエンジンを割り当て
- 9種類の翻訳エンジン対応
- 翻訳元言語の自動検出
- ホバーディレイの設定
- 辞書エントリ（品詞付き）の表示
- 音写 / ローマ字読みの表示
- 翻訳元テキストの表示
- 検出言語情報の表示
- 翻訳結果のメモリキャッシュ（高速な再検索）
- **ノートコンテンツへの制限** — エディタ・プレビュー内のみに翻訳を限定するオプション
- **同言語スキップ** — 翻訳元と翻訳先が同じ言語の場合はツールチップを非表示
- **同一テキストスキップ** — 翻訳結果が入力と同じ場合はツールチップを非表示
- Obsidianテーマカラーの自動適用
- コマンドパレット対応:
  - ツールチップを非表示
  - 翻訳のオン/オフ切り替え
  - 選択テキストの翻訳
  - **現在のページを翻訳**
  - **原文に戻す（ページ翻訳）**
  - **単語帳を開く**

---

## Usage

1. ObsidianでプラグインをEnableにする
2. プラグイン設定を開く
3. 翻訳エンジンと翻訳先言語を選択する
4. 単語にホバーするか、テキストを選択して翻訳ツールチップを表示する

`Esc` キーでツールチップを閉じます。

### ページ翻訳

**閲覧モード（Reading View）** に切り替え、ビューヘッダーの言語アイコン（🌐）をクリックするか、**「現在のページを翻訳」** コマンドを実行します。各ブロックの翻訳中はプログレスバーが表示されます。再度アイコンをクリック（または **「原文に戻す」** コマンドを実行）すると元の表示に戻ります。プログレスバーの ✕ ボタンで翻訳をキャンセルすることもできます。

翻訳後は、各段落にホバーすると原文がツールチップで確認できます。

### 単語帳

リボンの本のアイコンをクリックするか、**「単語帳を開く」** コマンドを実行してサイドバーパネルを開きます。過去の翻訳が閲覧数とともに一覧表示され、閲覧数・最終確認日・アルファベット順にソートしたり、単語・文章でフィルタリングしたりできます。

---

## Settings

| 設定 | 説明 |
| --- | --- |
| Enabled | 翻訳機能のマスタースイッチ |
| Restrict to note content | ノート本文（エディタ・プレビュー・埋め込み）内のみに反応。無効にするとObsidian UI全体で翻訳 |
| ホバー翻訳エンジン | マウスオーバー翻訳に使用するエンジン |
| テキスト選択エンジン | テキスト選択翻訳に使用するエンジン |
| ページ翻訳エンジン | ページ全体翻訳に使用するエンジン |
| Translate from | 翻訳元言語（自動検出を含む） |
| Translate to | 翻訳先言語 |
| Trigger | マウスオーバー・選択・両方 |
| Mouseover unit | カーソル下の単語または文章を翻訳 |
| Hover delay | 翻訳開始までの待機時間 |
| Show dictionary | 利用可能な場合に辞書形式の結果を表示 |
| Show transliteration | 音写 / ローマ字読みを表示 |
| Show source text | ツールチップに元のテキストを表示 |
| Show detected language | 検出した翻訳元・翻訳先言語を表示 |
| Skip same-language translations | 検出言語と翻訳先言語が一致する場合はツールチップを非表示 |
| Skip identical translations (strict) | 翻訳結果が入力テキストと同一の場合も非表示 |
| Disable translation cache | 毎回APIを呼び出し、メモリキャッシュをバイパス |

---

## Translation Engines

デフォルトエンジンはGoogleです。

実験的なエンジンは、上流サービスの変更により動作しなくなる場合があります。

| エンジン | 備考 |
| --- | --- |
| Google | デフォルト。辞書エントリと音写に対応 |
| Google GTX | Googleの代替エンドポイント |
| DeepL | 実験的なWebエンドポイント |
| Bing | 実験的なWebエンドポイント |
| Yandex | 実験的なWebエンドポイント |
| Papago | 実験的なWebエンドポイント |
| OpenAI-compatible API | OpenAI Chat Completions APIを実装した任意のサーバー。API URLとモデル名が必要。APIキーとカスタムプロンプトテンプレートも指定可能 |
| Ollama | Ollamaによるローカル推論。Ollamaサーバーの起動とモデル名の指定が必要 |
| LM Studio | LM Studioによるローカル推論。LM Studioサーバーの起動とモデル名の指定が必要 |

### LLMエンジン設定

いずれかのコンテキストでLLMエンジン（OpenAI互換・Ollama・LM Studio）を選択すると、以下の追加設定が表示されます。

| 設定 | 説明 |
| --- | --- |
| API URL | サーバーのベースURL（例: `https://api.openai.com`、`http://localhost:11434`） |
| API Key | APIキー（OpenAI互換のみ。ローカルサーバーの場合は空欄） |
| Model | 翻訳に使用するモデル名 |
| Temperature | 生成のランダム性。`0` = 決定論的、`2` = 最大ランダム。デフォルト: `0` |
| プロンプトテンプレート | カスタムプロンプトテンプレート。`{{text}}` で原文、`{{targetLang}}` で翻訳先言語名を参照。空欄の場合は組み込みのデフォルトを使用 |

---

## Installation

### Community Plugins（推奨）

Obsidianの設定 → Community plugins → Browse で `Mouse Tooltip Translator` を検索してインストール。

### Manual Installation

1. `main.js`、`manifest.json`、`styles.css` をダウンロード
2. 以下のパスに配置:

   ```
   <your vault>/.obsidian/plugins/obsidian-mouse-tooltip-translator/
   ```

3. Obsidianを再起動またはプラグインをリロード
4. Community plugins から `Mouse Tooltip Translator` を有効化

---

## Requirements

- Obsidian デスクトップアプリ
- 最低バージョン: `1.12.0`

このプラグインはデスクトップ専用です。

---

## Notes

- 翻訳リクエストは選択した翻訳サービスに送信されます。
- ネットワークリクエストにはObsidianの `requestUrl` APIを使用します。
- 実験的なエンジンは上流サービスの変更により不安定になる場合があります。
- 翻訳履歴はプラグインフォルダ内の `translation-log.json` に保存されます。

---

## License

Mit License

---

*Inspired by the [Mouse Tooltip Translator](https://chromewebstore.google.com/detail/mouse-tooltip-translator/hmigninkgibhdckiaphhmbgcghochdjc?hl=ja) Chrome extension.*
