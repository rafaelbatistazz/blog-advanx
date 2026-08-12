/* Formulário comercial único do Blog Advanx.
   Centraliza captação, atribuição do artigo/UTM, aviso comercial e redirect ao WhatsApp oficial. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbG...sa10';
  var LEAD_ENDPOINT = SUPABASE_URL + '/rest/v1/dados_cliente';
  var NOTIFICATION_ENDPOINT = 'https://n8n.advfunnel.com.br/webhook/lead-funil-41d-comercial-efc4f106bbae40dcb0f4a2fc7bebe72c';
  var OFFICIAL_WHATSAPP = '5571981897865';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var UTM_STORAGE_KEY = 'advanx_blog_attribution_v1';

  function cleanText(value, max) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max || 300);
  }

  function currentArticle() {
    var canonical = document.querySelector('link[rel="canonical"]');
    var h1 = document.querySelector('h1');
    var title = cleanText(h1 ? h1.textContent : document.title.replace(/\s*\|\s*Blog Advanx\s*$/i, ''), 180);
    var url = canonical && canonical.href ? canonical.href : location.origin + location.pathname;
    var slug = location.pathname.indexOf('/posts/') === 0
      ? location.pathname.split('/').pop().replace(/\.html$/, '')
      : 'pagina-inicial-blog';
    return { title: title || 'Blog Advanx', url: url, slug: slug };
  }

  function attribution() {
    var query = new URLSearchParams(location.search);
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || '{}'); } catch (_) {}
    UTM_KEYS.forEach(function (key) {
      var value = cleanText(query.get(key), 300);
      if (value) saved[key] = value;
    });
    try { sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }

  function field(label, id, type, required, placeholder) {
    return '<label class="auf-field"><span>' + label + (required ? ' *' : '') + '</span>' +
      '<input id="' + id + '" type="' + type + '" ' + (required ? 'required ' : '') +
      'placeholder="' + placeholder + '" autocomplete="' + (type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'name') + '"></label>';
  }

  function installStyles() {
    var style = document.createElement('style');
    style.id = 'auf-styles';
    style.textContent =
      '#auf-overlay{display:none;position:fixed;inset:0;z-index:100000;background:rgba(13,13,18,.88);backdrop-filter:blur(10px);align-items:center;justify-content:center;padding:16px}' +
      '#auf-overlay.open{display:flex}.auf-box{background:#fff;border-radius:20px;padding:32px;width:min(500px,100%);position:relative;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif}' +
      '.auf-close{position:absolute;right:14px;top:12px;border:0;background:none;font-size:23px;color:#777;cursor:pointer}.auf-box h2{font-size:1.3rem;margin:0 32px 7px 0;color:#111}.auf-sub{margin:0 0 20px;color:#5b5b5b;font-size:.88rem;line-height:1.55}' +
      '.auf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.auf-field:first-child{grid-column:1/-1}.auf-field span{display:block;font-size:.77rem;font-weight:600;color:#5b5b5b;margin-bottom:5px}' +
      '.auf-field input{width:100%;padding:11px 13px;border:1.5px solid #d3cec6;border-radius:10px;font:inherit;color:#111;background:#f6f1e8;box-sizing:border-box}.auf-field input:focus{outline:none;border-color:#b56a32}' +
      '.auf-submit{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:#b56a32;color:#fff;font-weight:700;font-size:.95rem;cursor:pointer}.auf-submit[disabled]{opacity:.65;cursor:wait}' +
      '.auf-note{text-align:center;color:#8c8c8c;font-size:.73rem;margin:9px 0 0}.auf-error{display:none;margin-top:12px;padding:10px 12px;border:1px solid #fca5a5;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:.82rem}' +
      '.auf-inline{display:flex;justify-content:center;align-items:center;min-height:54px}.auf-open{border:0;border-radius:10px;background:#b56a32;color:#fff;padding:13px 20px;font:600 14px Inter,system-ui;cursor:pointer}' +
      '@media(max-width:560px){.auf-grid{grid-template-columns:1fr}.auf-field:first-child{grid-column:auto}.auf-box{padding:28px 20px}}';
    document.head.appendChild(style);
  }

  function installModal() {
    var old = document.getElementById('acm-overlay');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'auf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Fale com um especialista Advanx');
    overlay.innerHTML = '<div class="auf-box"><button class="auf-close" type="button" aria-label="Fechar">×</button>' +
      '<h2>Fale com um Especialista Advanx</h2><p class="auf-sub">Preencha seus dados. Depois do registro, você continuará a conversa no WhatsApp oficial da Advanx IA.</p>' +
      '<form id="auf-form"><div class="auf-grid">' +
      field('Nome completo', 'auf-name', 'text', true, 'Seu nome') +
      field('WhatsApp', 'auf-phone', 'tel', true, '(71) 99999-9999') +
      field('E-mail', 'auf-email', 'email', true, 'seu@email.com') +
      '</div><div id="auf-error" class="auf-error"></div><button id="auf-submit" class="auf-submit" type="submit">Quero conhecer as soluções →</button>' +
      '<p class="auf-note">Seus dados serão registrados com a origem deste artigo e suas UTMs.</p></form></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.auf-close').addEventListener('click', closeForm);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeForm(); });
    overlay.querySelector('#auf-phone').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 7) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
      else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
      else if (v) v = '(' + v;
      this.value = v;
    });
    overlay.querySelector('#auf-form').addEventListener('submit', submitLead);
  }

  function openForm(event) {
    if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
    var overlay = document.getElementById('auf-overlay');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('auf-name').focus(); }, 30);
  }

  function closeForm() {
    var overlay = document.getElementById('auf-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function replaceOtherForms() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form.id === 'auf-form') return;
      var holder = document.createElement('div');
      holder.className = 'auf-inline';
      holder.innerHTML = '<button type="button" class="auf-open">Falar com um Especialista Advanx</button>';
      holder.querySelector('button').addEventListener('click', openForm);
      form.replaceWith(holder);
    });
  }

  async function submitLead(event) {
    event.preventDefault();
    var name = cleanText(document.getElementById('auf-name').value, 120);
    var phone = document.getElementById('auf-phone').value.replace(/\D/g, '').slice(0, 13);
    var email = cleanText(document.getElementById('auf-email').value, 180).toLowerCase();
    var error = document.getElementById('auf-error');
    var button = document.getElementById('auf-submit');
    if (!name || phone.length < 10 || !/^\S+@\S+\.\S+$/.test(email)) {
      error.textContent = 'Preencha nome, WhatsApp e e-mail válidos.';
      error.style.display = 'block';
      return;
    }
    error.style.display = 'none';
    button.disabled = true;
    button.textContent = 'Registrando...';

    var article = currentArticle();
    var utm = attribution();
    var submissionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    var payload = {
      nome: name,
      telefone: phone,
      email: email,
      kanban_stage: 'Novo Lead',
      pipeline_type: 'inbound',
      funil_lead: 'Blog Advanx - Formulário único',
      empresa_fonte: 'Advanx',
      origem: utm.utm_source || 'blog',
      campanha: utm.utm_campaign || article.slug,
      conjunto: utm.utm_medium || 'organico',
      anuncio: utm.utm_content || article.title,
      posicionamento: utm.utm_term || article.url,
      utm_medium: utm.utm_medium || null,
      submission_id: submissionId,
      comentario: 'Artigo de origem: ' + article.title + ' | URL: ' + article.url + (utm.fbclid ? ' | fbclid: ' + utm.fbclid : '')
    };

    try {
      var response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Falha ao registrar o lead (' + response.status + ')');

      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: article.title, content_category: 'Blog Advanx' });
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { event_category: 'blog_unified_form', article_slug: article.slug });

      var notification = 'Novo lead do Blog Advanx\n\nNome: ' + name + '\nWhatsApp: ' + phone + '\nE-mail: ' + email + '\nArtigo: ' + article.title + '\nURL: ' + article.url;
      fetch(NOTIFICATION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem_formatada: notification }) }).catch(function () {});

      var message = 'Oi, me chamo ' + name + ', quero conhecer mais as soluções da Advanx IA, vim do artigo ' + article.title + ', pode me ajudar?';
      location.href = 'https://wa.me/' + OFFICIAL_WHATSAPP + '?text=' + encodeURIComponent(message);
    } catch (ex) {
      error.textContent = ex && ex.message ? ex.message + '. Tente novamente.' : 'Não foi possível registrar seus dados. Tente novamente.';
      error.style.display = 'block';
      button.disabled = false;
      button.textContent = 'Quero conhecer as soluções →';
    }
  }

  function bindUnifiedEntryPoints() {
    window.acmOpen = openForm;
    document.addEventListener('click', function (event) {
      var target = event.target.closest('a,button');
      if (!target) return;
      var href = target.getAttribute('href') || '';
      var onclick = target.getAttribute('onclick') || '';
      var text = cleanText(target.textContent, 100).toLowerCase();
      if (href.indexOf('wa.me/') !== -1 || href.indexOf('api.whatsapp.com/') !== -1 || /acmOpen|openModal/.test(onclick) || text.indexOf('falar com especialista') !== -1) {
        openForm(event);
      }
    }, true);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeForm(); });
  }

  function init() {
    attribution();
    installStyles();
    installModal();
    replaceOtherForms();
    bindUnifiedEntryPoints();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
