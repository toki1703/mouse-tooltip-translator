const { Plugin, PluginSettingTab, Setting, Notice, requestUrl } = require('obsidian');
const nodeCrypto = require('crypto');

const DEFAULT_SETTINGS = {
  engine: 'google',
  sourceLang: 'auto',
  targetLang: 'ja',
  triggerMode: 'mouseoverselect', // 'mouseover' | 'select' | 'mouseoverselect'
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
};

// Selector for nodes that count as "note content".
// .cm-content       : CodeMirror 6 editor content (source / live preview)
// .markdown-preview-view : reading mode container
// .markdown-rendered     : rendered markdown anywhere (embeds, hover preview, etc.)
const NOTE_CONTENT_SELECTOR = '.cm-content, .markdown-preview-view, .markdown-rendered';

function isInNoteContent(node) {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return false;
  return !!el.closest(NOTE_CONTENT_SELECTOR);
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
  static async translate(text, src, tgt) {
    try {
      const esrc = this.encodeLang(src || 'auto');
      const etgt = this.encodeLang(tgt);
      const raw = await this.requestTranslate(text, esrc, etgt);
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

const ENGINE_CLASSES = {
  google: GoogleEngine,
  googleGTX: GoogleGTXEngine,
  deepl: DeepLEngine,
  bing: BingEngine,
  yandex: YandexEngine,
  papago: PapagoEngine,
};

const ENGINE_LABELS = {
  google: 'Google',
  googleGTX: 'Google (translate_a/t)',
  deepl: 'DeepL (web, experimental)',
  bing: 'Bing (experimental)',
  yandex: 'Yandex (experimental)',
  papago: 'Papago (experimental)',
};

const ENGINES = Object.fromEntries(
  Object.entries(ENGINE_CLASSES).map(([k, C]) => [
    k,
    {
      label: ENGINE_LABELS[k] || k,
      translate: (text, src, tgt) => C.translate(text, src, tgt),
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

class TooltipManager {
  constructor(plugin) {
    this.plugin = plugin;
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
  isOwn(target) {
    return !!(this.el && target instanceof Node && this.el.contains(target));
  }
  cacheGet(key) { return this.cache.get(key); }
  cacheSet(key, val) {
    if (this.cache.size >= this.maxCache) {
      const k = this.cache.keys().next().value;
      this.cache.delete(k);
    }
    this.cache.set(key, val);
  }
  async show(text, rect) {
    if (!text) return;
    const { engine, sourceLang, targetLang } = this.plugin.settings;
    if (text === this.lastText && this.el && this.el.style.display !== 'none') {
      this.position(rect);
      return;
    }
    this.lastText = text;
    const my = ++this.token;

    const el = this.ensure();
    el.textContent = '…';
    el.style.display = 'block';
    this.position(rect);

    const key = `v2|${engine}|${sourceLang}|${targetLang}|${text}`;
    let result = this.cacheGet(key);
    if (!result) {
      try {
        const eng = ENGINES[engine] || ENGINES.google;
        result = await eng.translate(text, sourceLang, targetLang);
      } catch (e) {
        if (my === this.token) {
          el.textContent = `⚠ ${e.message || e}`;
          this.position(rect);
        }
        return;
      }
      if (result && result.targetText) this.cacheSet(key, result);
    }
    if (my !== this.token) return;
    if (!result || !result.targetText) {
      el.textContent = '(no translation)';
      this.position(rect);
      return;
    }
    if (sourceLang !== 'auto' && result.sourceLang === targetLang && targetLang === sourceLang) {
      // skip identical translations would normally happen here; pass
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
    this.position(rect);
  }
  position(rect) {
    if (!this.el || !rect) return;
    const pad = 8;
    const w = this.el.offsetWidth || 200;
    const h = this.el.offsetHeight || 30;
    let x = rect.left;
    let y = rect.bottom + pad;
    if (y + h > window.innerHeight) y = rect.top - h - pad;
    if (y < 0) y = pad;
    if (x + w > window.innerWidth) x = window.innerWidth - w - pad;
    if (x < 0) x = pad;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
  destroy() {
    this.hide();
    if (this.el) { this.el.remove(); this.el = null; }
    this.cache.clear();
  }
}

module.exports = class MouseTooltipPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.tooltip = new TooltipManager(this);
    this.pendingTimer = null;
    this.lastTriggerKey = '';
    // Selection-priority lock: while a non-empty selection exists, mouseover follow is paused
    // and the tooltip stays pinned to the selection translation.
    this.selectionActive = false;

    this.addSettingTab(new MouseTooltipSettingTab(this.app, this));

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
        new Notice(`Mouse Tooltip Translator: ${this.settings.enabled ? 'ON' : 'OFF'}`);
        if (!this.settings.enabled) this.tooltip.hide();
      },
    });
    this.addCommand({
      id: 'mtt-translate-selection',
      name: 'Translate current selection',
      callback: () => this.translateSelection(),
    });

    this.registerDomEvent(document, 'mousemove', (e) => this.onMouseMove(e));
    this.registerDomEvent(document, 'mouseleave', () => {
      // keep tooltip while a selection is locking it
      if (this.selectionActive) return;
      this.tooltip.hide();
    });
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
    this.registerDomEvent(document, 'mousedown', (e) => {
      if (!this.tooltip.isOwn(e.target)) this.tooltip.hide();
    });
    this.registerDomEvent(document, 'mouseup', (e) => this.onMouseUp(e));
    this.registerDomEvent(document, 'selectionchange', () => this.onSelectionChange());

    console.log('[mouse-tooltip-translator] loaded');
  }

  onunload() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    if (this.tooltip) this.tooltip.destroy();
  }

  onMouseMove(e) {
    if (!this.settings.enabled) return;
    if (this.tooltip.isOwn(e.target)) return;
    if (this.settings.restrictToNoteContent && !isInNoteContent(e.target)) {
      if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
      if (!this.selectionActive) this.tooltip.hide();
      return;
    }
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }

    const mode = this.settings.triggerMode;
    if (mode === 'select') return; // selection only
    // While a selection is active, freeze the tooltip on the selection translation.
    if (this.selectionActive) return;

    const x = e.clientX, y = e.clientY;
    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      // Re-check: a drag-selection may have started during the hover delay.
      if (this.selectionActive) return;
      const hit = extractAtPoint(x, y, this.settings.textType);
      if (!hit) { this.tooltip.hide(); return; }
      this.tooltip.show(hit.text, hit.rect);
    }, Math.max(0, this.settings.delayMs | 0));
  }

  onMouseUp(_e) {
    if (!this.settings.enabled) return;
    const mode = this.settings.triggerMode;
    if (mode === 'mouseover') return;
    // Scope is judged from the selection itself (anchorNode), not from where the mouse
    // was released — a fast drag can land the cursor outside note content even when
    // the selection is entirely inside it.
    setTimeout(() => {
      if (this.settings.restrictToNoteContent) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        if (!isInNoteContent(sel.anchorNode) && !isInNoteContent(sel.focusNode)) return;
      }
      this.translateSelection();
    }, 0);
  }

  onSelectionChange() {
    if (!this.settings.enabled) return;
    if (this.settings.triggerMode === 'mouseover') return;
    const sel = window.getSelection();
    const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim());
    if (hasSelection) {
      if (this.settings.restrictToNoteContent
          && !isInNoteContent(sel.anchorNode)
          && !isInNoteContent(sel.focusNode)) return;
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
    this.tooltip.show(text, rect);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
    containerEl.createEl('h2', { text: 'Mouse Tooltip Translator' });

    new Setting(containerEl)
      .setName('Enabled')
      .setDesc('Master switch for the translator.')
      .addToggle((t) => t
        .setValue(this.plugin.settings.enabled)
        .onChange(async (v) => { this.plugin.settings.enabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Restrict to note content')
      .setDesc('Only react inside the note body (editor, preview, embeds). Turn off to translate anywhere in the Obsidian UI — sidebars, headings, settings, etc.')
      .addToggle((t) => t
        .setValue(this.plugin.settings.restrictToNoteContent)
        .onChange(async (v) => {
          this.plugin.settings.restrictToNoteContent = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    new Setting(containerEl)
      .setName('Translator engine')
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(ENGINES)) d.addOption(k, v.label);
        d.setValue(this.plugin.settings.engine)
          .onChange(async (v) => { this.plugin.settings.engine = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName('Translate from')
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) d.addOption(k, v);
        d.setValue(this.plugin.settings.sourceLang)
          .onChange(async (v) => { this.plugin.settings.sourceLang = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName('Translate to')
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) {
          if (k === 'auto') continue;
          d.addOption(k, v);
        }
        d.setValue(this.plugin.settings.targetLang)
          .onChange(async (v) => { this.plugin.settings.targetLang = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName('Trigger')
      .setDesc('How a translation is triggered.')
      .addDropdown((d) => d
        .addOption('mouseover', 'Mouseover')
        .addOption('select', 'Selection')
        .addOption('mouseoverselect', 'Mouseover + Selection')
        .setValue(this.plugin.settings.triggerMode)
        .onChange(async (v) => { this.plugin.settings.triggerMode = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Mouseover unit')
      .setDesc('Word picks one word under the cursor. Sentence expands to sentence boundary.')
      .addDropdown((d) => d
        .addOption('word', 'Word')
        .addOption('sentence', 'Sentence')
        .setValue(this.plugin.settings.textType)
        .onChange(async (v) => { this.plugin.settings.textType = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Hover delay (ms)')
      .setDesc('Wait time before the tooltip is requested.')
      .addText((t) => t
        .setPlaceholder('500')
        .setValue(String(this.plugin.settings.delayMs))
        .onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.plugin.settings.delayMs = n;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show dictionary (POS) for single words')
      .setDesc('When Google returns a bilingual dictionary, show "noun: ..." / "verb: ..." lines instead of the plain translation. Other engines do not return POS info.')
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDictionary)
        .onChange(async (v) => { this.plugin.settings.showDictionary = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Show transliteration (romanization)')
      .setDesc('Display the romanized reading of the source word (Google / Bing only).')
      .addToggle((t) => t
        .setValue(this.plugin.settings.showTransliteration)
        .onChange(async (v) => { this.plugin.settings.showTransliteration = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Show source text in tooltip')
      .addToggle((t) => t
        .setValue(this.plugin.settings.showSourceText)
        .onChange(async (v) => { this.plugin.settings.showSourceText = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Show detected language')
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDetectedLang)
        .onChange(async (v) => { this.plugin.settings.showDetectedLang = v; await this.plugin.saveSettings(); }));
  }
}
