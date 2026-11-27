// 自分の本屋の画面（v0.39.0）：めぐり帳の「自分の本屋」・開店／看板と名前・場所（地図で選ぶ）・地図のピンとカード・棚・店主の1冊・段が上がったお知らせ（貸した本は 11/26 にやめた）
// 見せる順（④）：本屋で1冊と出会うまでは「本屋で1冊と出会うと、開店できます」だけ。「開店しませんか」は、はじめて本屋のそばで本を登録したときに出す（card_ui.js の cardDone）
import { SHOP_PICK_STAGE, SHOP_ROOM_STAGE, SHOP_ROOM_LIGHTS } from './config.js?v=0.39.1';
import { esc, $, $$, todayISO, emit, fmtDate, fmtMin, hash32, APPX } from './util.js?v=0.39.1';
import { S, save } from './state.js?v=0.39.1';
import { BYID, stampInk, shopInk, signSVG, SIGN_N } from './data.js?v=0.39.1';
import * as MS from './myshop.js?v=0.39.1';
import { shopArt } from './myshop_art.js?v=0.39.1';
import { renderCardBox } from './readcard.js?v=0.39.1';
import * as R from './reading.js?v=0.39.1';
import { openModal, closeModal, toast, confirmBox, searchBook, scanIsbn, stopScan, switchView, setSub, currentView } from './ui.js?v=0.39.1';
import { POS } from './position.js?v=0.39.1';
import * as MAP from './map.js?v=0.39.1';
import { openCard } from './card_ui.js?v=0.39.1';

const artOf = (shop = S.shop) => { const st = MS.stageInfo(shop); const books = (S.cards || []).slice(-4).map((c) => stampInk(BYID.get(c.s) || { i: c.s }).main); return shopArt(shop, st.i, { main: shopInk(shop).main, n: st.n, books, lights: MS.roomLights() }); };
const openText = (shop = S.shop) => { const d = MS.openDays(shop); return d ? `開店から${d}日` : '今日開店'; };
// ---------- 地図の大きなボタン・ピンのカードから：「○○書店で読む」 ----------
export function readHere() {
  if (!S.shop) return; if (R.activeTrip()) { toast('いま読書中です。読み終えたら「しおりをはさむ」を押してください'); return; }
  closeModal(); emit('read-start', { mine: 1 });
}
// ---------- めぐり帳「自分の本屋」 ----------
// ブラウザ版の案内（日記と自分の本屋は、いつも「アプリ版のみ」と出す。11/26 ぶっくまさん）
const WEB_TEASER = () => `<div class="ms-card ms-intro ms-locked"><span class="app-only">アプリ版のみ</span><div class="ms-art">${shopArt({ name: 'あなたの本屋', kind: 'b' }, 3, { main: '#FF6A48' })}</div><h2 class="ms-h">自分の本屋は、アプリ版だけの機能です</h2><p>本めぐりのアプリ（Android・iPhone）では、本屋めぐりで出会った本が並ぶ「自分の本屋」を開けます。出会った本が増えると、ひと箱の本屋から町の本屋、2階建ての本屋へと育ちます。その日の章の下に書く日記も、アプリ版だけです。</p><p class="muted small">いまの記録は、設定の「引き継ぎコード」でアプリに移せます。</p></div>`;
let shelfAll = false;
export function renderShopTab() {
  const el = $('#myshop'); if (!el) return;
  if (!APPX) { el.innerHTML = WEB_TEASER(); return; } // ブラウザ版：「アプリ版のみ」の案内だけ（11/26）
  if (!S.shop) {
    el.innerHTML = MS.canOpen()
      ? `<div class="ms-card ms-intro"><span class="app-only">アプリ版のみ</span><div class="ms-art">${shopArt({ name: 'あなたの本屋', kind: 'b' }, 1, { n: 1 })}</div><h2 class="ms-h">自分の本屋を開きませんか</h2><p>本屋めぐりで出会った本が、あなたの本屋の棚に並びます。出会った本が増えると、ひと箱の本屋から、町の本屋、2階建ての本屋へと育ちます。</p><div class="actions"><button class="btn primary wide" id="ms-open">開店する</button></div><p class="muted small">お店の名前と看板を選びます。本屋のかわりに図書館にもできます。記録はこの端末の中だけです。</p></div>`
      : `<div class="ms-card ms-intro ms-locked"><span class="app-only">アプリ版のみ</span><div class="ms-art">${shopArt({ name: '', kind: 'b' }, 1, { n: 1, books: ['#D9CDB4'] })}</div><h2 class="ms-h">本屋で1冊と出会うと、開店できます</h2><p class="muted small">店のページの「本と出会った」で本を登録すると、ここに自分の本屋を開けます。</p></div>`;
    if ($('#ms-open')) $('#ms-open').onclick = () => openShopModal();
    return;
  }
  const sh = S.shop, st = MS.stageInfo(), lights = MS.roomLights(), mDays = MS.mineDays(), own = MS.ownBooks(), pw = MS.placeWord();
  const pickOk = st.i >= SHOP_PICK_STAGE, room = sh.kind !== 'l' && st.i >= SHOP_ROOM_STAGE;
  const pick = sh.pick;
  el.innerHTML = `<div class="ms-card"><button type="button" class="ms-sign" id="ms-sign" aria-label="看板と名前を変える">${signSVG(sh, 62)}</button><span class="ms-badge">${esc(st.name)}</span><span class="app-only">アプリ版のみ</span><h2 class="ms-name">${esc(sh.name)}</h2>
      <div class="ms-sub">${openText()}・蔵書 ${MS.bookCount()}冊${mDays ? `<br>営業 ${mDays}日（自分の${pw}で読んだ日）` : ''}</div>
      <div class="ms-art">${artOf()}</div>
      ${st.next ? `<div class="ms-next"><span>${esc(st.next.name)}まで あと${st.toNext}冊</span><span class="ms-bar"><b style="width:${st.pct}%"></b></span></div>` : `<div class="ms-next"><span>いちばん大きな${pw}になりました</span></div>`}
      <button class="btn primary wide ms-read" id="ms-read">📖 ${esc(sh.name)}で読む</button></div>
    ${pickOk ? `<div class="ms-pick">${pick ? `<div class="ms-pick-h">🔖 ${esc(MS.pickWord())}『${esc(pick.title)}』</div>${pick.note ? `<div class="ms-pick-n">${esc(pick.note)}</div>` : ''}<div class="actions"><button class="btn small" id="ms-pick-share">書名をシェア</button><button class="btn small ghost" id="ms-pick-set">変える</button></div>` : `<div class="ms-pick-h">🔖 ${esc(MS.pickWord())}を置けます</div><p class="muted small">棚の本から1冊を選んで、ひとことを添えます（書店員さんの1冊と同じ形）。</p><div class="actions"><button class="btn small" id="ms-pick-set">${esc(MS.pickWord())}を置く</button></div>`}</div>` : `<p class="muted small ms-soon">${sh.kind === 'l' ? '町の図書館' : '町の本屋'}（${pw}で出会った本 20冊）になると、${esc(MS.pickWord())}を置けます。</p>`}
    ${room ? `<div class="ms-room">🪟 2階「読書のへや」：明かり ${lights}／${SHOP_ROOM_LIGHTS.length}　<span class="muted small">自分の${pw}で読んだ時間 ${fmtMin(MS.mineMin()) || '0分'}${lights < SHOP_ROOM_LIGHTS.length ? `（次の明かりまで あと${fmtMin(SHOP_ROOM_LIGHTS[lights] - MS.mineMin())}）` : ''}</span></div>` : ''}
    <div id="ms-cal"></div>
    <h3 class="ms-h3">${pw === '図書館' ? '図書館めぐり' : '本屋めぐり'}の棚<small>${MS.metCount()}冊</small></h3>
    ${shelfHTML()}
    <h3 class="ms-h3">自分で足した本<small>${own.length}冊</small></h3>
    ${own.length ? `<div class="shelf own">${own.map((b) => spine(b, ownColor(b), { reading: !!b.reading })).join('')}</div>` : '<p class="muted small">家にある本や、いま読んでいる本を並べられます。お店の段・称号には数えません。</p>'}
    <div class="actions"><button class="btn small" id="ms-add">＋ 本を足す</button></div>
    <h3 class="ms-h3">お店のこと</h3>
    <div class="ms-info"><div>${sh.at ? '📍 地図に置いています（あなたの地図にだけ出ます）' : '📍 場所は決めていません'}</div><div class="actions">${sh.at ? '<button class="btn small" id="ms-move">移転する</button><button class="btn small ghost" id="ms-unplace">地図から外す</button>' : '<button class="btn small" id="ms-place">地図に置く</button>'}<button class="btn small ghost" id="ms-edit">看板と名前</button></div>
    <p class="muted small">お店の名前・場所・棚は、この端末の中だけに残ります。運営には送りません。場所は、シェアの画像には出ません。常連度には入りません。</p></div>`;
  renderCardBox($('#ms-cal')); // 営業カレンダー（読書カード。開いた人だけ）
  $('#ms-read').onclick = readHere;
  if ($('#ms-pick-set')) $('#ms-pick-set').onclick = pickModal;
  if ($('#ms-pick-share')) $('#ms-pick-share').onclick = sharePick;
  $('#ms-add').onclick = addOwnModal;
  $('#ms-edit').onclick = () => openShopModal(true); $('#ms-sign').onclick = () => openShopModal(true); // 看板を押しても変えられる
  if ($('#ms-place')) $('#ms-place').onclick = () => placeModal();
  if ($('#ms-move')) $('#ms-move').onclick = () => placeModal(true);
  if ($('#ms-unplace')) $('#ms-unplace').onclick = () => { MS.placeShop(null); toast('地図から外しました'); };
  if ($('#ms-more')) $('#ms-more').onclick = () => { shelfAll = true; renderShopTab(); };
  $$('#myshop [data-bk]').forEach((b) => b.addEventListener('click', () => bookModal(b.dataset.bk)));
}
// 棚：背表紙の色＝その本と出会った本屋の色。しおりのひも＝いま読んでいる本。点線＝いま棚に入った本（今日）
const OWN_C = ['#F3E3C3', '#E8D9F2', '#D7ECF7', '#DDF2DF', '#F9DCD3', '#FFF3C2'];
const ownColor = (b) => OWN_C[hash32(b.id) % OWN_C.length];
const spine = (b, color, { reading = false, fresh = false } = {}) => { const h = 46 + (hash32(b.id) % 16); const t = String(b.title || '').replace(/\s+/g, ''); return `<button type="button" class="spine${fresh ? ' fresh' : ''}" data-bk="${esc(b.id)}" style="--c:${color};height:${h}px" title="${esc(b.title)}" aria-label="${esc(b.title)}"><span>${esc(t.slice(0, 6))}</span>${reading ? '<i class="ribbon"></i>' : ''}</button>`; };
function shelfHTML() {
  const cards = (S.cards || []).slice(); if (!cards.length) return '<p class="muted small">店のページの「本と出会った」で本を登録すると、ここに並びます。</p>';
  const today = todayISO(); const last = cards[cards.length - 1];
  const show = shelfAll ? cards : cards.slice(-60); const rest = cards.length - show.length;
  const per = {}; cards.forEach((c) => { per[c.s] = (per[c.s] || 0) + 1; });
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => ({ id, n: (BYID.get(id) || {}).n || (cards.find((c) => c.s === id) || {}).sn || '', c: stampInk(BYID.get(id) || { i: id }).main }));
  return `<div class="shelf">${show.map((c) => spine(c, stampInk(BYID.get(c.s) || { i: c.s }).main, { reading: MS.readingNow(c), fresh: c === last && c.d === today })).join('')}</div>${rest > 0 ? `<button type="button" class="linkish ms-more" id="ms-more">ほか${rest}冊 ›</button>` : ''}
    <div class="ms-leg">${top.map((x) => `<span><i style="background:${x.c}"></i>${esc(x.n)}</span>`).join('')}</div>
    <p class="muted small">背表紙の色は、その本と出会った本屋の色。しおりのひもが出ているのは、いま読んでいる本。点線は、今日棚に入った本です。</p>`;
}
// 棚の本を押したとき
function bookModal(id) {
  const card = (S.cards || []).find((c) => c.id === id); const own = card ? null : MS.ownBooks().find((b) => b.id === id); const b = card || own; if (!b) return;
  const st = MS.stageInfo(); const pickOk = st.i >= SHOP_PICK_STAGE;
  openModal(`<h2>『${esc(b.title)}』</h2><div class="muted small">${card ? `${esc(card.sn)}で出会った本・${fmtDate(card.d)}` : own.rid ? 'めぐり帳の「いま読んでいる本・読み終えた本」から' : `自分で足した本${own.d ? '・' + fmtDate(own.d) : ''}`}${MS.readingNow(b) ? '・いま読んでいる本' : ''}</div>
    <div class="actions">${card ? '<button class="btn wide" id="bk-card">カードを見る</button>' : ''}${pickOk ? `<button class="btn wide" id="bk-pick">${esc(MS.pickWord())}にする</button>` : ''}${own && own.oid ? '<button class="btn danger wide" id="bk-del">棚から外す</button>' : ''}<button class="btn ghost wide" id="bk-close">閉じる</button></div>`);
  $('#bk-close').onclick = closeModal;
  if ($('#bk-card')) $('#bk-card').onclick = () => { closeModal(); openCard(card.id); };
  if ($('#bk-pick')) $('#bk-pick').onclick = () => pickModal(b);
  if ($('#bk-del')) $('#bk-del').onclick = () => { MS.removeOwn(own.oid); closeModal(); toast('棚から外しました'); };
}
// 自分で足した本：バーコード・書名でさがす・名前を書く
function addOwnModal() {
  openModal(`<h2>本を足す</h2><p class="hint">「自分で足した本」の棚に並びます。お店の段・称号には数えません。</p>
    <div class="actions"><button class="btn primary wide" id="ao-scan">本の裏のバーコードを読む</button><button class="btn wide" id="ao-search">書名でさがす</button><button class="btn wide" id="ao-free">名前を自分で書く</button><button class="btn ghost wide" id="ao-cancel">やめる</button></div>`);
  const done = (b) => { stopScan(); if (!b || !b.title) return; MS.addOwn(b); closeModal(); toast(`『${b.title}』を棚に並べました`, 'ok'); };
  $('#ao-cancel').onclick = closeModal; $('#ao-scan').onclick = () => scanIsbn(done); $('#ao-search').onclick = () => searchBook(done);
  $('#ao-free').onclick = () => { openModal(`<h2>本を足す</h2><div class="field"><label for="ao-title">本の名前</label><input type="text" id="ao-title" maxlength="80" placeholder="書名"></div><div class="actions"><button class="btn primary" id="ao-ok">並べる</button><button class="btn ghost" id="ao-no">やめる</button></div>`); $('#ao-no').onclick = closeModal; $('#ao-ok').onclick = () => { const t = $('#ao-title').value.trim(); if (!t) { toast('本の名前を入れてください', 'warn'); return; } done({ title: t }); }; };
}
// 店主の1冊（司書の1冊）：棚の本から選んで、ひとこと
function pickModal(pre = null) {
  const books = [...(S.cards || []).slice().reverse().map((c) => ({ id: c.id, title: c.title, author: c.author, isbn: c.isbn, cover: c.cover })), ...MS.ownBooks().map((b) => ({ id: b.id, title: b.title, author: b.author, isbn: b.isbn, cover: b.cover }))];
  const cur = (S.shop.pick && S.shop.pick.id) || (pre && pre.id) || (books[0] && books[0].id) || '';
  openModal(`<h2>${esc(MS.pickWord())}</h2><p class="hint">${esc(S.shop.name)}の棚から、いちばんすすめたい1冊を選んでください。</p>
    <div class="field"><label for="pk-book">本</label><select id="pk-book">${books.map((b) => `<option value="${esc(b.id)}"${b.id === cur ? ' selected' : ''}>${esc(b.title)}</option>`).join('')}</select></div>
    <div class="field"><label for="pk-note">ひとこと（任意・100字まで）</label><textarea id="pk-note" maxlength="100" placeholder="例：雨の日に出会った本。読み終えたら、また行きたくなった。">${esc((S.shop.pick && S.shop.pick.note) || '')}</textarea></div>
    <p class="muted small">シェアできるのは書名だけです（表紙の画像は使いません）。</p>
    <div class="actions"><button class="btn primary" id="pk-ok">置く</button>${S.shop.pick ? '<button class="btn ghost" id="pk-clear">下げる</button>' : ''}<button class="btn ghost" id="pk-no">やめる</button></div>`);
  $('#pk-no').onclick = closeModal;
  if ($('#pk-clear')) $('#pk-clear').onclick = () => { MS.clearPick(); closeModal(); };
  $('#pk-ok').onclick = () => { const b = books.find((x) => x.id === $('#pk-book').value); if (!b) { toast('本を選んでください', 'warn'); return; } MS.setPick(b, $('#pk-note').value.trim()); closeModal(); toast(`${MS.pickWord()}に『${b.title}』を置きました`, 'ok'); };
}
async function sharePick() {
  const p = S.shop && S.shop.pick; if (!p) return; const text = `${S.shop.name}の${MS.pickWord()}は『${p.title}』です。 #本めぐり`;
  try {
    if (window.__meguriNative && window.__meguriNative.shareText) { await window.__meguriNative.shareText(text); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); toast('文をコピーしました', 'ok');
  } catch (e) { if (!(e && e.name === 'AbortError')) toast('シェアできませんでした', 'warn'); }
}
// ---------- 開店・看板と名前 ----------
// 看板の写真：まんなかを正方形に切って、200×200 の JPEG に（自分のアイコンと同じく、端末の中だけ・運営には送らない）
async function makeSignPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    let im; try { im = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
    const w = im.width || im.naturalWidth, h = im.height || im.naturalHeight; if (!w || !h) throw new Error('bad image');
    const N = 200; const cv = document.createElement('canvas'); cv.width = N; cv.height = N; const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, N, N); const side = Math.min(w, h); g.drawImage(im, (w - side) / 2, (h - side) / 2, side, side, 0, 0, N, N);
    let q = 0.86, out = cv.toDataURL('image/jpeg', q); while (out.length > 100000 && q > 0.4) { q -= 0.12; out = cv.toDataURL('image/jpeg', q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
export function openShopModal(edit = false) {
  const sh = edit && S.shop; const rnd = (n) => Math.floor(Math.random() * n);
  let sign = sh ? { ...sh.sign } : { p: rnd(SIGN_N.p), c: rnd(SIGN_N.c), sh: rnd(SIGN_N.sh) }; let kind = sh ? sh.kind : 'b'; let photo = sh ? sh.photo || '' : '';
  const canHere = POS.lat != null && !POS.fake;
  openModal(`<h2>${edit ? '看板と名前' : '自分の本屋を開く'}</h2>${edit ? '' : '<p class="hint">本屋めぐりで出会った本が、あなたの本屋の棚に並びます。出会った本が増えると、お店が育ちます。</p>'}
    <div class="sg-prev" id="sp-prev"></div>
    <div class="field"><label for="sp-name">お店の名前（20字まで）</label><input type="text" id="sp-name" maxlength="20" placeholder="例：こもれび書店" value="${esc(sh ? sh.name : '')}"></div>
    <div class="field"><label>本屋か、図書館か</label><div class="sg-kind"><label class="chk"><input type="radio" name="sp-kind" value="b"${kind === 'b' ? ' checked' : ''}> 本屋</label><label class="chk"><input type="radio" name="sp-kind" value="l"${kind === 'l' ? ' checked' : ''}> 図書館</label></div></div>
    <div class="field"><label>看板の柄（スマホの写真も使えます）</label><div class="sg-row" id="sp-p"></div><p class="muted small" id="sp-photo-note"${photo ? '' : ' hidden'}>看板の写真は、この端末の中だけに残します。運営には送りません。柄を押すと、写真をやめて柄にもどります。</p></div>
    <div class="field"><label>看板の色</label><div class="sg-row" id="sp-c"></div></div>
    <div class="field"><label>看板の形</label><div class="sg-row" id="sp-sh"></div></div>
    ${edit ? '' : `<div class="field"><label>場所</label><label class="chk"><input type="radio" name="sp-at" value="" checked> 決めない（あとで決められます）</label><label class="chk"><input type="radio" name="sp-at" value="here"${canHere ? '' : ' disabled'}> いまいる場所</label><label class="chk"><input type="radio" name="sp-at" value="map"> 地図で選ぶ</label></div>
    <p class="note">場所は、この端末の中だけに残ります。運営には送りません。自分の地図にだけ出て、シェアの画像には出ません。</p>`}
    <div class="actions"><button class="btn primary" id="sp-ok">${edit ? '変える' : '開店する'}</button><button class="btn ghost" id="sp-no">${edit ? 'やめる' : 'あとで'}</button></div>`);
  const draw = () => {
    const nm = $('#sp-name').value.trim() || 'あなたの本屋'; const tmp = { name: nm, kind, sign, photo };
    $('#sp-prev').innerHTML = `${signSVG(tmp, 76, sign, photo)}<div class="sg-art">${shopArt(tmp, 1, { main: shopInk(tmp).main, n: 2 })}</div>`;
    // 写真（いちばん前）＋柄12。写真を選んでいるときは、柄の印を消す
    $('#sp-p').innerHTML = `<label class="sg-opt sg-photo${photo ? ' on' : ''}" aria-label="スマホの写真を使う">${photo ? signSVG({ name: '' }, 40, sign, photo) : '<span class="sg-cam">📷</span><small>写真</small>'}<input type="file" accept="image/*" id="sp-file" hidden></label>`
      + [...Array(SIGN_N.p)].map((_, i) => `<button type="button" class="sg-opt${!photo && i === sign.p ? ' on' : ''}" data-p="${i}" aria-label="柄${i + 1}">${signSVG({ name: '' }, 40, { ...sign, p: i }, '')}</button>`).join('');
    $('#sp-photo-note').hidden = !photo;
    $('#sp-file').addEventListener('change', async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { photo = await makeSignPhoto(f); draw(); } catch (err) { toast('写真を読めませんでした。ほかの写真か柄で', 'warn'); } });
    $('#sp-c').innerHTML = [...Array(SIGN_N.c)].map((_, i) => `<button type="button" class="sg-sw${i === sign.c ? ' on' : ''}" data-c="${i}" aria-label="色${i + 1}" style="background:${shopInk({ sign: { c: i } }).main}"></button>`).join('');
    $('#sp-sh').innerHTML = [...Array(SIGN_N.sh)].map((_, i) => `<button type="button" class="sg-opt${i === sign.sh ? ' on' : ''}" data-sh="${i}" aria-label="形${i + 1}">${signSVG({ name: '' }, 40, { ...sign, sh: i }, photo)}</button>`).join('');
    $$('#sp-p [data-p]').forEach((b) => b.addEventListener('click', () => { sign.p = +b.dataset.p; photo = ''; draw(); }));
    $$('#sp-c [data-c]').forEach((b) => b.addEventListener('click', () => { sign.c = +b.dataset.c; draw(); }));
    $$('#sp-sh [data-sh]').forEach((b) => b.addEventListener('click', () => { sign.sh = +b.dataset.sh; draw(); }));
  };
  draw();
  let tm = null; $('#sp-name').addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 250); });
  $$('input[name=sp-kind]').forEach((r) => r.addEventListener('change', () => { kind = r.value === 'l' ? 'l' : 'b'; draw(); }));
  $('#sp-no').onclick = closeModal;
  $('#sp-ok').onclick = () => {
    const name = $('#sp-name').value.trim(); if (!name) { toast('お店の名前を入れてください', 'warn'); $('#sp-name').focus(); return; }
    if (edit) { MS.editShop({ name, kind, sign, photo }); closeModal(); toast('変えました', 'ok'); return; }
    const where = ($('input[name=sp-at]:checked') || {}).value || '';
    const at = where === 'here' && POS.lat != null && !POS.fake ? [+POS.lat.toFixed(5), +POS.lon.toFixed(5)] : null;
    MS.openShop({ name, kind, sign, at, photo }); closeModal();
    toast(`🎉 ${name}を開店しました`, 'ok');
    if (where === 'map') pickPlace((p) => { MS.placeShop(p); toast('自分の本屋を地図に置きました', 'ok'); goShop(); });
    else goShop();
  };
}
export function goShop() { switchView('zukan'); setSub('shop'); }
// 場所を決める・移転する
function placeModal(move = false) {
  const canHere = POS.lat != null && !POS.fake;
  openModal(`<h2>${move ? '移転する' : '地図に置く'}</h2><p class="hint">${esc(S.shop.name)}を、地図のどこに置きますか。あなたの地図にだけ出ます（場所はこの端末の中だけ）。</p>
    <div class="actions"><button class="btn primary wide" id="pl-map">地図で選ぶ</button><button class="btn wide" id="pl-here"${canHere ? '' : ' disabled'}>いまいる場所に置く</button><button class="btn ghost wide" id="pl-no">やめる</button></div>`);
  $('#pl-no').onclick = closeModal;
  $('#pl-here').onclick = () => { if (POS.lat == null) return; MS.placeShop([+POS.lat.toFixed(5), +POS.lon.toFixed(5)]); closeModal(); toast(move ? '移転しました' : '地図に置きました', 'ok'); };
  $('#pl-map').onclick = () => pickPlace((p) => { MS.placeShop(p); toast(move ? '移転しました' : '地図に置きました', 'ok'); goShop(); });
}
// 地図で選ぶ：地図を動かして、まんなかの印を合わせる
export function pickPlace(done) {
  closeModal(); switchView('map'); const old = $('#place-pick'); if (old) old.remove();
  if (S.shop && S.shop.at) MAP.jumpTo(S.shop.at[1], S.shop.at[0], 16); else if (POS.lat != null && !POS.fake) MAP.jumpTo(POS.lon, POS.lat, 16);
  const ov = document.createElement('div'); ov.id = 'place-pick'; ov.className = 'place-pick';
  ov.innerHTML = `<div class="pp-pin" aria-hidden="true"><svg viewBox="0 0 40 52" width="40" height="52"><path d="M20 50S4 30 4 18a16 16 0 0 1 32 0c0 12-16 32-16 32z" fill="#FF6A48" stroke="#1B1B1B" stroke-width="3"/><circle cx="20" cy="18" r="6" fill="#FFFFFF" stroke="#1B1B1B" stroke-width="2.5"/></svg></div>
    <div class="pp-bar"><div class="pp-t">地図を動かして、まんなかの印を${esc((S.shop && S.shop.name) || '自分の本屋')}の場所に合わせてください</div><div class="actions"><button class="btn primary" id="pp-ok">ここに置く</button><button class="btn ghost" id="pp-no">やめる</button></div></div>`;
  document.body.appendChild(ov);
  const place = () => { const m = $('#map'); if (!m) return; const r = m.getBoundingClientRect(); const pin = $('.pp-pin', ov); pin.style.left = `${r.left + r.width / 2 - 20}px`; pin.style.top = `${r.top + r.height / 2 - 50}px`; };
  place(); setTimeout(place, 300); window.addEventListener('resize', place);
  const end = () => { window.removeEventListener('resize', place); ov.remove(); };
  $('#pp-no').onclick = end;
  $('#pp-ok').onclick = () => { const c = MAP.center(); end(); done([+c.lat.toFixed(5), +c.lng.toFixed(5)]); };
}
// ---------- 地図のピン（段3）：いまの段のお店の絵。自分の地図にだけ出る ----------
let pin = null, pinKey = '';
export function syncShopPin() {
  if (!APPX || !MAP.M.map || typeof maplibregl === 'undefined') return; // アプリ版だけ
  const sh = S.shop; const key = sh && sh.at ? JSON.stringify([sh.at, sh.name, sh.kind, sh.sign, (sh.photo || '').length, MS.stageInfo().i, Math.min(4, MS.metCount()), MS.roomLights()]) : '';
  if (key === pinKey && (pin || !key)) return; pinKey = key;
  if (pin) { pin.remove(); pin = null; } if (!key) return;
  const el = document.createElement('button'); el.type = 'button'; el.className = 'myshop-pin'; el.setAttribute('aria-label', `${sh.name}（自分の${MS.placeWord()}）`);
  el.innerHTML = `<span class="mp-b">${artOf()}<span class="mp-sign">${signSVG(sh, 28)}</span></span><span class="mp-n">${esc(sh.name)}</span>`; // ピン：お店の絵（段で育つ）＋左上に看板
  el.addEventListener('click', (e) => { e.stopPropagation(); openShopCard(); });
  pin = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([sh.at[1], sh.at[0]]).addTo(MAP.M.map);
}
export function openShopCard() {
  const sh = S.shop; if (!sh) return; const st = MS.stageInfo();
  openModal(`<div class="ms-pop"><div class="ms-thumb">${artOf()}<span class="ms-thumb-sign">${signSVG(sh, 34)}</span></div><div class="ms-pop-t"><h2>${esc(sh.name)}</h2><div class="muted small">${esc(st.name)}・${openText()}・蔵書 ${MS.bookCount()}冊</div><span class="ms-lock">🔒 あなたの地図にだけ出ています</span></div></div>
    <div class="actions"><button class="btn primary" id="mc-read">📖 ${esc(sh.name)}で読む</button><button class="btn" id="mc-shelf">棚を見る ›</button><button class="btn ghost" id="mc-close">閉じる</button></div>`);
  $('#mc-close').onclick = closeModal; $('#mc-read').onclick = readHere; $('#mc-shelf').onclick = () => { closeModal(); goShop(); };
}
// ---------- カードができたあと（card_ui.js の cardDone から）：棚に入った／はじめて本屋のそばで出会った → 開店しませんか ----------
export function afterCard(box, c, inStore) {
  if (!box || !APPX) return; // アプリ版だけ
  if (S.shop) { box.innerHTML = `<div class="status-card gold">📚『${esc(c.title)}』が${esc(S.shop.name)}の棚に入りました</div>`; return; }
  if (!inStore || S.settings.shopAsk) return;
  S.settings.shopAsk = 1; save(); // 聞くのは1回だけ（あとは、めぐり帳の「自分の本屋」から）
  box.innerHTML = `<div class="ms-ask"><div class="ms-ask-art">${shopArt({ name: '', kind: 'b' }, 1, { n: 1, books: [stampInk(BYID.get(c.s) || { i: c.s }).main] })}</div><div><b>本屋で1冊と出会いました</b><p class="small">この本を棚に並べて、自分の本屋を開店しませんか？</p><div class="actions"><button class="btn primary small" id="ms-ask-yes">開店する</button><button class="btn ghost small" id="ms-ask-no">あとで</button></div></div></div>`;
  $('#ms-ask-yes').onclick = () => openShopModal(); $('#ms-ask-no').onclick = () => { box.innerHTML = '<p class="muted small">めぐり帳の「自分の本屋」から、いつでも開店できます。</p>'; };
}
// 段が上がったとき（音なし）
export function notifyStage(st) { if (!S.shop || !st) return; toast(`🎉 ${S.shop.name}は「${st.name}」になりました`, 'ok'); if (currentView === 'zukan') renderShopTab(); }
