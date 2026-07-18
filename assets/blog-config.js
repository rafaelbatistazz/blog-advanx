/* Blog Advanx — config dinâmica (WhatsApp, redes sociais, pixels) + painel oculto.
   Painel: 3 cliques no rodapé ("Advanx Tecnologia") -> senha -> editar.
   ponytail: senha fixa client-side é só um gate de UI (qualquer um vê no código-fonte),
   não é autenticação real. Aceitável aqui porque nada salvo neste arquivo é secreto
   (WhatsApp/redes/IDs de pixel são todos públicos por natureza).
   ponytail: gatilho era a logo (<a href="/"><img>), mas preventDefault só rodava no
   3º clique — cliques 1/2 navegavam pra "/" antes do contador fechar. .footer-copy
   é um <p> sem href, não tem default a disputar. */
(function () {
  var SU = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
  var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYndmYnF1eGt1dGN5cWF6cG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Mjc5MTksImV4cCI6MjA2NjEwMzkxOX0.Tk6O2kpzTWcce9laIancu-lMFATLYkaTvgLBiRMsa10';
  var TABLE = SU + '/rest/v1/blog_config?id=eq.1';
  var PASSWORD = '2112';

  var FIELDS = [
    { key: 'whatsapp_number', label: 'Número WhatsApp (só dígitos, com DDI+DDD)', validate: function (v) { return /^\d{10,13}$/.test(v); } },
    { key: 'instagram_url', label: 'Instagram (URL)', validate: isHttpsUrl },
    { key: 'linkedin_url', label: 'LinkedIn (URL)', validate: isHttpsUrl },
    { key: 'youtube_url', label: 'YouTube (URL)', validate: isHttpsUrl },
    { key: 'facebook_url', label: 'Facebook (URL)', validate: isHttpsUrl },
    { key: 'tiktok_url', label: 'TikTok perfil (URL)', validate: isHttpsUrl },
    { key: 'google_ads_id', label: 'Google Ads ID (AW-XXXXXXXXX)', validate: function (v) { return v === '' || /^AW-\d{9,11}$/.test(v); } },
    { key: 'tiktok_pixel_id', label: 'TikTok Pixel ID', validate: function (v) { return v === '' || /^[A-Z0-9]{15,25}$/.test(v); } }
  ];

  function isHttpsUrl(v) {
    if (v === '') return true;
    try { var u = new URL(v); return u.protocol === 'https:'; } catch (e) { return false; }
  }

  function fetchConfig() {
    return fetch(TABLE, { headers: { apikey: SK, Authorization: 'Bearer ' + SK } })
      .then(function (r) { return r.json(); })
      .then(function (rows) { return rows[0] || {}; });
  }

  function applyConfig(cfg) {
    if (cfg.whatsapp_number) {
      document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
        a.href = 'https://wa.me/' + cfg.whatsapp_number;
      });
    }
    var map = { 'instagram.com': cfg.instagram_url, 'linkedin.com': cfg.linkedin_url, 'youtube.com': cfg.youtube_url };
    Object.keys(map).forEach(function (host) {
      if (!map[host]) return;
      document.querySelectorAll('a[href*="' + host + '"]').forEach(function (a) { a.href = map[host]; });
    });
    injectFooterLinkIfMissing('facebook.com', cfg.facebook_url, 'Facebook');
    injectFooterLinkIfMissing('tiktok.com', cfg.tiktok_url, 'TikTok');
    injectPixels(cfg);
  }

  function injectFooterLinkIfMissing(host, url, label) {
    if (!url) return;
    var footer = document.querySelector('.footer-links');
    if (!footer || footer.querySelector('a[href*="' + host + '"]')) return;
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = label;
    footer.appendChild(a);
  }

  function injectPixels(cfg) {
    if (cfg.google_ads_id && /^AW-\d{9,11}$/.test(cfg.google_ads_id) && !window.__adwordsLoaded) {
      window.__adwordsLoaded = true;
      var s1 = document.createElement('script');
      s1.async = true;
      s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.google_ads_id);
      document.head.appendChild(s1);
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', cfg.google_ads_id);
      window.gtag = gtag;
    }
    if (cfg.tiktok_pixel_id && /^[A-Z0-9]{15,25}$/.test(cfg.tiktok_pixel_id) && !window.ttq) {
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.load = function (e) {
          var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._t = ttq._t || {}; ttq._t[e] = +new Date;
          var o = d.createElement('script'); o.type = 'text/javascript'; o.async = true; o.src = i + '?sdkid=' + e + '&lib=' + t;
          var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
        };
        ttq.load(cfg.tiktok_pixel_id);
        ttq.page();
      })(window, document, 'ttq');
    }
  }

  function openPanel(cfg) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(17,17,17,.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:min(420px,92vw);max-height:86vh;overflow:auto;font-family:system-ui,sans-serif;';
    var title = document.createElement('h3');
    title.textContent = 'Configurações do blog';
    title.style.cssText = 'margin:0 0 16px;color:#111;';
    box.appendChild(title);

    var inputs = {};
    FIELDS.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.style.marginBottom = '12px';
      var label = document.createElement('label');
      label.textContent = f.label;
      label.style.cssText = 'display:block;font-size:12px;color:#5B5B5B;margin-bottom:4px;';
      var input = document.createElement('input');
      input.type = 'text';
      input.value = cfg[f.key] || '';
      input.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #D3CEC6;border-radius:8px;font-size:14px;';
      inputs[f.key] = input;
      wrap.appendChild(label);
      wrap.appendChild(input);
      box.appendChild(wrap);
    });

    var err = document.createElement('p');
    err.style.cssText = 'color:#c0392b;font-size:13px;min-height:16px;';
    box.appendChild(err);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid #D3CEC6;background:#fff;cursor:pointer;';
    cancelBtn.onclick = function () { overlay.remove(); };
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Salvar';
    saveBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:none;background:#B56A32;color:#fff;cursor:pointer;';
    saveBtn.onclick = function () {
      var payload = {};
      for (var i = 0; i < FIELDS.length; i++) {
        var f = FIELDS[i];
        var v = inputs[f.key].value.trim();
        if (!f.validate(v)) { err.textContent = 'Valor inválido em: ' + f.label; return; }
        payload[f.key] = v || null;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
      fetch(TABLE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SK, Authorization: 'Bearer ' + SK, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        overlay.remove();
        alert('Salvo. Atualize a página para ver as mudanças refletidas.');
      }).catch(function () {
        err.textContent = 'Falha ao salvar. Tente novamente.';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
      });
    };
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function setupTripleTap() {
    var trigger = document.querySelector('.footer-copy');
    if (!trigger) return;
    var clicks = 0, timer = null;
    trigger.addEventListener('click', function () {
      clicks++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { clicks = 0; }, 600);
      if (clicks >= 3) {
        clicks = 0;
        var pw = prompt('Senha:');
        if (pw !== PASSWORD) return;
        fetchConfig().then(openPanel);
      }
    });
  }

  fetchConfig().then(applyConfig).catch(function () {});
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTripleTap);
  } else {
    setupTripleTap();
  }
})();
