// お店の X の投稿（#本めぐり）を、X の公式の埋め込みで見せる（v0.35.0）
// 11/22 ぶっくまさん「#本めぐり の投稿を自動表示させます」「お店のアカウントだけ」
// 決まりごと
//  - 押すまで X の部品（widgets.js）を読み込まない。読み込むと、見たことが X に伝わるため（プライバシーポリシー第5条）
//  - 押したときに「次からはボタンなしで表示する」を選べる（設定でいつでも戻せる）
//  - dnt（追跡しないで）を付けて頼む
//  - 投稿の写真や文をこちらに取り込まない（X の画面のまま）
import { esc } from './util.js?v=0.35.2';
import { S, save } from './state.js?v=0.35.2';

const WIDGETS = 'https://platform.twitter.com/widgets.js';
let loading = null;
const ok = (id) => /^\d{1,20}$/.test(String(id || ''));
const urlOf = (id, u) => `https://x.com/${encodeURIComponent(u || 'i')}/status/${encodeURIComponent(id)}`;

function loadWidgets() {
  if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) return Promise.resolve(window.twttr);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = WIDGETS; s.async = true; s.charset = 'utf-8';
    s.onload = () => { const t = window.twttr; if (t && t.ready) t.ready(() => res(t)); else if (t && t.widgets) res(t); else rej(new Error('no twttr')); };
    s.onerror = () => { loading = null; rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** 押す前の箱（店のページの「いま行くと、出会えるもの」の中） */
export function xBoxHTML(f) {
  if (!ok(f.x)) return '';
  return `<div class="xbox" data-x="${esc(f.x)}" data-xu="${esc(f.xu || '')}">
    <button class="btn xbtn" type="button"><span class="xlogo" aria-hidden="true">𝕏</span>お店の投稿を見る</button>
    <label class="xkeep"><input type="checkbox"> 次からはボタンなしで表示する</label>
    <div class="muted small">表示すると、見たことが X に伝わります（<a href="privacy.html" target="_blank" rel="noopener">くわしく</a>）</div>
  </div>`;
}

async function show(box) {
  const id = box.dataset.x, u = box.dataset.xu; if (!ok(id) || box.dataset.on) return; box.dataset.on = '1';
  box.classList.add('on'); box.innerHTML = '<div class="muted small xwait">X の投稿を読み込んでいます…</div>';
  const fail = () => { if (box.isConnected) box.innerHTML = `<div class="muted small">X の投稿を表示できませんでした。<a href="${esc(urlOf(id, u))}" target="_blank" rel="noopener noreferrer">X で開く</a></div>`; };
  try {
    const t = await loadWidgets(); if (!box.isConnected) return;
    const holder = document.createElement('div'); box.innerHTML = ''; box.appendChild(holder);
    const dark = document.documentElement.dataset.theme === 'dark';
    const el = await Promise.race([t.widgets.createTweet(id, holder, { lang: 'ja', dnt: true, conversation: 'none', theme: dark ? 'dark' : 'light', align: 'center' }), new Promise((r) => setTimeout(() => r('late'), 12000))]);
    if (!el || el === 'late') { if (!holder.querySelector('iframe')) fail(); }
  } catch (e) { fail(); }
}

/** 店のページを出したあとに呼ぶ。ボタンを動かし、「次からは表示」を選んでいれば、すぐに出す */
export function mountX(root) {
  if (root.id === 'sheet-body') delete root.dataset.xon; // 店のページを開き直したら、また押すまで出さない
  root.querySelectorAll('.xbox[data-x]').forEach((box) => {
    if (box.closest('.fair-more[hidden]')) return; // 「もっと見る」の中は、開いたときに（v0.35.1）
    if (S.settings.xShow || box.closest('[data-xon]')) { show(box); return; }
    const b = box.querySelector('.xbtn'); if (!b) return;
    b.addEventListener('click', () => {
      const keep = box.querySelector('.xkeep input');
      if (keep && keep.checked) { S.settings.xShow = true; save(); }
      // 1回押せば、この店のページで見えている X の投稿は、まとめて表示（1件ずつ押さなくてよい）
      root.querySelectorAll('.xbox[data-x]').forEach((x) => { if (!x.closest('.fair-more[hidden]')) show(x); });
      root.dataset.xon = '1'; // このあと「もっと見る」で開いた分も、そのまま表示
    });
  });
}
