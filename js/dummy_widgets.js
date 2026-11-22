// テスト版だけの見本の X（本物の X には読みに行かない）
(function () {
  var M = {"9001":{"text":"2階文芸コーナーで「冬に読みたい、あたたかい本」フェアはじまりました☕ スタッフの手書きPOPつきです。","bg":"linear-gradient(135deg,#C9A27A 0 18%,#8E6E4F 18% 22%,#E8D6B8 22% 40%,#B5523B 40% 46%,#F3E3C3 46% 62%,#5F7F63 62% 68%,#EAD9B5 68% 100%)","t":"午前10:12 · 2026年11月22日"},"9002":{"text":"「サイン本、入荷しました」📚 先着順です。お取り置きはできません。","bg":"linear-gradient(160deg,#2E4A62 0 30%,#F4EBDD 30% 55%,#D98C5F 55% 70%,#F4EBDD 70% 100%)","t":"午後3:40 · 2026年11月21日"},"9003":{"text":"入口の平台を、冬の絵本に入れかえました⛄ 小さなお子さんと一緒にどうぞ。","bg":"linear-gradient(120deg,#FFFFFF 0 20%,#9CC3E6 20% 45%,#F7E1A0 45% 70%,#E9A8A0 70% 100%)","t":"午前11:05 · 2026年11月20日"},"9004":{"text":"「店長の今年の10冊」の棚ができました。1冊ずつ短いコメントを付けています。","bg":"linear-gradient(135deg,#3C3C3C 0 25%,#E5D3B3 25% 60%,#A44A3F 60% 75%,#E5D3B3 75% 100%)","t":"午後6:20 · 2026年11月19日"},"9005":{"text":"「読書会のお知らせ」12/14(土) 14時〜 店内のカフェで。課題本は店頭にあります。","bg":"linear-gradient(135deg,#6B8F71 0 35%,#F2E8CF 35% 100%)","t":"午後1:00 · 2026年11月18日"},"9006":{"text":"「年末年始の営業のお知らせ」12/31は18時まで、1/1はお休みです。","bg":"linear-gradient(135deg,#C1121F 0 30%,#FFF4E0 30% 100%)","t":"午前9:30 · 2026年11月17日"}};
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.twttr = { ready: function (f) { f(window.twttr); }, widgets: { createTweet: function (id, el, o) {
    var m = M[id]; if (!m) return Promise.resolve(undefined);
    var dark = o && o.theme === 'dark';
    var d = document.createElement('div');
    d.style.cssText = 'border:1px solid ' + (dark ? '#38444D' : '#CFD9DE') + ';border-radius:14px;background:' + (dark ? '#15202B' : '#fff') + ';padding:12px;font-family:system-ui,sans-serif;color:' + (dark ? '#F7F9F9' : '#0F1419') + ';text-align:left;margin:4px 0';
    d.innerHTML = '<div style="display:flex;gap:8px;align-items:center"><div style="width:38px;height:38px;border-radius:50%;background:#F2C14E;color:#1B1B1B;display:flex;align-items:center;justify-content:center;font-weight:800">見</div><div><div style="font-weight:700;font-size:15px">【見本】架空の本屋</div><div style="color:#536471;font-size:13px">@honmeguri_mihon</div></div><div style="margin-left:auto;font-weight:900;font-size:20px">𝕏</div></div>'
      + '<div style="font-size:15px;line-height:1.5;margin:8px 0">' + esc(m.text) + ' <span style="color:#1D9BF0">#本めぐり</span></div>'
      + '<div style="height:180px;border-radius:12px;background:' + m.bg + '"></div>'
      + '<div style="color:#536471;font-size:12.5px;margin-top:6px">' + esc(m.t) + ' · ♡ 24</div>'
      + '<div style="color:#C1121F;font-size:11px;font-weight:700;margin-top:4px">見本（テスト版のダミーデータ。本物の X の投稿ではありません）</div>';
    el.appendChild(d); return Promise.resolve(d);
  } } };
})();
