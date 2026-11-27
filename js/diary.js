// 日記（v0.39.0・2026-11-26 ぶっくまさん「物語に書き足せるようにする」）。本にするかどうかはまだ決めていない。まず書けるようにしておく
// めぐり帳の「物語」で、その日の章の下に「この日のこと」を書ける・直せる。前の日にも、スタンプも読書もない日にも書ける（書いた日は物語の章になる。journey.js の activeDates）
// 1日2,000字まで。保存はこの端末の中だけ（S.diary。運営には送らない。送るのは「日記を書いた日」の回数だけ）。書き出し・読み込み・引き継ぎコードに入る
// あとで本の形に書き出せるように、日付ごとに分けて残す（{ 'YYYY-MM-DD': { s: 文, t: 書いた時刻 } }）。作らないもの：本の形の書き出し・注文、日記を人に見せる場所
import { DIARY_MAX } from './config.js?v=0.39.1';
import { esc, $, todayISO, emit } from './util.js?v=0.39.1';
import { S, save } from './state.js?v=0.39.1';
import { openModal, closeModal, toast, confirmBox } from './ui.js?v=0.39.1';
import { countAct } from './events.js?v=0.39.1';

const WD = '日月火水木金土';
export const dayLabel = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${y}年${m}月${dd}日（${WD[new Date(y, m - 1, dd).getDay()]}）`; };
export const diaryOf = (d) => ((S.diary || {})[d] || {}).s || '';
export const diaryDays = () => Object.keys(S.diary || {}).sort();
// 残す。空なら消す。「日記を書いた日」は1日1回だけ数える（文は送らない）
export function setDiary(d, text) {
  S.diary = S.diary || {}; const s = String(text || '').replace(/\r\n?/g, '\n').slice(0, DIARY_MAX);
  if (!s.trim()) delete S.diary[d];
  else { S.diary[d] = { s, t: Date.now() }; const today = todayISO(); if (S.settings.dyDay !== today) { S.settings.dyDay = today; countAct('diary', 'y' + today); } }
  save(); emit('records');
}
// 章の下の「この日のこと」
export function diaryHTML(d) {
  const s = diaryOf(d);
  return `<div class="diary"><div class="dy-h">この日のこと<span class="app-only">アプリ版のみ</span></div>${s ? `<div class="dy-body">${s.split('\n').map((p) => `<p>${p ? esc(p) : '&nbsp;'}</p>`).join('')}</div><button type="button" class="linkish dy-edit" data-dy="${esc(d)}">✎ 直す</button>` : `<button type="button" class="btn small dy-write" data-dy="${esc(d)}">✎ この日のことを書く</button>`}</div>`;
}
// ブラウザ版：日記はアプリ版だけ（11/26 ぶっくまさん「日記と自分の本屋は、常に『アプリ版のみ』と表示しておくとよい」）。今日の章の下にだけ、小さく
export const diaryTeaser = () => '<div class="diary off"><div class="dy-h">この日のこと<span class="app-only">アプリ版のみ</span></div><p class="muted small">本めぐりのアプリ（Android・iPhone）では、その日の章の下に日記を書けます。</p></div>';
// 書きかけ（窓の外を押して閉じても消えないように。端末の中だけ）
const DRAFT = 'meguri_diary_draft';
const getDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { return null; } };
const setDraft = (v) => { try { if (v) localStorage.setItem(DRAFT, JSON.stringify(v)); else localStorage.removeItem(DRAFT); } catch (e) {} };
export function openDiary(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > todayISO()) return;
  const saved = diaryOf(d); const dr = getDraft(); const text = dr && dr.d === d && typeof dr.s === 'string' ? dr.s : saved;
  openModal(`<h2>この日のこと</h2><div class="muted small">${esc(dayLabel(d))}</div>
    <div class="field" style="margin-top:10px"><label for="dy-text" class="sr-only">この日のこと</label><textarea id="dy-text" class="dy-text" maxlength="${DIARY_MAX}" rows="10" placeholder="この日にあったこと、思ったこと。だれにも見せない、自分のための記録です"></textarea><div class="dy-count"><span id="dy-n">0</span> / ${DIARY_MAX.toLocaleString()}字</div></div>
    <p class="hint">この端末の中だけに残ります。運営には送りません。めぐり帳の「物語」の、この日の章の下に入ります（書き出し・引き継ぎコードにも入ります）。</p>
    <div class="actions"><button class="btn primary" id="dy-save">残す</button><button class="btn ghost" id="dy-cancel">やめる</button></div>
    ${saved ? '<div class="actions"><button class="btn danger" id="dy-del">この日の日記を消す</button></div><div id="dy-conf"></div>' : ''}`);
  const ta = $('#dy-text'); ta.value = text; const n = $('#dy-n');
  const upd = () => { n.textContent = ta.value.length.toLocaleString(); setDraft(ta.value !== saved ? { d, s: ta.value } : null); };
  upd(); ta.addEventListener('input', upd);
  $('#dy-cancel').onclick = () => { setDraft(null); closeModal(); };
  $('#dy-save').onclick = () => { const had = !!saved; setDiary(d, ta.value); setDraft(null); closeModal(); toast(ta.value.trim() ? (had ? '直しました' : 'この日の章に残しました') : '消しました', 'ok'); };
  if ($('#dy-del')) $('#dy-del').onclick = () => confirmBox($('#dy-conf'), `${dayLabel(d)}の日記を消します。もとに戻せません。`, () => { setDiary(d, ''); setDraft(null); closeModal(); toast('消しました'); });
}
// ほかの日（前の日）のことを書く：日を選んでから
// 選べるのは、本めぐりを始めた日から今日まで（始める前の日に書くと、第1章が後ろにずれるため）
export function pickDayDiary() {
  const today = todayISO(); const first = [todayISO(new Date(S.createdAt || Date.now())), ...(S.visits || []).map((v) => v.d), ...(S.reads || []).map((r) => r.d)].filter(Boolean).sort()[0] || today;
  openModal(`<h2>ほかの日のことを書く</h2><p class="hint">前の日のことも、あとから書けます。スタンプも読書もない日でも大丈夫です（書いた日は、物語の章になります）。本めぐりを始めた日（${esc(dayLabel(first))}）から選べます。</p>
    <div class="field"><label for="dy-day">日</label><input type="date" id="dy-day" min="${first}" max="${today}" value="${today}"></div>
    <div class="actions"><button class="btn primary" id="dy-go">書く</button><button class="btn ghost" id="dy-no">やめる</button></div>`);
  $('#dy-no').onclick = closeModal;
  $('#dy-go').onclick = () => { const v = $('#dy-day').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > today || v < first) { toast(`${dayLabel(first)}から今日までの日を選んでください`, 'warn'); return; } openDiary(v); };
}
