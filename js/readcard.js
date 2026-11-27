// 読書カード（v0.39.0・2026-11-26 ぶっくまさん）：ひと月のカード。しおりをはさんだ日に「しおり」が1つ入る（長さは問わない。押し忘れてあとから長さを選んだ日も入る）
// しおりの柄で読んだ場所がわかる：本屋・図書館のそば＝その店の色／移動読書＝電車の柄／自分の本屋＝自分の看板の色／そのほか＝ふつうの柄（その日にいちばん長く読んだ読書で決める）
// 記録は端末の中だけ。月の画像には場所と書名を出さない。読書カードのしおりは、本屋のスタンプの数・称号・管理画面のスタンプには入れない
// 見せる順（④）：はじめて1分読んでしおりが入るまでは出さない。自分の本屋を開いた人には、自分の本屋の「営業カレンダー」として出す（めぐり帳の「自分の本屋」）
import { esc, todayISO, monthKey, $, APPX } from './util.js?v=0.39.1'
const shopOn = () => APPX && !!S.shop; // 自分の本屋（営業カレンダー）はアプリ版だけ;
import { toast } from './ui.js?v=0.39.1';
import { readCardImage, shareBlob } from './share.js?v=0.39.1';
import { S, save } from './state.js?v=0.39.1';
import { BYID, stampInk, shopInk } from './data.js?v=0.39.1';
import { countAct } from './events.js?v=0.39.1';

const PLAIN = '#FF7AB6';
export const hasShiori = () => (S.reads || []).some((r) => r && !r.off && r.min >= 1) || (S.trips || []).some((g) => g && g.read);
// その月の日ごとのしおり：{ 'DD': { k: 'store'|'move'|'mine'|'plain', c: 色 } }
export function monthShiori(ym) {
  const best = {};
  for (const r of S.reads || []) { if (!r || r.off || !(r.min >= 1) || !String(r.d).startsWith(ym)) continue; const dd = r.d.slice(8); if (!best[dd] || r.min > best[dd].min) best[dd] = r; }
  for (const g of S.trips || []) { if (!g || !g.read || !String(g.d).startsWith(ym)) continue; const dd = g.d.slice(8); if (!best[dd]) best[dd] = { min: g.min || 0 }; } // v0.14 のころの読書（場所なし）
  const out = {};
  for (const [dd, r] of Object.entries(best)) {
    if (r.mine && shopOn()) out[dd] = { k: 'mine', c: shopInk(S.shop).main };
    else if (r.pl && r.pl.k === 'store') { const st = BYID.get(r.pl.s); out[dd] = { k: 'store', c: st ? stampInk(st).main : PLAIN }; }
    else if (r.pl && r.pl.k === 'move') out[dd] = { k: 'move', c: '#2F9BFF' };
    else out[dd] = { k: 'plain', c: PLAIN };
  }
  return out;
}
export const mineDaysIn = (ym) => new Set((S.reads || []).filter((r) => r && !r.off && r.mine && r.min >= 1 && String(r.d).startsWith(ym)).map((r) => r.d)).size;
// しおりの形（CSS の clip-path で切る）。電車の柄は帯、自分の本屋は点
export const shioriStyle = (s) => (s.k === 'move' ? 'background:linear-gradient(#2F9BFF 0 38%,#FFFFFF 38% 56%,#2F9BFF 56%)' : s.k === 'mine' ? `background:radial-gradient(circle at 50% 30%,#FFFFFF 0 16%,transparent 17%),${s.c}` : `background:${s.c}`);
const WDH = '日月火水木金土';
// カードの中身。mini＝しおりをはさんだあとの小さなカード（今日のしおりを目立たせる）
export function cardGrid(ym, { mini = false, pop = '' } = {}) {
  const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1).getDay(); const days = new Date(y, m, 0).getDate();
  const sh = monthShiori(ym); const today = todayISO();
  let cells = mini ? '' : WDH.split('').map((w) => `<div class="rc-w">${w}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div class="rc-c rc-e"></div>';
  for (let d = 1; d <= days; d++) {
    const dd = String(d).padStart(2, '0'); const iso = `${ym}-${dd}`; const s = sh[dd];
    cells += `<div class="rc-c${iso === today ? ' today' : ''}${iso > today ? ' fut' : ''}${pop === iso && s ? ' pop' : ''}"><span class="rc-d">${d}</span>${s ? `<i class="rc-s" style="${shioriStyle(s)}"></i>` : ''}</div>`;
  }
  return { html: `<div class="rc-grid${mini ? ' mini' : ''}">${cells}</div>`, n: Object.keys(sh).length, sh };
}
export const cardTitle = (ym) => { const [y, m] = ym.split('-').map(Number); return shopOn() ? `${S.shop.name}　営業カレンダー　${y}年${m}月` : `読書カード　${y}年${m}月`; };
export const LEGEND = () => `<div class="rc-leg"><span><i class="rc-s" style="background:#4FC07A"></i>本屋・図書館のそば（店の色）</span><span><i class="rc-s" style="${shioriStyle({ k: 'move' })}"></i>移動読書</span>${shopOn() ? `<span><i class="rc-s" style="${shioriStyle({ k: 'mine', c: shopInk(S.shop).main })}"></i>${esc(S.shop.name)}</span>` : ''}<span><i class="rc-s" style="background:${PLAIN}"></i>そのほか</span></div>`;
// 読書カードを開いた（回数だけ。1日1回）
export function noteCardOpen() { const d = todayISO(); if (S.settings.rcDay === d) return; S.settings.rcDay = d; save(); countAct('rcard', 'c' + d); }
export const thisMonth = () => monthKey();
export function prevMonth(ym, k = -1) { const [y, m] = ym.split('-').map(Number); return monthKey(new Date(y, m - 1 + k, 1)); }
// ---- 画面：めぐり帳の「物語」（読書カード）／「自分の本屋」（営業カレンダー）に置く箱 ----
// 今週の1列（日〜土）。しおりをはさんだあとの画面と、たたんだ読書カードに使う（11/26 ぶっくまさん「かなり画面の幅をとる」→ ひと月は開いたときだけ）
export function weekStrip(iso = todayISO(), { pop = '' } = {}) {
  const [y, m, d] = iso.split('-').map(Number); const base = new Date(y, m - 1, d); base.setDate(base.getDate() - base.getDay());
  const today = todayISO(), cache = {}; let cells = '';
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base); dt.setDate(base.getDate() + i); const di = todayISO(dt); const ym = di.slice(0, 7);
    const s = (cache[ym] = cache[ym] || monthShiori(ym))[di.slice(8)];
    cells += `<div class="rc-c${di === today ? ' today' : ''}${di > today ? ' fut' : ''}${pop === di && s ? ' pop' : ''}"><span class="rc-d">${WDH[i]}${dt.getDate()}</span>${s ? `<i class="rc-s" style="${shioriStyle(s)}"></i>` : ''}</div>`;
  }
  return `<div class="rc-grid week">${cells}</div>`;
}
let rcYm = '', rcOpen = false;
export function renderCardBox(el) {
  if (!el) return; if (!hasShiori()) { el.innerHTML = ''; return; } // はじめてしおりが入るまでは出さない（④）
  const cur = thisMonth(); if (!rcYm || rcYm > cur) rcYm = cur;
  const g = cardGrid(rcYm); const mine = shopOn() ? mineDaysIn(rcYm) : -1; const n0 = Object.keys(monthShiori(cur)).length;
  // ふだんはたたんで、今週の1列だけ。押すとひと月が開く（開いたときに「読書カードを開いた」と数える）
  el.innerHTML = `<details class="rcard"${rcOpen ? ' open' : ''}><summary class="rc-sum"><span class="rc-sum-t">${shopOn() ? '営業カレンダー' : '読書カード'}<small>今月 しおり ${n0}日</small></span><span class="rc-more">${rcOpen ? 'たたむ' : 'ひと月を見る ›'}</span>${weekStrip()}</summary>
    <div class="rc-body"><div class="rc-head"><button type="button" class="icon-btn sm" id="rc-prev" aria-label="前の月">‹</button><div class="rc-t">${esc(cardTitle(rcYm))}</div><button type="button" class="icon-btn sm" id="rc-next" aria-label="次の月"${rcYm >= cur ? ' disabled' : ''}>›</button></div>
    ${g.html}<div class="rc-n">しおり <b>${g.n}</b>日${mine > 0 ? `・営業 <b>${mine}</b>日` : ''}</div>${LEGEND()}
    <div class="actions"><button type="button" class="btn small" id="rc-share"${g.n ? '' : ' disabled'}>この月のカードを画像に</button></div>
    <p class="muted small">しおりをはさんだ日に、しおりが1つ入ります（長さは問いません）。場所と本の名前は、画像に出ません。</p></div></details>`;
  if (rcOpen) noteCardOpen(); // 開いたまま描き直したとき（1日1回だけ数える）
  const det = $('details', el); det.addEventListener('toggle', () => { rcOpen = det.open; $('.rc-more', el).textContent = rcOpen ? 'たたむ' : 'ひと月を見る ›'; if (rcOpen) noteCardOpen(); });
  $('#rc-prev', el).onclick = () => { rcYm = prevMonth(rcYm); renderCardBox(el); };
  $('#rc-next', el).onclick = () => { rcYm = prevMonth(rcYm, 1); renderCardBox(el); };
  $('#rc-share', el).onclick = async () => { try { const ym = rcYm; const t = cardTitle(ym); const gg = cardGrid(ym); const blob = await readCardImage(ym, { title: t, sh: gg.sh, n: gg.n, mine: shopOn() ? mineDaysIn(ym) : -1 }); const r = await shareBlob(blob, `reading-card-${ym}.png`, t, `${t}　しおり${gg.n}日 #本めぐり`); if (r !== 'cancel') toast(r === 'saved' ? '画像を保存しました' : 'シェアしました', 'ok'); } catch (e) { toast('画像にできませんでした', 'warn'); } };
}
export const showMonth = (ym) => { rcYm = ym; rcOpen = true; }; // 月はじめの「先月のカードができました」から：開いた形で
