const { Plugin, PluginSettingTab, Setting, Notice, requestUrl, ItemView, Platform } = require('obsidian');
const nodeCrypto = require('crypto');

const DEFAULT_SETTINGS = {
  mouseoverEngine: 'google',
  selectionEngine: 'google',
  pageEngine: 'google',
  sourceLang: 'auto',
  targetLang: 'ja',
  enableHover: true,
  enableSelection: true,
  enablePage: true,
  enableHoverMobile: true,
  enableSelectionMobile: true,
  enablePageMobile: true,
  textType: 'word',               // 'word' | 'sentence'
  delayMs: 500,
  showSourceText: false,
  showDetectedLang: false,
  showDictionary: true,
  showTransliteration: false,
  enabled: true,
  // When true, only react inside Obsidian note content (editor / preview / rendered embeds).
  // When false, react across the entire UI (sidebars, headers, etc.) — original behavior.
  restrictToNoteContent: true,
  // Which Obsidian view modes to react in (requires restrictToNoteContent: true).
  // 'edit'    : editor only (source / live preview)
  // 'reading' : reading view only
  // 'both'    : both (default)
  activeMode: 'both',
  // Suppress the tooltip when detected source language equals the target language.
  skipSameLanguage: true,
  // Stricter fallback: suppress when the translated text is identical to the input.
  // Helps when language detection is wrong (e.g. short tokens, proper nouns).
  skipIdenticalText: false,
  // When true, always call the translation API and never read from in-memory cache.
  disableCache: false,
  // When true and page translation is showing, hover shows the pre-translation text
  // of the paragraph instead of running the normal word/sentence tooltip.
  pageTranslationHoverOriginal: true,
  // LLM engine settings
  openaiCompatApiUrl: 'https://api.openai.com',
  openaiCompatApiKey: '',
  openaiCompatModel: 'gpt-4o-mini',
  openaiCompatPrompt: '',
  openaiCompatTemperature: 0,
  ollamaApiUrl: 'http://localhost:11434',
  ollamaModel: '',
  ollamaPrompt: '',
  ollamaTemperature: 0,
  lmstudioApiUrl: 'http://localhost:1234',
  lmstudioModel: '',
  lmstudioPrompt: '',
  lmstudioTemperature: 0,
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const STRINGS = {
  en: {
    // Tooltip
    origLabel: 'Original:',
    noTranslation: '(no translation)',
    // Vocab view
    vocabTitle: 'Vocabulary',
    vocabReload: 'Reload',
    sortByCount: 'By view count',
    sortByRecent: 'Recently viewed',
    sortAlpha: 'Alphabetical',
    filterAll: 'All',
    filterWord: 'Word',
    filterSentence: 'Sentence',
    vocabEmpty: 'No translation history',
    // Page translator
    pageAlreadyRunning: 'Page translation is already running.',
    pageNeedReadingView: 'Please switch to Reading View to translate the page.',
    pageNoText: 'No text found to translate.',
    pageTranslating: (cur, tot) => `Translating... ${cur}/${tot}`,
    pageCancel: 'Cancel',
    pageDone: (done, tot) => `Page translation complete (${done}/${tot} sections)`,
    pageRestoreReadingOnly: 'Page restore is only available in Reading View.',
    pageNoTranslated: 'No translated text found.',
    pageRestored: (n) => `Restored original text (${n} sections)`,
    // Plugin actions
    pageDisabled: 'Page translation is disabled.',
    pluginToggle: (on) => `Mouse Tooltip Translator: ${on ? 'ON' : 'OFF'}`,
    // Ribbon / commands
    ribbonVocab: 'Open vocabulary list',
    ribbonPage: 'Translate page / Restore',
    // Settings headings
    settingsTitle: 'Mouse Tooltip Translator',
    secFeatures: 'Features',
    secDesktop: 'Desktop',
    secMobile: 'Mobile',
    secTranslation: 'Translation',
    secEngines: 'Engine Settings',
    secPerFeature: '🎯Per-feature Settings',
    secHoverSelection: 'Hover / Text Selection',
    secPage: 'Page Translation',
    secTooltip: 'Tooltip Contents',
    // Master toggle
    masterEnabled: 'Enabled',
    masterEnabledDesc: 'Master switch for the translator.',
    masterRestrict: 'Restrict to note content',
    masterRestrictDesc: 'Only react inside the note body (editor, preview, embeds). Turn off to translate anywhere in the Obsidian UI — sidebars, headings, settings, etc.',
    // Feature toggles
    featHover: 'Hover translation',
    featHoverDesc: 'Show a translation tooltip when hovering over text.',
    featSelection: 'Text selection translation',
    featSelectionDesc: 'Show a translation tooltip when text is selected.',
    featPage: 'Page translation',
    featPageDesc: 'Enable full-page translation via the ribbon button or command.',
    featHoverMobile: 'Tap translation',
    featHoverMobileDesc: 'Show a translation tooltip when tapping on a word.',
    featSelectionMobile: 'Selection translation',
    featSelectionMobileDesc: 'Show a translation tooltip when text is selected after a touch.',
    featPageMobile: 'Page translation',
    featPageMobileDesc: 'Enable full-page translation via the ribbon button or command.',
    // Translation settings
    translateFrom: 'Translate from',
    translateTo: 'Translate to',
    skipSame: 'Skip same-language translations',
    skipSameDesc: "Hide the tooltip when the detected source language matches the target language (e.g. Japanese → Japanese).",
    skipIdentical: 'Skip identical translations',
    skipIdenticalDesc: 'Also hide the tooltip when the translated text is identical to the source text. Useful for short tokens, proper nouns, or code.',
    // Engine settings
    engineHover: 'Hover translation engine',
    engineHoverDesc: 'Engine to use when hovering.',
    engineSelection: 'Text translation engine',
    engineSelectionDesc: 'Engine to use for text selection.',
    enginePage: 'Page translation engine',
    enginePageDesc: 'Engine to use for full-page translation.',
    // LLM subsections
    llmOpenai: 'OpenAI-compatible API',
    llmOllama: 'Ollama',
    llmLmstudio: 'LM Studio',
    llmApiUrl: 'API URL',
    llmApiUrlDescOpenai: 'Base URL (e.g. https://api.openai.com)',
    llmApiUrlDescOllama: 'Ollama base URL (default: http://localhost:11434)',
    llmApiUrlDescLmstudio: 'LM Studio base URL (default: http://localhost:1234)',
    llmApiKey: 'API Key',
    llmModel: 'Model',
    llmModelDescOpenai: 'e.g. gpt-4o-mini, gpt-4o',
    llmModelDescOllama: 'e.g. llama3, mistral, gemma3',
    llmModelDescLmstudio: 'e.g. llama-3.2-3b-instruct',
    llmTemp: 'Temperature',
    llmTempDesc: 'Generation randomness. 0 = deterministic, 2 = maximum. Default: 0.0',
    llmPrompt: 'Prompt template',
    llmPromptDesc: 'Leave blank to use the default prompt. {{text}} is replaced with the source text, {{targetLang}} with the target language name.',
    // Per-feature settings
    activeMode: 'Active mode',
    activeModeDesc: 'Select which Obsidian view mode to enable tooltip translation in.',
    modeBoth: 'Edit + Reading',
    modeEdit: 'Edit only',
    modeReading: 'Reading only',
    mouseUnit: 'Mouseover unit',
    mouseUnitDesc: 'Word picks one word under the cursor. Sentence expands to sentence boundary.',
    hoverDelay: 'Hover delay (ms)',
    hoverDelayDesc: 'Wait time before the tooltip is requested.',
    pageHoverOrig: 'Show original paragraph on hover during page translation',
    pageHoverOrigDesc: 'While page translation is active, disable normal hover/selection translation and show the pre-translation text of the hovered paragraph instead.',
    // Engine dropdown labels (for LLM engines)
    engOpenaiCompat: 'OpenAI Compatible API',
    engOllama: 'Ollama (local)',
    engLmstudio: 'LM Studio (local)',
    // Errors
    llmModelRequired: 'Model name is required. Please enter it in the plugin settings.',
    // Tooltip contents
    showDict: 'Show dictionary (POS) for single words',
    showDictDesc: 'When Google returns a bilingual dictionary, show "noun: ..." / "verb: ..." lines instead of the plain translation. Other engines do not return POS info.',
    unitWord: 'Word',
    unitSentence: 'Sentence',
    showTranslit: 'Show transliteration (romanization)',
    showTranslitDesc: 'Display the romanized reading of the source word (Google / Bing only).',
    showSource: 'Show source text',
    showDetected: 'Show detected language',
  },
  ja: {
    origLabel: '原文:',
    noTranslation: '(翻訳なし)',
    vocabTitle: '単語帳',
    vocabReload: '再読み込み',
    sortByCount: '閲覧数順',
    sortByRecent: '最近見た順',
    sortAlpha: 'アルファベット順',
    filterAll: 'すべて',
    filterWord: '単語',
    filterSentence: '文',
    vocabEmpty: '翻訳履歴がありません',
    pageAlreadyRunning: 'ページ翻訳は既に実行中です。',
    pageNeedReadingView: 'ページ翻訳には閲覧モード（Reading View）に切り替えてください。',
    pageNoText: '翻訳するテキストが見つかりませんでした。',
    pageTranslating: (cur, tot) => `ページ翻訳中... ${cur}/${tot}`,
    pageCancel: 'キャンセル',
    pageDone: (done, tot) => `ページ翻訳完了 (${done}/${tot} セクション)`,
    pageRestoreReadingOnly: '閲覧モードでのみ復元できます。',
    pageNoTranslated: '翻訳済みのテキストが見つかりませんでした。',
    pageRestored: (n) => `元のテキストに復元しました (${n} セクション)`,
    pageDisabled: 'ページ翻訳は無効になっています。',
    ribbonVocab: '単語帳を開く',
    ribbonPage: 'ページを翻訳 / 元に戻す',
    secFeatures: '機能の有効化/無効化',
    secDesktop: 'デスクトップ',
    secMobile: 'モバイル',
    secTranslation: '翻訳設定',
    secEngines: 'エンジン設定',
    secPerFeature: '🎯機能ごとの設定',
    secHoverSelection: 'ホバー翻訳 / テキスト選択翻訳',
    secPage: 'ページ翻訳',
    secTooltip: 'ツールチップ Contents',
    featHover: 'ホバー翻訳',
    featHoverDesc: 'マウスカーソルを合わせたときに翻訳ツールチップを表示します。',
    featSelection: 'テキスト選択翻訳',
    featSelectionDesc: 'テキストを選択したときに翻訳ツールチップを表示します。',
    featPage: 'ページ翻訳',
    featPageDesc: 'リボンボタンやコマンドからページ全体を翻訳する機能を有効にします。',
    featHoverMobile: 'タップ翻訳',
    featHoverMobileDesc: '単語をタップしたときに翻訳ツールチップを表示します。',
    featSelectionMobile: 'テキスト選択翻訳',
    featSelectionMobileDesc: 'タッチ後にテキストを選択したときに翻訳ツールチップを表示します。',
    featPageMobile: 'ページ翻訳',
    featPageMobileDesc: 'リボンボタンやコマンドからページ全体を翻訳する機能を有効にします。',
    skipSameDesc: '翻訳先と同じ言語が検出された場合にツールチップを非表示にします。',
    skipIdenticalDesc: '翻訳結果が原文と同一の場合もツールチップを非表示にします。短いトークン、固有名詞、コードなどに有効です。',
    engineHover: 'ホバー翻訳エンジン',
    engineHoverDesc: 'マウスカーソルを合わせたときに使うエンジン',
    engineSelection: 'テキスト翻訳エンジン',
    engineSelectionDesc: 'テキストを選択したときに使うエンジン',
    enginePage: 'ページ翻訳エンジン',
    enginePageDesc: 'ページ全体を翻訳するときに使うエンジン',
    llmOpenai: 'OpenAI互換API設定',
    llmOllama: 'Ollama設定',
    llmLmstudio: 'LM Studio設定',
    llmApiUrlDescOpenai: 'ベースURL（例: https://api.openai.com）',
    llmApiUrlDescOllama: 'OllamaのベースURL（デフォルト: http://localhost:11434）',
    llmApiUrlDescLmstudio: 'LM StudioのベースURL（デフォルト: http://localhost:1234）',
    llmModelDescOpenai: '例: gpt-4o-mini, gpt-4o',
    llmModelDescOllama: '例: llama3, mistral, gemma3',
    llmModelDescLmstudio: '例: llama-3.2-3b-instruct',
    llmTempDesc: '生成のランダム性。0 = 決定論的、2 = 最大ランダム。既定値: 0.0',
    llmPrompt: 'プロンプトテンプレート',
    llmPromptDesc: '空欄の場合はデフォルトのプロンプトを使用。{{text}} に原文、{{targetLang}} に翻訳先言語名が挿入されます。',
    activeMode: '適用するモード',
    activeModeDesc: 'ツールチップ翻訳を有効にするObsidianのビューモードを選択します。',
    modeBoth: '編集モード + リーディングモード',
    modeEdit: '編集モードのみ',
    modeReading: 'リーディングモードのみ',
    pageHoverOrig: '翻訳表示中は段落原文をホバー表示',
    pageHoverOrigDesc: 'ページ翻訳の結果を表示しているとき、通常のホバー翻訳・テキスト選択翻訳を無効にし、ホバーした段落の翻訳前テキストをツールチップに表示します。',
    engOpenaiCompat: 'OpenAI互換API',
    engOllama: 'Ollama (ローカル)',
    engLmstudio: 'LM Studio (ローカル)',
    llmModelRequired: 'モデル名が未設定です。設定から入力してください。',
    masterEnabled: '有効',
    masterEnabledDesc: '翻訳機能のマスタースイッチ。',
    masterRestrict: 'ノートコンテンツ内に制限',
    masterRestrictDesc: 'ノート本文（エディター・プレビュー・埋め込み）内でのみ反応します。オフにすると、サイドバーや見出し、設定など Obsidian UI 全体で翻訳します。',
    translateFrom: '翻訳元言語',
    translateTo: '翻訳先言語',
    skipSame: '同一言語の翻訳をスキップ',
    skipSameDesc: '翻訳先と同じ言語が検出された場合にツールチップを非表示にします（例: 日本語 → 日本語）。',
    skipIdentical: '同一テキストの翻訳をスキップ',
    skipIdenticalDesc: '翻訳結果が原文と同一の場合もツールチップを非表示にします。短いトークン、固有名詞、コードなどに有効です。',
    unitWord: '単語',
    unitSentence: '文',
    mouseUnit: 'ホバー単位',
    mouseUnitDesc: '「単語」はカーソル直下の1語を取得します。「文」は文境界まで展開します。',
    hoverDelay: 'ホバー遅延 (ms)',
    hoverDelayDesc: 'ツールチップを表示するまでの待機時間。',
    secTooltip: 'ツールチップの内容',
    showDict: '単語の品詞（辞書）情報を表示',
    showDictDesc: 'Google が二言語辞書を返した場合、単純な翻訳の代わりに「名詞: ...」/「動詞: ...」形式で表示します。他のエンジンは品詞情報を返しません。',
    showTranslit: '転写（ローマ字読み）を表示',
    showTranslitDesc: '原語のローマ字読みを表示します（Google・Bing のみ）。',
    showSource: '原文を表示',
    showDetected: '検出言語を表示',
  },
};

// Returns the merged strings for the current Obsidian locale (falls back to English).
function i18n() {
  const loc = (typeof window !== 'undefined' && window.moment?.locale?.()) || 'en';
  const lang = /^ja/.test(loc) ? 'ja' : 'en';
  return lang === 'ja' ? { ...STRINGS.en, ...STRINGS.ja } : STRINGS.en;
}

// Selector for nodes that count as "note content".
// .cm-content       : CodeMirror 6 editor content (source / live preview)
// .markdown-preview-view : reading mode container
// .markdown-rendered     : rendered markdown anywhere (embeds, hover preview, etc.)
const NOTE_CONTENT_SELECTOR = '.cm-content, .markdown-preview-view, .markdown-rendered';

function isInNoteContent(node, selector) {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return false;
  return !!el.closest(selector || NOTE_CONTENT_SELECTOR);
}

// Extracts the pre-translation text stored in data-mtt-orig (which is raw innerHTML).
function getOriginalText(el) {
  const orig = el.getAttribute('data-mtt-orig');
  if (!orig) return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = orig;
  return tmp.textContent.trim() || null;
}

// A "no-op translation" is one we don't want to display. Each check is gated
// by its own user setting so the behavior can be tuned:
//   - skipSameLanguage : detected source language equals target language.
//   - skipIdenticalText: translated text is identical to the source text
//                        (catches mis-detected language codes for proper nouns,
//                         codes, single tokens that the API echoed back, etc.).
function isNoopTranslation(result, text, opts) {
  if (!result || !result.targetText) return false;
  const { skipSameLanguage = true, skipIdenticalText = false } = opts || {};
  if (skipSameLanguage
      && result.sourceLang && result.targetLang
      && result.sourceLang === result.targetLang) return true;
  if (skipIdenticalText && result.targetText.trim() === (text || '').trim()) return true;
  return false;
}

const COMMON_LANGS = {
  auto: 'Auto detect',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  uk: 'Ukrainian',
};

// ---- HTTP helpers wrapping Obsidian's requestUrl (bypasses CORS) ----
function buildUrl(base, searchParams) {
  if (!searchParams) return base;
  const u = new URL(base);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function http(method, url, { headers, body, searchParams } = {}) {
  const finalUrl = buildUrl(url, searchParams);
  let bodyStr;
  if (body instanceof URLSearchParams) bodyStr = body.toString();
  else if (body !== undefined && typeof body !== 'string') bodyStr = JSON.stringify(body);
  else bodyStr = body;
  const res = await requestUrl({
    url: finalUrl,
    method,
    headers: headers || undefined,
    body: bodyStr,
    throw: false,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
  return res;
}
async function httpGetText(url, opts) { return (await http('GET', url, opts)).text; }
async function httpJson(method, url, opts) {
  const res = await http(method, url, opts);
  try { return res.json; } catch { return JSON.parse(res.text); }
}

// ---- Base translator (mirrors module 2760 of Chrome ext) ----
class BaseTranslator {
  static langCodeJson = {};
  static encodeLang(c) {
    return Object.prototype.hasOwnProperty.call(this.langCodeJson, c) ? this.langCodeJson[c] : c;
  }
  static decodeLang(c) {
    if (!this._swap) {
      this._swap = Object.fromEntries(
        Object.entries(this.langCodeJson).map(([k, v]) => [v, k])
      );
    }
    return Object.prototype.hasOwnProperty.call(this._swap, c) ? this._swap[c] : c;
  }
  static async translate(text, src, tgt, settings) {
    try {
      const esrc = this.encodeLang(src || 'auto');
      const etgt = this.encodeLang(tgt);
      const raw = await this.requestTranslate(text, esrc, etgt, settings);
      const wrapped = await this.wrapResponse(raw, text, esrc, etgt);
      if (!wrapped || wrapped.targetText == null) return null;
      return {
        targetText: wrapped.targetText,
        sourceLang: this.decodeLang(wrapped.detectedLang || esrc),
        targetLang: this.decodeLang(etgt),
        transliteration: wrapped.transliteration || '',
        dict: Array.isArray(wrapped.dict) && wrapped.dict.length ? wrapped.dict : null,
      };
    } catch (e) {
      console.warn('[mtt]', this.name || 'translator', 'failed:', e);
      return null;
    }
  }
  static async requestTranslate() { throw new Error('not implemented'); }
  static async wrapResponse() { throw new Error('not implemented'); }
}

// ---- Google (translate_a/single) ----
// dj=1: JSON object form.  dt=bd: bilingual dictionary (POS).  dt=rm: transliteration.
class GoogleEngine extends BaseTranslator {
  static langCodeJson = { auto: 'auto' };
  static async requestTranslate(text, src, tgt) {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: src || 'auto',
      tl: tgt,
      dj: '1',
      hl: tgt,
      q: text,
    });
    params.append('dt', 't');
    params.append('dt', 'bd');
    params.append('dt', 'rm');
    return await httpJson('GET', `https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  }
  static async wrapResponse(data, text, src) {
    if (!data || typeof data !== 'object') return null;
    const sentences = Array.isArray(data.sentences) ? data.sentences : [];
    let targetText = sentences.map((s) => (s && s.trans) || '').filter(Boolean).join(' ');
    if (targetText) targetText = targetText.replace(/\n /g, '\n');
    let transliteration = sentences.map((s) => (s && s.src_translit) || '').filter(Boolean).join(' ').trim();
    if (transliteration) transliteration = transliteration.replace(/\n /g, '\n');
    if (!targetText) return null;
    const dict = Array.isArray(data.dict)
      ? data.dict
          .filter((d) => d && Array.isArray(d.terms) && d.terms.length > 0)
          .map((d) => ({ pos: d.pos || '', terms: d.terms.slice(0, 3) }))
      : null;
    return { targetText, detectedLang: data.src || src, transliteration, dict };
  }
}

// ---- Google GTX (translate_a/t) ----
class GoogleGTXEngine extends BaseTranslator {
  static langCodeJson = { auto: 'auto' };
  static async requestTranslate(text, src, tgt) {
    return await httpJson('GET', 'https://translate.googleapis.com/translate_a/t', {
      searchParams: { client: 'dict-chrome-ex', sl: src || 'auto', tl: tgt, q: text },
    });
  }
  static async wrapResponse(data, text, src) {
    if (!Array.isArray(data)) return null;
    const first = Array.isArray(data[0]) ? data[0] : data;
    const targetText = Array.isArray(first) ? (first[0] || '') : String(first);
    const detected = Array.isArray(first) ? (first[1] || src) : src;
    return { targetText, detectedLang: detected };
  }
}

// ---- DeepL (free web jsonrpc) ----
class DeepLEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto', ar: 'AR', bg: 'BG', cs: 'CS', da: 'DA', de: 'DE', el: 'EL',
    en: 'EN', es: 'ES', et: 'ET', fi: 'FI', fr: 'FR', hu: 'HU', id: 'ID',
    it: 'IT', ja: 'JA', ko: 'KO', lt: 'LT', lv: 'LV', no: 'NB', nl: 'NL',
    pl: 'PL', pt: 'PT', ro: 'RO', ru: 'RU', sk: 'SK', sl: 'SL', sv: 'SV',
    tr: 'TR', uk: 'UK', 'zh-CN': 'ZH',
  };
  static async requestTranslate(text, src, tgt) {
    const id = (Math.floor(Math.random() * 99999) + 100000) * 1000;
    const iCount = text.split('i').length - 1;
    const now = Date.now();
    const stamp = iCount !== 0 ? (now - (now % (iCount + 1))) + (iCount + 1) : now;
    const payload = {
      jsonrpc: '2.0',
      method: 'LMT_handle_texts',
      id,
      params: {
        splitting: 'newlines',
        lang: { source_lang_user_selected: src, target_lang: tgt },
        texts: [{ text, requestAlternatives: 3 }],
        timestamp: stamp,
      },
    };
    let body = JSON.stringify(payload);
    body = ((id + 5) % 29 === 0 || (id + 3) % 13 === 0)
      ? body.replace('"method":"', '"method" : "')
      : body.replace('"method":"', '"method": "');
    return await httpJson('POST', 'https://www2.deepl.com/jsonrpc', {
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }
  static async wrapResponse(resp) {
    if (resp && resp.result) {
      return { targetText: resp.result.texts[0].text, detectedLang: resp.result.lang };
    }
    return null;
  }
}

// ---- Bing (ttranslatev3) ----
class BingEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto-detect', ar: 'ar', bg: 'bg', bn: 'bn', cs: 'cs', da: 'da',
    de: 'de', el: 'el', en: 'en', es: 'es', et: 'et', fa: 'fa', fi: 'fi',
    fr: 'fr', he: 'he', iw: 'he', hi: 'hi', hu: 'hu', id: 'id', it: 'it',
    ja: 'ja', kk: 'kk', ko: 'ko', lt: 'lt', lv: 'lv', ms: 'ms', nl: 'nl',
    no: 'nb', pl: 'pl', pt: 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt-pt',
    ro: 'ro', ru: 'ru', sk: 'sk', sl: 'sl', sv: 'sv', th: 'th', tr: 'tr',
    uk: 'uk', ur: 'ur', vi: 'vi', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant',
  };
  static tokenUrl = 'https://www.bing.com/translator';
  static baseUrl = 'https://www.bing.com/ttranslatev3';
  static accessToken = null;

  static async getAccessToken() {
    if (this.accessToken && Date.now() - this.accessToken.tokenTs < this.accessToken.expiryInterval) {
      return this.accessToken;
    }
    const html = await httpGetText(this.tokenUrl);
    const IG = (html.match(/IG:"([^"]+)"/) || [])[1];
    const IID = (html.match(/data-iid="([^"]+)"/) || [])[1];
    const m = html.match(/params_AbusePreventionHelper\s?=\s?(\[[^\]]+\])/);
    if (!IG || !m) throw new Error('Bing token parse failed');
    // params_AbusePreventionHelper = [key, token, expiryInterval]
    const [key, token, expiryInterval] = JSON.parse(m[1]);
    this.accessToken = { IG, IID, key, token, tokenTs: Date.now(), expiryInterval, count: 0 };
    return this.accessToken;
  }

  static async requestTranslate(text, src, tgt) {
    const tk = await this.getAccessToken();
    const body = new URLSearchParams({ text, fromLang: src, to: tgt, token: tk.token, key: String(tk.key) });
    return await httpJson('POST', this.baseUrl, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: this.tokenUrl,
      },
      searchParams: {
        IG: tk.IG,
        IID: tk.IID ? `${tk.IID}.${tk.count++}` : '',
        isVertical: '1',
      },
      body,
    });
  }

  static async wrapResponse(resp) {
    if (Array.isArray(resp) && resp[0] && resp[0].translations) {
      const t = resp[0];
      const transliteration = resp[1] ? (resp[1].inputTransliteration || '') : '';
      return {
        targetText: t.translations[0].text,
        detectedLang: t.detectedLanguage && t.detectedLanguage.language,
        transliteration,
      };
    }
    return null;
  }
}

// ---- Yandex ----
class YandexEngine extends BaseTranslator {
  static langCodeJson = {
    af: 'af', sq: 'sq', am: 'am', ar: 'ar', hy: 'hy', az: 'az', eu: 'eu',
    be: 'be', bn: 'bn', bs: 'bs', bg: 'bg', ca: 'ca', hr: 'hr', cs: 'cs',
    da: 'da', nl: 'nl', en: 'en', eo: 'eo', et: 'et', fi: 'fi', fr: 'fr',
    gl: 'gl', ka: 'ka', de: 'de', el: 'el', gu: 'gu', ht: 'ht', hi: 'hi',
    hu: 'hu', is: 'is', id: 'id', ga: 'ga', it: 'it', ja: 'ja', kn: 'kn',
    kk: 'kk', km: 'km', ko: 'ko', ky: 'ky', lo: 'lo', la: 'la', lv: 'lv',
    lt: 'lt', lb: 'lb', mk: 'mk', mg: 'mg', ms: 'ms', ml: 'ml', mt: 'mt',
    mi: 'mi', mr: 'mr', mn: 'mn', my: 'my', ne: 'ne', no: 'no', fa: 'fa',
    pl: 'pl', pt: 'pt', pa: 'pa', ro: 'ro', ru: 'ru', gd: 'gd', sr: 'sr',
    si: 'si', sk: 'sk', sl: 'sl', es: 'es', su: 'su', sw: 'sw', sv: 'sv',
    tg: 'tg', ta: 'ta', te: 'te', th: 'th', tr: 'tr', uk: 'uk', ur: 'ur',
    uz: 'uz', vi: 'vi', cy: 'cy', xh: 'xh', yi: 'yi', tl: 'tl', iw: 'he',
    jw: 'jv', 'zh-CN': 'zh',
  };
  static async requestTranslate(text, src, tgt) {
    const uuid = (nodeCrypto.randomUUID ? nodeCrypto.randomUUID() : require('crypto').randomBytes(16).toString('hex'))
      .replaceAll('-', '');
    const lang = src === 'auto' ? tgt : `${src}-${tgt}`;
    return await httpJson('POST', 'https://translate.yandex.net/api/v1/tr.json/translate', {
      searchParams: { id: `${uuid}-0-0`, srv: 'android' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ lang, text }),
    });
  }
  static async wrapResponse(resp) {
    if (resp && String(resp.code) === '200') {
      return { targetText: resp.text[0], detectedLang: resp.lang.split('-')[0] };
    }
    return null;
  }
}

// ---- Papago (HMAC-MD5 signed) ----
class PapagoEngine extends BaseTranslator {
  static langCodeJson = {
    ar: 'ar', en: 'en', fa: 'fa', fr: 'fr', de: 'de', hi: 'hi', id: 'id',
    it: 'it', ja: 'ja', ko: 'ko', my: 'mm', pt: 'pt', ru: 'ru', es: 'es',
    th: 'th', vi: 'vi', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
  };
  static version = '';
  static endpoint = 'https://papago.naver.com/apis/n2mt/translate';
  static detectEndpoint = 'https://papago.naver.com/apis/langs/dect';

  static async getVersion() {
    if (this.version) return this.version;
    const home = await httpGetText('https://papago.naver.com/');
    const main = (home.match(/"\/main\.([^"]+)"/) || [])[1];
    if (!main) throw new Error('Papago main file lookup failed');
    const js = await httpGetText(`https://papago.naver.com/main.${main}`);
    const v = (js.match(/"v1\.([^"]+)"/) || [])[1];
    if (!v) throw new Error('Papago version lookup failed');
    this.version = `v1.${v}`;
    return this.version;
  }

  static async getToken(url) {
    const version = await this.getVersion();
    const uuid = nodeCrypto.randomUUID
      ? nodeCrypto.randomUUID()
      : require('crypto').randomBytes(16).toString('hex');
    const time = Date.now();
    const hash = nodeCrypto.createHmac('md5', version)
      .update(`${uuid}\n${url}\n${time}`)
      .digest('base64');
    return { uuid, time, hash };
  }

  static authHeaders(uuid, time, hash) {
    return {
      Authorization: `PPG ${uuid}:${hash}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Timestamp: String(time),
    };
  }

  static async requestTranslate(text, src, tgt) {
    if (src === 'auto') {
      const t = await this.getToken(this.detectEndpoint);
      const dect = await httpJson('POST', this.detectEndpoint, {
        searchParams: { query: text },
        headers: this.authHeaders(t.uuid, t.time, t.hash),
      });
      src = dect && dect.langCode ? dect.langCode : 'en';
    }
    const t = await this.getToken(this.endpoint);
    return await httpJson('POST', this.endpoint, {
      searchParams: {
        deviceId: t.uuid, locale: 'ko', dict: 'true', dictDisplay: '30',
        honorific: 'false', instant: 'false', paging: 'false',
        source: src, target: tgt, text,
      },
      headers: this.authHeaders(t.uuid, t.time, t.hash),
    });
  }
  static async wrapResponse(resp) {
    if (resp && resp.translatedText != null) {
      return { targetText: resp.translatedText, detectedLang: resp.srcLangType };
    }
    return null;
  }
}

// ---- LLM engines (OpenAI-compatible chat completions) ----
class LLMEngine extends BaseTranslator {
  static langCodeJson = {};

  static _buildPrompt(text, tgt, template) {
    const tgtName = COMMON_LANGS[tgt] || tgt;
    if (template && template.trim()) {
      return template.replace(/\{\{text\}\}/g, text).replace(/\{\{targetLang\}\}/g, tgtName);
    }
    return `Translate the following text to ${tgtName}. Output only the translated text, nothing else.\n\n${text}`;
  }

  static async _chatRequest(text, etgt, { url, model, apiKey, prompt, temperature }) {
    if (!model) throw new Error(i18n().llmModelRequired);
    const endpoint = `${(url || '').replace(/\/+$/, '')}/v1/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return http('POST', endpoint, {
      headers,
      body: {
        model,
        messages: [{ role: 'user', content: this._buildPrompt(text, etgt, prompt) }],
        temperature: temperature ?? 0,
      },
    });
  }

  static async requestTranslate() { throw new Error('not implemented'); }

  static async wrapResponse(raw) {
    const content = raw?.json?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { targetText: content };
  }
}

class OpenAICompatEngine extends LLMEngine {
  static async requestTranslate(text, _esrc, etgt, settings) {
    return this._chatRequest(text, etgt, {
      url: settings?.openaiCompatApiUrl || 'https://api.openai.com',
      model: settings?.openaiCompatModel || 'gpt-4o-mini',
      apiKey: settings?.openaiCompatApiKey || '',
      prompt: settings?.openaiCompatPrompt || '',
      temperature: settings?.openaiCompatTemperature ?? 0,
    });
  }
}

class OllamaEngine extends LLMEngine {
  static async requestTranslate(text, _esrc, etgt, settings) {
    return this._chatRequest(text, etgt, {
      url: settings?.ollamaApiUrl || 'http://localhost:11434',
      model: settings?.ollamaModel || '',
      apiKey: '',
      prompt: settings?.ollamaPrompt || '',
      temperature: settings?.ollamaTemperature ?? 0,
    });
  }
}

class LMStudioEngine extends LLMEngine {
  static async requestTranslate(text, _esrc, etgt, settings) {
    return this._chatRequest(text, etgt, {
      url: settings?.lmstudioApiUrl || 'http://localhost:1234',
      model: settings?.lmstudioModel || '',
      apiKey: 'lm-studio',
      prompt: settings?.lmstudioPrompt || '',
      temperature: settings?.lmstudioTemperature ?? 0,
    });
  }
}

const ENGINE_CLASSES = {
  google: GoogleEngine,
  googleGTX: GoogleGTXEngine,
  deepl: DeepLEngine,
  bing: BingEngine,
  yandex: YandexEngine,
  papago: PapagoEngine,
  openaiCompat: OpenAICompatEngine,
  ollama: OllamaEngine,
  lmstudio: LMStudioEngine,
};

const ENGINE_LABELS = {
  google: 'Google',
  googleGTX: 'Google (translate_a/t)',
  deepl: 'DeepL (web, experimental)',
  bing: 'Bing (experimental)',
  yandex: 'Yandex (experimental)',
  papago: 'Papago (experimental)',
  openaiCompat: 'OpenAI Compatible API',
  ollama: 'Ollama (local)',
  lmstudio: 'LM Studio (local)',
};

const LLM_ENGINE_KEYS = new Set(['openaiCompat', 'ollama', 'lmstudio']);

const ENGINES = Object.fromEntries(
  Object.entries(ENGINE_CLASSES).map(([k, C]) => [
    k,
    {
      label: ENGINE_LABELS[k] || k,
      translate: (text, src, tgt, settings) => C.translate(text, src, tgt, settings),
    },
  ])
);

function isWordChar(c) {
  return !!c && /[\p{L}\p{N}'\-_]/u.test(c);
}

function isSentenceBoundary(c) {
  return /[.!?。！？\n\r]/.test(c);
}

function caretRange(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (!p) return null;
    const r = document.createRange();
    r.setStart(p.offsetNode, p.offset);
    r.setEnd(p.offsetNode, p.offset);
    return r;
  }
  return null;
}

function extractAtPoint(x, y, mode) {
  const range = caretRange(x, y);
  if (!range) return null;
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent;
  if (!text) return null;
  const off = range.startOffset;

  let start = off, end = off;
  if (mode === 'sentence') {
    while (start > 0 && !isSentenceBoundary(text[start - 1])) start--;
    while (end < text.length && !isSentenceBoundary(text[end])) end++;
  } else {
    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
  }
  const slice = text.slice(start, end).trim();
  if (!slice) return null;

  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  const rect = wordRange.getBoundingClientRect();
  // make sure the cursor is actually inside the rect (caretRangeFromPoint can snap)
  if (x < rect.left - 4 || x > rect.right + 4 || y < rect.top - 4 || y > rect.bottom + 4) return null;
  return { text: slice, rect };
}

// Persists translation history to translation-log.json in the plugin folder.
// Each entry records the source/target text, languages, and view count.
// Writes are debounced to 2 s to avoid hammering the filesystem on every hover.
class TranslationLog {
  constructor(app, pluginDir) {
    this.app = app;
    this.filePath = `${pluginDir}/translation-log.json`;
    this.entries = {};
    this.saveTimer = null;
  }

  async load() {
    try {
      if (await this.app.vault.adapter.exists(this.filePath)) {
        const raw = await this.app.vault.adapter.read(this.filePath);
        const data = JSON.parse(raw);
        if (data && typeof data.entries === 'object') this.entries = data.entries;
      }
    } catch (e) {
      console.warn('[mtt] translation-log load failed:', e);
      this.entries = {};
    }
  }

  record(key, result, sourceText) {
    const now = Date.now();
    const hasDict = Array.isArray(result.dict) && result.dict.length > 0;
    if (this.entries[key]) {
      this.entries[key].count++;
      this.entries[key].lastSeen = now;
      // Backfill pos/type if the first hit lacked dict data but this one has it.
      if (hasDict && this.entries[key].pos.length === 0) {
        this.entries[key].pos = result.dict;
        this.entries[key].type = 'word';
      }
    } else {
      this.entries[key] = {
        sourceText,
        targetText: result.targetText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        pos: hasDict ? result.dict : [],
        type: hasDict ? 'word' : 'sentence',
        count: 1,
        firstSeen: now,
        lastSeen: now,
      };
    }
    this._scheduleSave();
  }

  _scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this._flush(), 2000);
  }

  async _flush() {
    this.saveTimer = null;
    try {
      await this.app.vault.adapter.write(
        this.filePath,
        JSON.stringify({ version: 1, entries: this.entries }, null, 2)
      );
    } catch (e) {
      console.warn('[mtt] translation-log save failed:', e);
    }
  }

  async destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      await this._flush();
    }
  }
}

class TooltipManager {
  constructor(plugin, log) {
    this.plugin = plugin;
    this.log = log;
    this.el = null;
    this.token = 0;
    this.lastText = '';
    this.cache = new Map();
    this.maxCache = 1000;
  }
  ensure() {
    if (this.el) return this.el;
    const el = document.createElement('div');
    el.className = 'mtt-tooltip';
    el.style.display = 'none';
    document.body.appendChild(el);
    this.el = el;
    return el;
  }
  hide() {
    this.lastText = '';
    this.token++;
    if (this.el) this.el.style.display = 'none';
  }
  // Show plain text (no translation API call) — used when hovering over a
  // page-translated paragraph to display the pre-translation original.
  showPlain(text, rect) {
    if (!text) { this.hide(); return; }
    if (text === this.lastText && this.el && this.el.style.display !== 'none') {
      this.position(rect);
      return;
    }
    this.lastText = text;
    this.token++;
    const el = this.ensure();
    el.empty ? el.empty() : (el.textContent = '');
    const label = document.createElement('div');
    label.className = 'mtt-orig-label';
    label.textContent = i18n().origLabel;
    el.appendChild(label);
    const sep = document.createElement('div');
    sep.className = 'mtt-orig-sep';
    el.appendChild(sep);
    const main = document.createElement('div');
    main.className = 'mtt-target mtt-orig-preview';
    main.textContent = text;
    el.appendChild(main);
    el.style.display = 'block';
    this.position(rect);
  }
  isOwn(target) {
    return !!(this.el && target instanceof Node && this.el.contains(target));
  }
  cacheGet(key) { return this.cache.get(key); }
  cacheSet(key, val, sourceText) {
    if (this.cache.size >= this.maxCache) {
      const k = this.cache.keys().next().value;
      this.cache.delete(k);
    }
    this.cache.set(key, val);
    if (this.log) this.log.record(key, val, sourceText);
    if (this.plugin) {
      this.plugin.app.workspace.getLeavesOfType(VOCAB_VIEW_TYPE)
        .forEach(l => { if (l.view && l.view.refresh) l.view.refresh(); });
    }
  }
  async show(text, rect, engineKey) {
    if (!text) return;
    const { sourceLang, targetLang } = this.plugin.settings;
    const engine = engineKey || 'google';
    if (text === this.lastText && this.el && this.el.style.display !== 'none') {
      this.position(rect);
      return;
    }

    // Short-circuit when source/target are explicitly the same — no API call needed.
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      this.hide();
      return;
    }

    const key = `v2|${engine}|${sourceLang}|${targetLang}|${text}`;
    const cached = this.plugin.settings.disableCache ? null : this.cacheGet(key);
    // Sync no-op check on cache hit — avoids flashing the "…" loading state.
    if (cached && isNoopTranslation(cached, text, this.plugin.settings)) {
      this.hide();
      return;
    }

    this.lastText = text;
    const my = ++this.token;

    const el = this.ensure();
    el.style.display = 'none';
    this.position(rect);

    let result = cached;
    if (!result) {
      try {
        const eng = ENGINES[engine] || ENGINES.google;
        result = await eng.translate(text, sourceLang, targetLang, this.plugin.settings);
      } catch (e) {
        if (my === this.token) {
          el.textContent = `⚠ ${e.message || e}`;
          el.style.display = 'block';
          this.position(rect);
        }
        return;
      }
      if (result && result.targetText) this.cacheSet(key, result, text);
    }
    if (my !== this.token) return;
    if (!result || !result.targetText) {
      el.textContent = i18n().noTranslation;
      el.style.display = 'block';
      this.position(rect);
      return;
    }
    if (isNoopTranslation(result, text, this.plugin.settings)) {
      this.hide();
      return;
    }
    el.empty ? el.empty() : (el.textContent = '');

    const showDict = this.plugin.settings.showDictionary
      && Array.isArray(result.dict) && result.dict.length > 0;

    if (showDict) {
      const dictWrap = document.createElement('div');
      dictWrap.className = 'mtt-dict';
      for (const { pos, terms } of result.dict) {
        const row = document.createElement('div');
        row.className = 'mtt-dict-row';
        if (pos) {
          const posEl = document.createElement('b');
          posEl.className = 'mtt-pos';
          posEl.textContent = pos;
          row.appendChild(posEl);
          row.appendChild(document.createTextNode(': '));
        }
        const termsEl = document.createElement('span');
        termsEl.className = 'mtt-terms';
        termsEl.textContent = (terms || []).join(', ');
        row.appendChild(termsEl);
        dictWrap.appendChild(row);
      }
      el.appendChild(dictWrap);
    } else {
      const main = document.createElement('div');
      main.className = 'mtt-target';
      main.textContent = result.targetText;
      el.appendChild(main);
    }

    if (this.plugin.settings.showTransliteration && result.transliteration) {
      const translit = document.createElement('div');
      translit.className = 'mtt-translit';
      translit.textContent = result.transliteration;
      el.appendChild(translit);
    }
    if (this.plugin.settings.showSourceText) {
      const src = document.createElement('div');
      src.className = 'mtt-source';
      src.textContent = text;
      el.appendChild(src);
    }
    if (this.plugin.settings.showDetectedLang && result.sourceLang) {
      const meta = document.createElement('div');
      meta.className = 'mtt-meta';
      meta.textContent = `${result.sourceLang} → ${result.targetLang}`;
      el.appendChild(meta);
    }
    el.style.display = 'block';
    this.position(rect);
  }
  position(rect) {
    if (!this.el || !rect) return;
    const pad = 8;
    const w = this.el.offsetWidth || 200;
    const h = this.el.offsetHeight || 30;
    let x = rect.left;
    let y;
    if (Platform.isMobile) {
      // Upper half → show above finger; lower half → show below finger
      if (rect.top < window.innerHeight / 2) {
        y = rect.top - h - pad;
      } else {
        y = rect.bottom + pad;
      }
    } else {
      y = rect.bottom + pad;
      if (y + h > window.innerHeight) y = rect.top - h - pad;
    }
    if (y < 0) y = pad;
    if (y + h > window.innerHeight) y = window.innerHeight - h - pad;
    if (x + w > window.innerWidth) x = window.innerWidth - w - pad;
    if (x < 0) x = pad;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
  async destroy() {
    this.hide();
    if (this.el) { this.el.remove(); this.el = null; }
    this.cache.clear();
    if (this.log) await this.log.destroy();
  }
}

const VOCAB_VIEW_TYPE = 'mtt-vocab-view';

class VocabView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this._sort = 'count-desc';
    this._filter = 'all';
    this._listEl = null;
  }

  getViewType() { return VOCAB_VIEW_TYPE; }
  getDisplayText() { return i18n().vocabTitle; }
  getIcon() { return 'book-open'; }

  async onOpen() { this.render(); }

  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass('mtt-vocab-root');

    const header = root.createEl('div', { cls: 'mtt-vocab-header' });
    const s = i18n();
    header.createEl('span', { cls: 'mtt-vocab-title', text: s.vocabTitle });
    const reload = header.createEl('button', { cls: 'mtt-vocab-reload', title: s.vocabReload });
    reload.textContent = '↻';
    reload.addEventListener('click', () => this.refresh());

    const controls = root.createEl('div', { cls: 'mtt-vocab-controls' });

    const sortSelect = controls.createEl('select', { cls: 'mtt-vocab-sort' });
    for (const [value, label] of [
      ['count-desc', s.sortByCount],
      ['last-desc', s.sortByRecent],
      ['alpha', s.sortAlpha],
    ]) {
      const opt = sortSelect.createEl('option', { text: label });
      opt.value = value;
      if (value === this._sort) opt.selected = true;
    }
    sortSelect.addEventListener('change', () => { this._sort = sortSelect.value; this.refresh(); });

    const filterWrap = controls.createEl('div', { cls: 'mtt-vocab-filter-wrap' });
    for (const [value, label] of [['all', s.filterAll], ['word', s.filterWord], ['sentence', s.filterSentence]]) {
      const btn = filterWrap.createEl('button', { cls: 'mtt-vocab-filter-btn', text: label });
      btn.dataset.filter = value;
      if (value === this._filter) btn.addClass('is-active');
      btn.addEventListener('click', () => {
        this._filter = value;
        filterWrap.querySelectorAll('.mtt-vocab-filter-btn').forEach(b =>
          b.classList.toggle('is-active', b.dataset.filter === value)
        );
        this.refresh();
      });
    }

    this._listEl = root.createEl('div', { cls: 'mtt-vocab-list' });
    this._renderList();
  }

  refresh() {
    if (this._listEl) this._renderList();
  }

  _renderList() {
    const container = this._listEl;
    container.empty();
    const entries = Object.values(this.plugin.log.entries);

    let filtered = entries;
    if (this._filter === 'word') filtered = entries.filter(e => e.type === 'word');
    else if (this._filter === 'sentence') filtered = entries.filter(e => e.type === 'sentence');

    const sorted = [...filtered];
    if (this._sort === 'count-desc') sorted.sort((a, b) => b.count - a.count);
    else if (this._sort === 'last-desc') sorted.sort((a, b) => b.lastSeen - a.lastSeen);
    else sorted.sort((a, b) => a.sourceText.localeCompare(b.sourceText));

    if (sorted.length === 0) {
      container.createEl('div', { cls: 'mtt-vocab-empty', text: i18n().vocabEmpty });
      return;
    }

    for (const entry of sorted) {
      const card = container.createEl('div', { cls: 'mtt-vocab-card' });
      const main = card.createEl('div', { cls: 'mtt-vocab-main' });
      main.createEl('span', { cls: 'mtt-vocab-source', text: entry.sourceText });
      main.createEl('span', { cls: 'mtt-vocab-sep', text: ' → ' });
      main.createEl('span', { cls: 'mtt-vocab-target', text: entry.targetText });
      main.createEl('span', { cls: 'mtt-vocab-count', text: `×${entry.count}` });

      if (Array.isArray(entry.pos) && entry.pos.length > 0) {
        const posWrap = card.createEl('div', { cls: 'mtt-vocab-pos-wrap' });
        for (const { pos, terms } of entry.pos) {
          const row = posWrap.createEl('span', { cls: 'mtt-vocab-pos-entry' });
          if (pos) row.createEl('span', { cls: 'mtt-vocab-pos-label', text: pos + ': ' });
          row.appendText((terms || []).join(' / '));
        }
      }
    }
  }
}

// ── Page Translator ───────────────────────────────────────────────────────────
class PageTranslator {
  constructor(plugin) {
    this.plugin = plugin;
    this._cancelled = false;
    this._running = false;
    this._progressEl = null;
  }

  _getViewContainer(view) {
    if (!view) return null;
    if (view.getMode?.() !== 'preview') return null;
    const previewEl = view.previewMode?.containerEl;
    if (!previewEl) return null;
    return previewEl.querySelector('.markdown-rendered') ?? previewEl;
  }

  // Returns the .markdown-rendered container for the active reading-view leaf,
  // or null when not in reading mode.
  _getContainer() {
    return this._getViewContainer(this.plugin.app.workspace.activeLeaf?.view);
  }

  // Reflects the current translation state on the header button of a given view.
  _syncButton(view) {
    const btn = view?.containerEl?.querySelector('.mtt-page-btn');
    if (!btn) return;
    const active = !!(this._getViewContainer(view)?.querySelector('[data-mtt-orig]'));
    btn.classList.toggle('is-active', active);
  }

  // Returns leaf-level translatable block elements (headings, paragraphs, list
  // items, table cells, etc.) that haven't been translated yet.
  _getBlocks(container) {
    const SEL = 'h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption';
    return Array.from(container.querySelectorAll(SEL)).filter(el => {
      // Skip content inside code/math/frontmatter
      if (el.closest('pre,.math,.math-block,.frontmatter-container,.katex')) return false;
      // Skip already translated
      if (el.hasAttribute('data-mtt-orig')) return false;
      // Only translate leaf-level elements — skip if nested blocks exist inside
      // (prevents double-translating a li > p hierarchy).
      if (el.querySelector('h1,h2,h3,h4,h5,h6,p,li,td,th')) return false;
      return el.textContent.trim().length >= 2;
    });
  }

  _showProgress(current, total) {
    if (!this._progressEl) {
      const el = document.createElement('div');
      el.className = 'mtt-page-progress';
      el.innerHTML = `<span class="mtt-page-progress-label"></span>` +
        `<div class="mtt-page-progress-bar-wrap"><div class="mtt-page-progress-bar"></div></div>` +
        `<button class="mtt-page-progress-cancel" aria-label="${i18n().pageCancel}">✕</button>`;
      el.querySelector('.mtt-page-progress-cancel').onclick = () => this.cancel();
      document.body.appendChild(el);
      this._progressEl = el;
      this._repositionProgress();
    }
    const pct = total > 0 ? Math.round(current / total * 100) : 0;
    this._progressEl.querySelector('.mtt-page-progress-label').textContent =
      i18n().pageTranslating(current, total);
    this._progressEl.querySelector('.mtt-page-progress-bar').style.width = `${pct}%`;
  }

  _repositionProgress() {
    if (!this._progressEl) return;
    const view = this.plugin.app.workspace.activeLeaf?.view;
    const headerEl = view?.containerEl?.querySelector('.view-header');
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      Object.assign(this._progressEl.style, {
        top: `${rect.bottom - 26}px`,
        left: `${rect.left + 8}px`,
        bottom: 'auto',
        transform: 'none',
      });
    }
  }

  _hideProgress() {
    if (this._progressEl) { this._progressEl.remove(); this._progressEl = null; }
  }

  cancel() {
    this._cancelled = true;
    this._running = false;
    this._hideProgress();
    // Revert any blocks that were translated before cancellation
    const container = this._getContainer();
    if (container) {
      container.querySelectorAll('[data-mtt-orig]').forEach(el => {
        el.innerHTML = el.getAttribute('data-mtt-orig');
        el.removeAttribute('data-mtt-orig');
        el.classList.remove('mtt-page-translated');
      });
    }
    this._syncButton(this.plugin.app.workspace.activeLeaf?.view);
  }

  hasTranslation() {
    const container = this._getContainer();
    return !!(container && container.querySelector('[data-mtt-orig]'));
  }

  async translatePage() {
    if (this._running) {
      new Notice(i18n().pageAlreadyRunning);
      return;
    }
    const container = this._getContainer();
    if (!container) {
      new Notice(i18n().pageNeedReadingView);
      return;
    }
    const blocks = this._getBlocks(container);
    if (blocks.length === 0) {
      new Notice(i18n().pageNoText);
      return;
    }

    this._running = true;
    this._cancelled = false;

    const { pageEngine, sourceLang, targetLang, disableCache } = this.plugin.settings;
    const engine = pageEngine || 'google';
    const eng = ENGINES[engine] || ENGINES.google;
    const tooltip = this.plugin.tooltip;

    this._showProgress(0, blocks.length);
    let done = 0;

    for (const el of blocks) {
      if (this._cancelled) break;
      const originalText = el.textContent.trim();
      if (!originalText) { done++; continue; }

      try {
        const key = `v2|${engine}|${sourceLang}|${targetLang}|${originalText}`;
        const cached = disableCache ? null : tooltip?.cacheGet(key);
        const result = cached ?? await eng.translate(originalText, sourceLang, targetLang, this.plugin.settings);
        if (!cached && result?.targetText) tooltip?.cacheSet(key, result, originalText);
        if (this._cancelled) break;
        if (result?.targetText && !isNoopTranslation(result, originalText, this.plugin.settings)) {
          el.setAttribute('data-mtt-orig', el.innerHTML);
          el.textContent = result.targetText;
          el.classList.add('mtt-page-translated');
        }
      } catch (e) {
        console.warn('[mtt] page translation error:', e);
      }

      done++;
      this._showProgress(done, blocks.length);
      // Yield every 3 blocks to keep the UI responsive and avoid rate-limiting.
      if (done % 3 === 0) await new Promise(r => setTimeout(r, 50));
    }

    this._hideProgress();
    this._running = false;

    const activeView = this.plugin.app.workspace.activeLeaf?.view;
    this._syncButton(activeView);

    if (!this._cancelled) {
      new Notice(i18n().pageDone(done, blocks.length));
    }
  }

  restorePage() {
    const container = this._getContainer();
    if (!container) {
      new Notice(i18n().pageRestoreReadingOnly);
      return;
    }
    const translated = container.querySelectorAll('[data-mtt-orig]');
    if (translated.length === 0) {
      new Notice(i18n().pageNoTranslated);
      return;
    }
    translated.forEach(el => {
      el.innerHTML = el.getAttribute('data-mtt-orig');
      el.removeAttribute('data-mtt-orig');
      el.classList.remove('mtt-page-translated');
    });
    this._syncButton(this.plugin.app.workspace.activeLeaf?.view);
    new Notice(i18n().pageRestored(translated.length));
  }
}

module.exports = class MouseTooltipPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.log = new TranslationLog(this.app, this.manifest.dir);
    await this.log.load();
    this.tooltip = new TooltipManager(this, this.log);
    this.pageTranslator = new PageTranslator(this);
    this.pendingTimer = null;
    this.lastTriggerKey = '';
    // Selection-priority lock: while a non-empty selection exists, mouseover follow is paused
    // and the tooltip stays pinned to the selection translation.
    this.selectionActive = false;

    this.addSettingTab(new MouseTooltipSettingTab(this.app, this));

    this.registerView(VOCAB_VIEW_TYPE, (leaf) => new VocabView(leaf, this));

    this.addRibbonIcon('book-open', i18n().ribbonVocab, () => this.openVocabView());
    this.ribbonPageEl = this.addRibbonIcon('languages', i18n().ribbonPage, () => {
      if (this.pageTranslator._running) {
        this.pageTranslator.cancel();
      } else if (this.pageTranslator.hasTranslation()) {
        this.pageTranslator.restorePage();
      } else {
        this.pageTranslator.translatePage();
      }
    });
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) this.ribbonPageEl.style.display = 'none';

    this.addCommand({
      id: 'mtt-open-vocab',
      name: 'Open vocabulary list',
      callback: () => this.openVocabView(),
    });
    this.addCommand({
      id: 'mtt-hide-tooltip',
      name: 'Hide tooltip',
      callback: () => this.tooltip.hide(),
    });
    this.addCommand({
      id: 'mtt-toggle-enabled',
      name: 'Toggle translator on/off',
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(i18n().pluginToggle(this.settings.enabled));
        if (!this.settings.enabled) this.tooltip.hide();
      },
    });
    this.addCommand({
      id: 'mtt-translate-selection',
      name: 'Translate current selection',
      callback: () => this.translateSelection(),
    });
    this.addCommand({
      id: 'mtt-translate-page',
      name: 'Translate current page',
      callback: () => this.pageTranslator.translatePage(),
    });
    this.addCommand({
      id: 'mtt-restore-page',
      name: 'Restore original text (page translation)',
      callback: () => this.pageTranslator.restorePage(),
    });

    // Add translate button to all current and future markdown view headers.
    const addButtons = () => {
      this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
        this._addPageTranslateButton(leaf.view);
      });
    };
    addButtons();
    this.registerEvent(this.app.workspace.on('layout-change', addButtons));

    this.registerDomEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        this.tooltip.hide();
        // ESC also releases the selection lock so mouseover can resume
        this.selectionActive = false;
      }
    });
    this.registerDomEvent(document, 'scroll', () => {
      if (this.selectionActive) return;
      this.tooltip.hide();
    }, true);
    this.registerDomEvent(document, 'selectionchange', () => this.onSelectionChange());

    if (Platform.isMobile) {
      this.registerDomEvent(document, 'touchstart', (e) => {
        if (!this.tooltip.isOwn(e.target)) this.tooltip.hide();
      });
      this.registerDomEvent(document, 'touchend', (e) => this.onTouchEnd(e));
    } else {
      this.registerDomEvent(document, 'mousemove', (e) => this.onMouseMove(e));
      this.registerDomEvent(document, 'mouseleave', () => {
        // keep tooltip while a selection is locking it
        if (this.selectionActive) return;
        this.tooltip.hide();
      });
      this.registerDomEvent(document, 'mousedown', (e) => {
        if (!this.tooltip.isOwn(e.target)) this.tooltip.hide();
      });
      this.registerDomEvent(document, 'mouseup', (e) => this.onMouseUp(e));
    }

    console.log('[mouse-tooltip-translator] loaded');
  }

  async onunload() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    if (this.pageTranslator?._running) this.pageTranslator.cancel();
    if (this.tooltip) await this.tooltip.destroy();
    this.app.workspace.detachLeavesOfType(VOCAB_VIEW_TYPE);
  }

  _addPageTranslateButton(view) {
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) return;
    if (!view || typeof view.addAction !== 'function') return;
    if (view.containerEl?.querySelector('.mtt-page-btn')) return;
    const btn = view.addAction('languages', i18n().ribbonPage, () => {
      if (this.pageTranslator._running) {
        this.pageTranslator.cancel();
      } else if (this.pageTranslator.hasTranslation()) {
        this.pageTranslator.restorePage();
      } else {
        this.pageTranslator.translatePage();
      }
    });
    btn.classList.add('mtt-page-btn');
    this.pageTranslator._syncButton(view);
  }

  async openVocabView() {
    const existing = this.app.workspace.getLeavesOfType(VOCAB_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VOCAB_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  _noteContentSelector() {
    switch (this.settings.activeMode) {
      case 'edit':    return '.cm-content, .markdown-rendered';
      case 'reading': return '.markdown-preview-view, .markdown-rendered';
      default:        return NOTE_CONTENT_SELECTOR;
    }
  }

  onMouseMove(e) {
    if (!this.settings.enabled) return;
    if (this.tooltip.isOwn(e.target)) return;
    if (this.settings.restrictToNoteContent && !isInNoteContent(e.target, this._noteContentSelector())) {
      if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
      if (!this.selectionActive) this.tooltip.hide();
      return;
    }
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }

    if (!this.settings.enableHover) return;
    // While a selection is active, freeze the tooltip on the selection translation.
    if (this.selectionActive) return;

    const x = e.clientX, y = e.clientY;

    // Page-translation hover mode: show pre-translation original of the hovered paragraph.
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) {
      this.pendingTimer = window.setTimeout(() => {
        this.pendingTimer = null;
        if (this.selectionActive) return;
        const target = document.elementFromPoint(x, y);
        const block = target?.closest('[data-mtt-orig]');
        if (block) {
          const origText = getOriginalText(block);
          if (origText) {
            this.tooltip.showPlain(origText, block.getBoundingClientRect());
            return;
          }
        }
        this.tooltip.hide();
      }, Math.max(0, this.settings.delayMs | 0));
      return;
    }

    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      // Re-check: a drag-selection may have started during the hover delay.
      if (this.selectionActive) return;
      const hit = extractAtPoint(x, y, this.settings.textType);
      if (!hit) { this.tooltip.hide(); return; }
      this.tooltip.show(hit.text, hit.rect, this.settings.mouseoverEngine);
    }, Math.max(0, this.settings.delayMs | 0));
  }

  onMouseUp(_e) {
    if (!this.settings.enabled) return;
    // While page-translation hover mode is active, suppress selection-based translation
    // (selected text would be translated text, not original).
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) return;
    if (!this.settings.enableSelection) return;
    // Scope is judged from the selection itself (anchorNode), not from where the mouse
    // was released — a fast drag can land the cursor outside note content even when
    // the selection is entirely inside it.
    setTimeout(() => {
      if (this.settings.restrictToNoteContent) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const _sel = this._noteContentSelector();
        if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
      }
      this.translateSelection();
    }, 0);
  }

  onSelectionChange() {
    if (!this.settings.enabled) return;
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) return;
    if (!this.settings.enableSelection) return;
    const sel = window.getSelection();
    const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim());
    if (hasSelection) {
      if (this.settings.restrictToNoteContent) {
        const _sel = this._noteContentSelector();
        if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
      }
      // Lock onto the selection — mousemove follow is suspended.
      this.selectionActive = true;
    } else if (this.selectionActive) {
      // Selection cleared — release lock and let mouseover resume.
      this.selectionActive = false;
      this.tooltip.hide();
    }
  }

  translateSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    let rect;
    try {
      rect = sel.getRangeAt(0).getBoundingClientRect();
    } catch { rect = null; }
    if (!rect) return;
    this.tooltip.show(text, rect, this.settings.selectionEngine);
  }

  onTouchEnd(e) {
    if (!this.settings.enabled) return;
    if (this.tooltip.isOwn(e.target)) return;

    // Page-translation tap mode: show pre-translation original of the tapped paragraph.
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const x = touch.clientX, y = touch.clientY;
      setTimeout(() => {
        const target = document.elementFromPoint(x, y);
        const block = target?.closest('[data-mtt-orig]');
        if (block) {
          const origText = getOriginalText(block);
          if (origText) {
            this.tooltip.showPlain(origText, block.getBoundingClientRect());
            return;
          }
        }
        this.tooltip.hide();
      }, 100);
      return;
    }

    // Delay to let the browser finalize selection state after touch
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) {
        if (!this.settings.enableSelectionMobile) return;
        if (this.settings.restrictToNoteContent) {
          const _sel = this._noteContentSelector();
          if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
        }
        this.translateSelection();
        return;
      }
      // No selection: try word at touch point
      if (!this.settings.enableHoverMobile) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const x = touch.clientX, y = touch.clientY;
      if (this.settings.restrictToNoteContent) {
        const el = document.elementFromPoint(x, y);
        if (el && !isInNoteContent(el, this._noteContentSelector())) return;
      }
      const hit = extractAtPoint(x, y, 'word');
      if (hit) {
        this.tooltip.show(hit.text, hit.rect, this.settings.selectionEngine);
      }
    }, 100);
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    // Migrate old single 'engine' setting to per-context engines
    if (loaded?.engine) {
      if (!loaded.mouseoverEngine) this.settings.mouseoverEngine = loaded.engine;
      if (!loaded.selectionEngine) this.settings.selectionEngine = loaded.engine;
      if (!loaded.pageEngine) this.settings.pageEngine = loaded.engine;
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class MouseTooltipSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = i18n();
    containerEl.createEl('h2', { text: s.settingsTitle });

    // ---- Master Toggle ----
    new Setting(containerEl)
      .setName(s.masterEnabled)
      .setDesc(s.masterEnabledDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enabled)
        .onChange(async (v) => { this.plugin.settings.enabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.masterRestrict)
      .setDesc(s.masterRestrictDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.restrictToNoteContent)
        .onChange(async (v) => {
          this.plugin.settings.restrictToNoteContent = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
          this.display();
        }));

    // ---- Features ----
    containerEl.createEl('h3', { text: s.secFeatures });

    containerEl.createEl('h4', { text: s.secDesktop });

    new Setting(containerEl)
      .setName(s.featHover)
      .setDesc(s.featHoverDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableHover)
        .onChange(async (v) => { this.plugin.settings.enableHover = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featSelection)
      .setDesc(s.featSelectionDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableSelection)
        .onChange(async (v) => { this.plugin.settings.enableSelection = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featPage)
      .setDesc(s.featPageDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enablePage)
        .onChange(async (v) => {
          this.plugin.settings.enablePage = v;
          await this.plugin.saveSettings();
          if (!Platform.isMobile) {
            if (this.plugin.ribbonPageEl) this.plugin.ribbonPageEl.style.display = v ? '' : 'none';
            if (v) {
              this.plugin.app.workspace.getLeavesOfType('markdown').forEach(leaf => this.plugin._addPageTranslateButton(leaf.view));
            } else {
              document.querySelectorAll('.mtt-page-btn').forEach(el => el.remove());
            }
          }
        }));

    containerEl.createEl('h4', { text: s.secMobile });

    new Setting(containerEl)
      .setName(s.featHoverMobile)
      .setDesc(s.featHoverMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableHoverMobile)
        .onChange(async (v) => { this.plugin.settings.enableHoverMobile = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featSelectionMobile)
      .setDesc(s.featSelectionMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableSelectionMobile)
        .onChange(async (v) => { this.plugin.settings.enableSelectionMobile = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featPageMobile)
      .setDesc(s.featPageMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enablePageMobile)
        .onChange(async (v) => {
          this.plugin.settings.enablePageMobile = v;
          await this.plugin.saveSettings();
          if (Platform.isMobile) {
            if (this.plugin.ribbonPageEl) this.plugin.ribbonPageEl.style.display = v ? '' : 'none';
            if (v) {
              this.plugin.app.workspace.getLeavesOfType('markdown').forEach(leaf => this.plugin._addPageTranslateButton(leaf.view));
            } else {
              document.querySelectorAll('.mtt-page-btn').forEach(el => el.remove());
            }
          }
        }));

    // ---- Translation ----
    containerEl.createEl('h3', { text: s.secTranslation });

    new Setting(containerEl)
      .setName(s.translateFrom)
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) d.addOption(k, v);
        d.setValue(this.plugin.settings.sourceLang)
          .onChange(async (v) => { this.plugin.settings.sourceLang = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName(s.translateTo)
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) {
          if (k === 'auto') continue;
          d.addOption(k, v);
        }
        d.setValue(this.plugin.settings.targetLang)
          .onChange(async (v) => { this.plugin.settings.targetLang = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName(s.skipSame)
      .setDesc(s.skipSameDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.skipSameLanguage)
        .onChange(async (v) => {
          this.plugin.settings.skipSameLanguage = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    new Setting(containerEl)
      .setName(s.skipIdentical)
      .setDesc(s.skipIdenticalDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.skipIdenticalText)
        .onChange(async (v) => {
          this.plugin.settings.skipIdenticalText = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    // ---- Engine Settings ----
    containerEl.createEl('h3', { text: s.secEngines });

    const engineConfigs = [
      { key: 'mouseoverEngine', name: s.engineHover,     desc: s.engineHoverDesc },
      { key: 'selectionEngine', name: s.engineSelection, desc: s.engineSelectionDesc },
      { key: 'pageEngine',      name: s.enginePage,      desc: s.enginePageDesc },
    ];
    const llmEngineLabels = { openaiCompat: s.engOpenaiCompat, ollama: s.engOllama, lmstudio: s.engLmstudio };
    for (const { key, name, desc } of engineConfigs) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addDropdown((d) => {
          for (const [k, v] of Object.entries(ENGINES)) d.addOption(k, llmEngineLabels[k] ?? v.label);
          d.setValue(this.plugin.settings[key] || 'google')
            .onChange(async (v) => {
              this.plugin.settings[key] = v;
              await this.plugin.saveSettings();
              this.display();
            });
        });
    }

    // LLM engine settings (shown once per unique LLM engine in use)
    const usedLLMs = [...new Set(
      [this.plugin.settings.mouseoverEngine, this.plugin.settings.selectionEngine, this.plugin.settings.pageEngine]
        .filter(e => LLM_ENGINE_KEYS.has(e))
    )];
    for (const eng of usedLLMs) {
      containerEl.createEl('h4', { text: eng === 'openaiCompat' ? s.llmOpenai
        : eng === 'ollama' ? s.llmOllama : s.llmLmstudio });

      new Setting(containerEl)
        .setName(s.llmApiUrl)
        .setDesc(eng === 'openaiCompat' ? s.llmApiUrlDescOpenai
          : eng === 'ollama' ? s.llmApiUrlDescOllama : s.llmApiUrlDescLmstudio)
        .addText((t) => {
          const urlKey = eng === 'openaiCompat' ? 'openaiCompatApiUrl'
            : eng === 'ollama' ? 'ollamaApiUrl' : 'lmstudioApiUrl';
          t.setPlaceholder(eng === 'openaiCompat' ? 'https://api.openai.com'
            : eng === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234')
            .setValue(this.plugin.settings[urlKey] || '')
            .onChange(async (v) => { this.plugin.settings[urlKey] = v.trim(); await this.plugin.saveSettings(); });
        });

      if (eng === 'openaiCompat') {
        new Setting(containerEl)
          .setName(s.llmApiKey)
          .addText((t) => t
            .setPlaceholder('sk-...')
            .setValue(this.plugin.settings.openaiCompatApiKey || '')
            .onChange(async (v) => { this.plugin.settings.openaiCompatApiKey = v.trim(); await this.plugin.saveSettings(); }));
      }

      new Setting(containerEl)
        .setName(s.llmModel)
        .setDesc(eng === 'openaiCompat' ? s.llmModelDescOpenai
          : eng === 'ollama' ? s.llmModelDescOllama : s.llmModelDescLmstudio)
        .addText((t) => {
          const modelKey = eng === 'openaiCompat' ? 'openaiCompatModel'
            : eng === 'ollama' ? 'ollamaModel' : 'lmstudioModel';
          t.setPlaceholder(eng === 'openaiCompat' ? 'gpt-4o-mini' : '')
            .setValue(this.plugin.settings[modelKey] || '')
            .onChange(async (v) => { this.plugin.settings[modelKey] = v.trim(); await this.plugin.saveSettings(); });
        });

      const tempKey = eng === 'openaiCompat' ? 'openaiCompatTemperature'
        : eng === 'ollama' ? 'ollamaTemperature' : 'lmstudioTemperature';
      new Setting(containerEl)
        .setName(s.llmTemp)
        .setDesc(s.llmTempDesc)
        .addSlider((sl) => sl
          .setLimits(0, 2, 0.1)
          .setValue(this.plugin.settings[tempKey] ?? 0)
          .setDynamicTooltip()
          .onChange(async (v) => { this.plugin.settings[tempKey] = v; await this.plugin.saveSettings(); }));

      const promptKey = eng === 'openaiCompat' ? 'openaiCompatPrompt'
        : eng === 'ollama' ? 'ollamaPrompt' : 'lmstudioPrompt';
      const promptSetting = new Setting(containerEl)
        .setName(s.llmPrompt)
        .setDesc(s.llmPromptDesc);
      promptSetting.addTextArea((ta) => {
        ta.setPlaceholder('Translate the following text to {{targetLang}}. Output only the translated text, nothing else.\n\n{{text}}')
          .setValue(this.plugin.settings[promptKey] || '')
          .onChange(async (v) => { this.plugin.settings[promptKey] = v; await this.plugin.saveSettings(); });
        ta.inputEl.rows = 4;
        ta.inputEl.style.width = '100%';
        ta.inputEl.style.fontFamily = 'monospace';
        ta.inputEl.style.fontSize = '12px';
      });
    }

    // ---- Per-feature Settings ----
    containerEl.createEl('h3', { text: s.secPerFeature });

    containerEl.createEl('h4', { text: s.secHoverSelection });

    if (this.plugin.settings.restrictToNoteContent) {
      new Setting(containerEl)
        .setName(s.activeMode)
        .setDesc(s.activeModeDesc)
        .addDropdown((d) => d
          .addOption('both', s.modeBoth)
          .addOption('edit', s.modeEdit)
          .addOption('reading', s.modeReading)
          .setValue(this.plugin.settings.activeMode || 'both')
          .onChange(async (v) => {
            this.plugin.settings.activeMode = v;
            await this.plugin.saveSettings();
            this.plugin.tooltip.hide();
          }));
    }

    new Setting(containerEl)
      .setName(s.mouseUnit)
      .setDesc(s.mouseUnitDesc)
      .addDropdown((d) => d
        .addOption('word', s.unitWord)
        .addOption('sentence', s.unitSentence)
        .setValue(this.plugin.settings.textType)
        .onChange(async (v) => { this.plugin.settings.textType = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.hoverDelay)
      .setDesc(s.hoverDelayDesc)
      .addText((t) => t
        .setPlaceholder('500')
        .setValue(String(this.plugin.settings.delayMs))
        .onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.plugin.settings.delayMs = n;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h4', { text: s.secPage });

    new Setting(containerEl)
      .setName(s.pageHoverOrig)
      .setDesc(s.pageHoverOrigDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.pageTranslationHoverOriginal)
        .onChange(async (v) => {
          this.plugin.settings.pageTranslationHoverOriginal = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    // ---- Tooltip Contents ----
    containerEl.createEl('h3', { text: s.secTooltip });

    new Setting(containerEl)
      .setName(s.showDict)
      .setDesc(s.showDictDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDictionary)
        .onChange(async (v) => { this.plugin.settings.showDictionary = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showTranslit)
      .setDesc(s.showTranslitDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showTransliteration)
        .onChange(async (v) => { this.plugin.settings.showTransliteration = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showSource)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showSourceText)
        .onChange(async (v) => { this.plugin.settings.showSourceText = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showDetected)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDetectedLang)
        .onChange(async (v) => { this.plugin.settings.showDetectedLang = v; await this.plugin.saveSettings(); }));
  }
}
