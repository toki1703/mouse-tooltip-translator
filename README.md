# Mouse Tooltip Translator

> **"Read effortlessly, learn instantly."**
> A translation plugin for Obsidian that completes your reading and learning with just a mouse hover.

<div align="center">
<a href="https://github.com/toki1703/mouse-tooltip-translator/" style="text-decoration: none">
<img alt="Mouse Tooltip Translator downloads - latest release" src="https://img.shields.io/badge/dynamic/json?query=%24%5B%22mouse-tooltip-translator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&label=Downloads:&logo=obsidian&color=8c79de&logoColor=8c79de">
</a>
<a href="https://github.com/toki1703/mouse-tooltip-translator/stargazers" style="text-decoration: none">
<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/toki1703/mouse-tooltip-translator?color=yellow&label=Stargazers%3A&logo=OpenTelemetry&logoColor=yellow">
</a>
<a href="https://github.com/toki1703/mouse-tooltip-translator/releases/latest" style="text-decoration: none">
<img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/toki1703/mouse-tooltip-translator?color=%234e96af&display_name=tag&include_prereleases&label=Latest%20release%3A&logo=Dropbox&logoColor=%236abdd9">
</a>
</div>

---

> [日本語版 README はこちら](README.ja.md)

---
<img alt="Screenshot" src="Shot.jpg">
<center>Screenshot</center>

## Three Key Strengths

### 1. Hover Translation That Keeps You in the Flow
No need to switch to a browser. Simply hover over a word or sentence and a popup instantly shows its meaning. Leverages Google's dictionary feature (POS) to display parts of speech, detailed definitions, and transliteration.

### 2. A Hybrid Engine for Every Use Case
**Speed** — Blazing-fast Google / Google GTX  
**Precision** — Reliable DeepL / Bing / Yandex / Papago  
**Context** — Context-aware LLM (OpenAI-compatible / Ollama / LM Studio)

Assign the best engine independently for hover, text selection, and full-page translation.

### 3. A Vocabulary Book That Turns Reading into an Asset
Every lookup is automatically accumulated in a sidebar vocabulary book. Sort by view count, last reviewed date, or alphabetical order, and filter between words and sentences for efficient review.

---

## What's New in v1.3.8

- **Enhanced page translation**: Added reverse-lookup feature — hover over a translated paragraph to see the original text in a tooltip
- **LLM support**: Local AI translation via Ollama / LM Studio, and support for OpenAI-compatible APIs
- **Smart filter**: Option to hide tooltips when source and target language are the same or when translated text is identical to input
- **Temperature setting**: Adjust generation randomness per LLM engine

---

## Features

- Hover translation for words and sentences
- Translation of selected text
- **Full-page translation in Reading View**
- **Translation history / Vocabulary book** — view and sort all past translations in a sidebar panel
- Choose trigger: mouseover / text selection / both
- Choose hover unit: word / sentence
- **Per-context engine selection** — assign different engines for hover, selection, and page translation
- 9 translation engines supported
- Auto-detection of source language
- Configurable hover delay
- Display of dictionary entries (with parts of speech)
- Display of transliteration / romanization
- Display of source text
- Display of detected language information
- In-memory translation cache (fast re-lookup)
- **Restrict to note content** — option to limit translation to editor/preview only
- **Skip same-language** — hide tooltip when source and target language match
- **Skip identical translations** — hide tooltip when translation result matches input
- Automatic application of Obsidian theme colors
- Command palette support:
  - Hide tooltip
  - Toggle translation on/off
  - Translate selected text
  - **Translate current page**
  - **Restore original (page translation)**
  - **Open vocabulary book**

---

## Usage

1. Enable the plugin in Obsidian
2. Open plugin settings
3. Select a translation engine and target language
4. Hover over a word or select text to show a translation tooltip

Press `Esc` to close the tooltip.

### Page Translation

Switch to **Reading View**, then click the language icon (🌐) in the view header or run the **"Translate current page"** command. A progress bar is displayed while each block is being translated. Click the icon again (or run the **"Restore original"** command) to revert. You can also cancel the translation with the ✕ button on the progress bar.

After translation, hover over any paragraph to see the original text in a tooltip.

### Vocabulary Book

Click the book icon in the ribbon or run the **"Open vocabulary book"** command to open the sidebar panel. All past translations are listed with their view counts, and can be sorted by view count, last reviewed date, or alphabetical order, and filtered by words or sentences.

---

## Settings

| Setting | Description |
| --- | --- |
| Enabled | Master switch for translation |
| Restrict to note content | Respond only within note body (editor / preview / embeds). When disabled, translates across the entire Obsidian UI |
| Hover engine | Engine used for mouseover translation |
| Selection engine | Engine used for text-selection translation |
| Page engine | Engine used for full-page translation |
| Translate from | Source language (includes auto-detect) |
| Translate to | Target language |
| Trigger | Mouseover / selection / both |
| Mouseover unit | Translate the word or sentence under the cursor |
| Hover delay | Wait time before translation starts |
| Show dictionary | Display dictionary-style results when available |
| Show transliteration | Display transliteration / romanization |
| Show source text | Display original text in the tooltip |
| Show detected language | Display detected source and target language |
| Skip same-language translations | Hide tooltip when detected language matches target language |
| Skip identical translations (strict) | Also hide tooltip when translation result is identical to input |
| Disable translation cache | Call the API every time, bypassing the in-memory cache |

---

## Translation Engines

The default engine is Google.

Experimental engines may stop working due to upstream service changes.

| Engine | Notes |
| --- | --- |
| Google | Default. Supports dictionary entries and transliteration |
| Google GTX | Alternative Google endpoint |
| DeepL | Experimental web endpoint |
| Bing | Experimental web endpoint |
| Yandex | Experimental web endpoint |
| Papago | Experimental web endpoint |
| OpenAI-compatible API | Any server implementing the OpenAI Chat Completions API. Requires API URL and model name. API key and custom prompt template are also configurable |
| Ollama | Local inference via Ollama. Requires a running Ollama server and model name |
| LM Studio | Local inference via LM Studio. Requires a running LM Studio server and model name |

### LLM Engine Settings

When an LLM engine (OpenAI-compatible / Ollama / LM Studio) is selected for any context, the following additional settings appear.

| Setting | Description |
| --- | --- |
| API URL | Base URL of the server (e.g. `https://api.openai.com`, `http://localhost:11434`) |
| API Key | API key (OpenAI-compatible only; leave blank for local servers) |
| Model | Model name to use for translation |
| Temperature | Generation randomness. `0` = deterministic, `2` = maximum randomness. Default: `0` |
| Prompt template | Custom prompt template. Use `{{text}}` for source text and `{{targetLang}}` for the target language name. Leave blank to use the built-in default |

---

## Installation

### Community Plugins (Recommended)

Go to Obsidian Settings → Community plugins → Browse, search for `Mouse Tooltip Translator`, and install.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css`
2. Place them in:

   ```
   <your vault>/.obsidian/plugins/mouse-tooltip-translator/
   ```

3. Restart Obsidian or reload the plugin
4. Enable `Mouse Tooltip Translator` from Community plugins

---

## Requirements

- Obsidian desktop app
- Minimum version: `1.12.0`

This plugin is desktop-only.

---

## Notes

- Translation requests are sent to the selected translation service.
- Obsidian's `requestUrl` API is used for network requests.
- Experimental engines may become unstable due to upstream service changes.
- Translation history is saved in `translation-log.json` inside the plugin folder.

---

## License

MIT License

---

*Inspired by the [Mouse Tooltip Translator](https://chromewebstore.google.com/detail/mouse-tooltip-translator/hmigninkgibhdckiaphhmbgcghochdjc?hl=ja) Chrome extension.*
