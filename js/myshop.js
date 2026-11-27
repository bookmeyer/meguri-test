// 自分の本屋（v0.39.0・2026-11-26 ぶっくまさん。見本：画面イメージ/修正案_画像_2026-11-26/00〜06）
// 開店：名前と看板（スタンプの柄・色）を選ぶ。本屋か図書館かも選べる。場所は選べる（地図にピンで置く・選ばなくてもよい。端末の中だけ・サーバーに送らない・シェアの画像に出さない・移転できる）
// 棚：「本屋で出会った本」（めぐり帳のカード）と「自分で足した本」。お店の段は本屋で出会った本の数だけで決まる（自分で足した本は数えない）
// 常連度には入れない。「営業○日」＝自分の本屋で読んだ日。2階建ての2階「読書のへや」は、自分の本屋で読んだ時間で明かりがつく。画面は myshop_ui.js
import { SHOP_STAGES, SHOP_ROOM_LIGHTS } from './config.js?v=0.39.0';
import { todayISO, emit } from './util.js?v=0.39.0';
import { S, save } from './state.js?v=0.39.0';
import { countAct } from './events.js?v=0.39.0';

export const canOpen = () => (S.cards || []).length > 0; // 本屋で1冊と出会うと開店できる（④）
export const metCount = () => (S.cards || []).length;
export const placeWord = (shop = S.shop) => (shop && shop.kind === 'l' ? '図書館' : '本屋');
export const stagesOf = (shop = S.shop) => SHOP_STAGES[shop && shop.kind === 'l' ? 'l' : 'b'];
export function stageInfo(shop = S.shop, n = metCount()) {
  const L = stagesOf(shop); let i = 0; L.forEach((x, k) => { if (n >= x.n) i = k + 1; }); i = Math.max(1, i);
  const cur = L[i - 1], next = L[i] || null;
  return { i, name: cur.name, short: cur.short || cur.name, next, toNext: next ? next.n - n : 0, pct: next ? Math.max(0, Math.min(100, Math.round(((n - cur.n) / (next.n - cur.n)) * 100))) : 100, n, last: !next };
}
// 自分で足した本：棚に足した本と、めぐり帳の「いま読んでいる本・読み終えた本」のうちカードのない本
const sameT = (a, b) => String(a || '').replace(/\s/g, '') === String(b || '').replace(/\s/g, '');
const fromCard = (b) => !!b.card || (S.cards || []).some((c) => (c.isbn && b.isbn && c.isbn === b.isbn) || sameT(c.title, b.title));
export function ownBooks() {
  const own = ((S.shop && S.shop.own) || []).map((b) => ({ id: 'o:' + b.id, oid: b.id, title: b.title, author: b.author, cover: b.cover, isbn: b.isbn, d: b.d, t: b.t }));
  const rd = (S.reading || []).filter((b) => b && b.title && !fromCard(b) && !own.some((o) => (o.isbn && o.isbn === b.isbn) || sameT(o.title, b.title))).map((b) => ({ id: 'r:' + b.id, rid: b.id, title: b.title, author: b.author, cover: b.cover, isbn: b.isbn, d: b.d, t: b.t || 0, reading: !b.done }));
  return [...own, ...rd].sort((a, b) => (a.t || 0) - (b.t || 0));
}
export const readingNow = (book) => (S.reading || []).some((b) => !b.done && ((b.card && b.card === book.id) || (b.isbn && book.isbn && b.isbn === book.isbn) || sameT(b.title, book.title)));
const mineReads = () => (S.reads || []).filter((r) => r && !r.off && r.mine && r.min >= 1);
export const mineDays = () => new Set(mineReads().map((r) => r.d)).size;
export const mineMin = () => mineReads().reduce((a, r) => a + (r.min || 0), 0);
export const roomLights = () => SHOP_ROOM_LIGHTS.filter((m) => mineMin() >= m).length;
export function openDays(shop = S.shop) { if (!shop || !shop.d) return 0; const a = Date.parse(shop.d + 'T00:00:00'), b = Date.parse(todayISO() + 'T00:00:00'); return Math.max(0, Math.round((b - a) / 864e5)); }
export const bookCount = () => metCount() + ownBooks().length; // 蔵書
const hour = (t) => `${new Date(t).getHours()}時、`;
function logLine(k, n, lv = 0) { const t = Date.now(); S.shop.log = S.shop.log || []; S.shop.log.push({ k, t, d: todayISO(), lv, n }); if (S.shop.log.length > 200) S.shop.log.splice(0, S.shop.log.length - 200); }
// 開店（回数だけ数える。名前・場所は送らない）
export function openShop({ name, kind, sign, at, photo = '' }) {
  const t = Date.now();
  S.shop = { name: String(name).trim().slice(0, 20), kind: kind === 'l' ? 'l' : 'b', sign, photo: photo || '', at: at || null, t, d: todayISO(), lv: 0, log: [], pick: null, own: [] };
  S.shop.lv = stageInfo().i;
  logLine('open', `${hour(t)}自分の${placeWord()}「${S.shop.name}」を開いた。${stageInfo().name}から。`);
  countAct('shop', 'o' + t, 'open');
  save(); emit('records'); emit('myshop');
}
export function editShop({ name, kind, sign, photo }) {
  if (!S.shop) return; const kindChanged = (kind === 'l' ? 'l' : 'b') !== S.shop.kind;
  S.shop.name = String(name).trim().slice(0, 20) || S.shop.name; S.shop.kind = kind === 'l' ? 'l' : 'b'; S.shop.sign = sign; if (photo !== undefined) S.shop.photo = photo || '';
  if (kindChanged) S.shop.lv = stageInfo().i; // 本屋⇔図書館を変えたときは、いまの段から（お知らせは出さない）
  save(); emit('records'); emit('myshop');
}
// 場所（端末の中だけ）。前に置いていたら「移転」
export function placeShop(at) {
  if (!S.shop) return; const had = !!S.shop.at; S.shop.at = at || null;
  if (had && at) logLine('move', `${S.shop.name}を、新しい場所に移した。`);
  save(); emit('records'); emit('myshop');
}
// 段が上がったか（本屋で出会った本が増えたとき）。上がったら物語に1行・お知らせ（音なし）は画面のほうで
export function checkStage() {
  if (!S.shop) return null; const st = stageInfo();
  if (st.i > (S.shop.lv || 0)) { S.shop.lv = st.i; logLine('up', `${S.shop.name}が「${st.name}」になった（${placeWord()}で出会った本 ${st.n}冊）。`, st.i); save(); return st; }
  return null;
}
export function setPick(book, note) {
  if (!S.shop) return; S.shop.pick = { id: String(book.id || ''), title: book.title, author: book.author || '', isbn: book.isbn || '', cover: book.cover || '', d: todayISO(), t: Date.now(), note: String(note || '').slice(0, 100) };
  logLine('pick', `${S.shop.name}の${pickWord()}に『${book.title}』を置いた。`); save(); emit('records'); emit('myshop');
}
export const pickWord = () => (S.shop && S.shop.kind === 'l' ? '司書の1冊' : '店主の1冊');
export function clearPick() { if (!S.shop) return; S.shop.pick = null; save(); emit('myshop'); }
export function addOwn(b) { if (!S.shop) return null; const t = Date.now(); const x = { id: 'b' + t, title: String(b.title).slice(0, 80), author: b.author || '', isbn: b.isbn || '', cover: b.cover || '', d: todayISO(), t }; S.shop.own.push(x); save(); emit('myshop'); return x; }
export function removeOwn(oid) { if (!S.shop) return; S.shop.own = S.shop.own.filter((b) => b.id !== oid); save(); emit('myshop'); }
