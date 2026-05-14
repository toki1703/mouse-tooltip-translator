# Mouse Tooltip Translator for Obsidian


<div align="center">
<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/" style="text-decoration: none">
<img alt="Mouse Tooltip Translator for Obsidian downloads - latest release" src="https://img.shields.io/badge/dynamic/json?query=%24%5B%22obsidian-mouse-tooltip-translator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&label=Downloads:&logo=obsidian&color=8c79de&logoColor=8c79de">
</a>
<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/stargazers" style="text-decoration: none">
<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/toki1703/obsidian-mouse-tooltip-translator?color=yellow&label=Stargazers%3A&logo=OpenTelemetry&logoColor=yellow">
</a>

<a href="https://github.com/toki1703/obsidian-mouse-tooltip-translator/releases/latest" style="text-decoration: none">
<img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/toki1703/obsidian-mouse-tooltip-translator?color=%234e96af&display_name=tag&include_prereleases&label=Latest%20release%3A&logo=Dropbox&logoColor=%236abdd9">
</a>
</div>

---





Hover to translate text in Obsidian.

This plugin is inspired by the "Mouse Tooltip Translator" Chrome extension. It shows a translation tooltip when you hover over a word or select text in Obsidian.

## Features

- Translate a word under the mouse cursor
- Translate selected text
- Choose how translations are triggered:
  - Mouseover
  - Selection
  - Mouseover + Selection
- Choose the mouseover unit:
  - Word
  - Sentence
- Select the translation engine:
  - Google
  - Google GTX
  - DeepL
  - Bing
  - Yandex
  - Papago
- Auto-detect the source language
- Configure source and target languages
- Configure hover delay
- Show dictionary entries with parts of speech when available
- Show transliteration / romanization when available
- Show the original source text in the tooltip
- Show detected language information
- Cache translation results for faster repeated lookups
- Use Obsidian theme colors for the tooltip
- Use commands from the command palette:
  - Hide tooltip
  - Toggle translator on/off
  - Translate current selection

## Usage

1. Enable the plugin in Obsidian.
2. Open the plugin settings.
3. Choose your translation engine and target language.
4. Hover over a word or select text to show the translation tooltip.

Press `Esc` to hide the tooltip.

## Settings

| Setting | Description |
| --- | --- |
| Enabled | Master switch for the translator |
| Translator engine | Translation service used by the plugin |
| Translate from | Source language, including auto-detect |
| Translate to | Target language |
| Trigger | Mouseover, selection, or both |
| Mouseover unit | Translate a word or sentence under the cursor |
| Hover delay | Wait time before translation starts |
| Show dictionary | Show dictionary-style results when available |
| Show transliteration | Show romanization / reading when available |
| Show source text | Show the original text in the tooltip |
| Show detected language | Show detected source and target language |

## Translation Engines

The default engine is Google.

Some engines are experimental and may stop working if the upstream web service changes.

| Engine | Notes |
| --- | --- |
| Google | Default engine. Supports dictionary entries and transliteration when available |
| Google GTX | Alternative Google endpoint |
| DeepL | Experimental web endpoint |
| Bing | Experimental web endpoint |
| Yandex | Experimental web endpoint |
| Papago | Experimental web endpoint |

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css`.
2. Place them in:

   ```text
   <your vault>/.obsidian/plugins/obsidian-mouse-tooltip-translator/
   ```

3. Restart Obsidian or reload plugins.
4. Enable `Mouse Tooltip Translator for Obsidian` from Community plugins.

## Requirements

- Obsidian desktop app
- Minimum Obsidian version: `0.15.0`

This plugin is desktop-only.

## Notes

- Translation requests are sent to the selected translation service.
- The plugin uses Obsidian's `requestUrl` API for network requests.
- Experimental engines may be unstable depending on upstream service changes.

## License

No license has been specified yet.
