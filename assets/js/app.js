/* ============================================================
   AREA-372 · app.js  (build 372.1.0)
   shell + dynamic nav + level gating + page renderers
   ============================================================ */
'use strict';

(function () {
  const $ = AREA.$, $$ = AREA.$$, esc = AREA.esc, sleep = AREA.sleep, load = AREA.load;

  let SITE = null;
  let SESS = null;

  const LV = () => (SESS && SESS.clearance) || 0;
  /* 统一的查询参数入口：兼容多文件版（search）与单文件版（hash） */
  const QS = () => currentRoute().q;
  const can = lv => LV() >= (lv || 0);

  function lvLabel(lv) {
    const l = (SITE.levels || []).find(x => x.lv === lv);
    return l ? l.code : 'L-' + lv;
  }
  function lvFull(lv) {
    const l = (SITE.levels || []).find(x => x.lv === lv);
    return l ? l.code + ' ' + l.zh : 'L-' + lv;
  }
  /* 当前会话自身的等级显示：内部安全代理等特殊权限可自定义（如 L-█） */
  const ownLabel = () => (SESS && SESS.clearanceLabel) || lvLabel(LV());

  const LOCK_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="5" width="8" height="6"/><path d="M4 5V3.5a2 2 0 014 0V5"/></svg>';

  /* ---------- 路由（多页版用真实 URL，单文件版用 hash） ---------- */
  function currentRoute() {
    if (!window.__SINGLE__) {
      return { page: document.body.dataset.page, q: new URLSearchParams(location.search) };
    }
    const raw = (location.hash || '').replace(/^#\/?/, '');
    if (!raw) return { page: 'home', q: new URLSearchParams('') };
    const i = raw.indexOf('?');
    const path = (i >= 0 ? raw.slice(0, i) : raw).replace(/\.html$/, '');
    return { page: path || 'home', q: new URLSearchParams(i >= 0 ? raw.slice(i + 1) : '') };
  }

  /* ============================================================
     SHELL
     ============================================================ */
  function shell(sess, page) {
    SESS = sess;
    const accent = sess.accent || 'mono';
    const lv = LV();

    const nav = SITE.nav.filter(n => {
      if (n.id === 'search') return false;
      if (n.id === 'finale') return can(5);
      return true;
    });

    const navHtml = nav.map(n => {
      const locked = (n.lv || 0) > lv;
      return `<a class="nav-item ${n.id === page ? 'on' : ''} ${locked ? 'locked' : ''}" href="${n.href}">
        <span class="n">${esc(n.code)}</span>
        <span class="t">${esc(n.zh)}</span>
        <span class="e">${locked ? 'LOCKED' : esc(n.en)}</span>
      </a>`;
    }).join('');

    const tabs = (sess.tabs || []).slice(0, 5);
    const activeTabId = QS().get('id');
    const tabHtml = tabs.length
      ? '<div class="nav-sep"></div>' + tabs.map((t, i) => {
          const on = (page === 'tab' && activeTabId === t.id) ||
                     (page !== 'tab' && t.href.split('?')[0].replace('.html','') === page);
          return `<a class="nav-item nav-tab ${on ? 'on' : ''}" href="${t.href}">
            <span class="n">${esc(t.code || String(9 + i).padStart(2, '0'))}</span>
            <span class="t">${esc(t.zh)}</span>
            <span class="e">${esc(t.en)}</span>
          </a>`;
        }).join('')
      : '';

    const wiki = SITE.site.wiki;

    const side = document.createElement('aside');
    side.className = 'side';
    side.innerHTML = `
      <a class="side-brand" href="home.html">
        ${AREA.mark(36)}
        <span class="side-brand-t">
          <b>AREA-372</b>
          <span>Takal Underground</span>
        </span>
      </a>
      <nav class="side-nav">${navHtml}${tabHtml}</nav>
      <div class="side-foot">
        <a class="side-wiki" href="${esc(wiki.href)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M4.5 2H2v8h8V7.5"/><path d="M7 1h4v4"/><path d="M11 1L5.5 6.5"/></svg>
          ${esc(wiki.zh)}
        </a>
        <div class="tier"><span class="dot"></span>${esc(sess.displayEn || sess.display)}</div>
        <b>${esc(ownLabel())}</b> · ${esc(sess.deptEn || sess.dept)}<br>
        BUILD 372.1.0
      </div>`;
    document.body.appendChild(side);

    const PAGE_META = {
      home: ['00', 'TERMINAL', '终端主页'],
      overview: ['01', 'FACILITY', '设施概览'],
      scp: ['02', 'CONTAINMENT', '收容项目'],
      incidents: ['03', 'INCIDENTS', '事件档案'],
      daily: ['04', 'DAILY LOGS', '日常记录'],
      tuc: ['05', 'TASK FORCES', '特遣分队'],
      corruption: ['06', 'INTERNAL', '内部调查'],
      finale: ['07', 'THREAT', '威胁评估'],
      search: ['08', 'SEARCH', '档案检索'],
      'chat-isa': ['09', 'SECURE RELAY', '内部通讯'],
      'chat-director': ['09', 'DIRECTOR RELAY', '主管通讯'],
      'o5-panel': ['09', 'COUNCIL CONSOLE', '议会控制台'],
      'chief-egg': ['09', 'LOUD CHIEF', '安全主管大声说话'],
      tab: ['09', 'FACTION RELAY', '阵营档案']
    };
    const m = PAGE_META[page] || ['--', 'TERMINAL', '终端'];

    const top = document.createElement('header');
    top.className = 'top';
    top.innerHTML = `
      <button class="nav-toggle" id="navToggle" aria-label="menu">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M1 3h12M1 7h12M1 11h12"/></svg>
      </button>
      <div class="top-id">
        <span class="cr">${esc(m[0])}</span>
        <span class="tt">${esc(m[1])}</span>
        <span class="te">${esc(m[2])}</span>
      </div>
      <div class="top-spacer"></div>
      <a class="top-search" href="search.html">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>
        <span>档案检索</span>
      </a>
      <div class="top-user">
        <span class="u">${esc(sess.display)}</span>
        <span class="c">${esc(ownLabel())}</span>
        <span class="clear" id="logoutBtn" title="结束会话">✕</span>
      </div>`;
    document.body.appendChild(top);

    document.body.dataset.accent = accent;
    applyAccent(accent);

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.body.appendChild(backdrop);

    const toggle = $('#navToggle');
    if (toggle) toggle.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    const lg = $('#logoutBtn');
    if (lg) lg.addEventListener('click', () => {
      AREA.clearSession();
      if (window.__SINGLE__) { location.hash = '#index'; location.reload(); }
      else location.href = 'index.html';
    });

    mountCorners();
  }

  /* ============================================================
     左上角更新公告 / 右上角致谢名单
     ============================================================ */
  function mountCorners() {
    const mk = (cls, label, title, handler) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'corner-btn ' + cls;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.innerHTML = `<span class="cb-glyph">${esc(label)}</span>`;
      b.addEventListener('click', handler);
      document.body.appendChild(b);
      return b;
    };

    mk('corner-help', '?', '更新公告', async () => {
      try {
        const d = await load('notice');
        const n = d.announce;
        modal('更新公告 / UPDATE LOG', n.title, n.badge + ' · ' + n.subtitle, `
          <div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;
                      font-family:var(--f-mono);font-size:9px;letter-spacing:.2em;
                      color:var(--dim-2);margin-bottom:18px">
            <span style="color:var(--eng)">${esc(n.version)}</span>
            <span>${esc(n.date)}</span>
          </div>
          <p class="mtext" style="margin:0 0 24px">${md(n.lead)}</p>
          ${n.sections.map(sec => `
            <div class="mlabel">${esc(sec.h)}</div>
            <ul class="bullets">${sec.items.map(i => `<li>${md(i)}</li>`).join('')}</ul>
          `).join('')}
          <div class="note" style="margin-top:26px"><span class="lbl">说明</span>${esc(n.footer)}</div>
        `, 'var(--eng)');
      } catch (e) {
        modal('更新公告', '更新公告读取失败', '', `<div class="locked-note">${esc(e && e.message)}</div>`);
      }
    });

    mk('corner-credit', '谢', '致谢名单', async () => {
      try {
        const d = await load('notice');
        const c = d.credits;
        modal('致谢 / ACKNOWLEDGEMENTS', c.title, c.badge, `
          <p class="mtext" style="margin:0 0 20px">${esc(c.lead)}</p>
          ${c.body.map(t => `<p class="mtext" style="margin:0 0 .95em">${esc(t)}</p>`).join('')}
          <div class="note" style="margin-top:24px"><span class="lbl">说明</span>${esc(c.note)}</div>
        `, 'var(--adm)');
      } catch (e) {
        modal('致谢', '致谢名单读取失败', '', `<div class="locked-note">${esc(e && e.message)}</div>`);
      }
    });
  }

  function applyAccent(accent) {
    const map = {
      eng: 'var(--eng)', adm: 'var(--adm)', warn: 'var(--warn)',
      finale: 'var(--finale)', o5: 'var(--o5)', isa: 'var(--isa)',
      omega: 'var(--omega)', mono: 'var(--fg)'
    };
    document.documentElement.style.setProperty('--accent', map[accent] || 'var(--fg)');
  }

  /* ============================================================
     MODAL
     ============================================================ */
  function modal(kind, title, sub, bodyHtml, accent) {
    let m = $('#modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'modal'; m.className = 'modal';
      m.innerHTML = `<div class="modal-card" id="modalCard">
        <div class="modal-head">
          <div style="min-width:0">
            <div class="mh-k" id="modalKind"></div>
            <h3 id="modalTitle"></h3>
            <div class="mh-e" id="modalSub"></div>
          </div>
          <button class="modal-x" id="modalX">ESC ✕</button>
        </div>
        <div class="modal-body" id="modalBody"></div>
      </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m) closeModal(); });
      $('#modalX', m).addEventListener('click', closeModal);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    }
    $('#modalKind').textContent = kind || '';
    $('#modalTitle').textContent = title || '';
    $('#modalSub').textContent = sub || '';
    $('#modalBody').innerHTML = bodyHtml || '';
    const card = $('#modalCard');
    card.style.setProperty('--accent', accent || 'var(--accent)');
    m.classList.add('open');
    m.scrollTop = 0;
  }
  function closeModal() {
    const m = $('#modal');
    if (m) m.classList.remove('open');
  }

  function lockedModal(need) {
    modal('访问受限 / ACCESS RESTRICTED', '该档案需要更高许可等级', lvFull(need), `
      <div class="locked-note">
        本条档案的登记等级为 <b>${esc(lvFull(need))}</b>，当前会话为 <b>${esc(lvFull(LV()))}</b>。
        <br><br>
        档案目录本身是公开的——你可以看到它存在，也可以看到它被谁持有。
        但内容不在你的权限范围内。本次尝试已记录。
      </div>
    `, 'var(--warn)');
  }

  /* ============================================================
     PAGES
     ============================================================ */
  const PAGES = {};

  /* ---------- HOME ---------- */
  PAGES.home = async function () {
    const ov = await load('overview');
    const inc = await load('incidents');
    const scp = await load('scp');
    const S = SITE.site;

    const allScp = scp.groups.reduce((n, g) => n + g.items.length, 0);
    const alive = scp.groups
      .filter(g => g.id !== 'void' && g.id !== 'and')
      .reduce((n, g) => n + g.items.length, 0);
    const visibleInc = inc.items.filter(i => can(i.lv)).length;

    const posters = [
      ['assets/img/poster-facility.webp', '设施形象', 'FACILITY'],
      ['assets/img/poster-eng.webp', '工程部', 'ENGINEERING'],
      ['assets/img/poster-adm.webp', '行政部', 'ADMINISTRATIVE']
    ];

    $('#app').innerHTML = `
      <div class="wrap wide">
        <div class="hero">
          <div class="hero-ov">
            <div class="hk">FACILITY TERMINAL · TAKAL UNDERGROUND COMPLEX</div>
            <h1>AREA-372</h1>
            <div class="hc">美国内华达州 ████ 区域 · 塔卡尔矿洞群深层 · 建立于 195█ 年</div>
            <div class="hero-slogan">
              ${esc(S.slogan)}
              <em>${esc(S.sloganEn)}</em>
            </div>
            <div class="hs">
              <span>状态 <b>CRITICAL / 有限运作</b></span>
              <span>在押项目 <b>${alive}</b></span>
              <span>登记条目 <b>${allScp}</b></span>
              <span>事件可读 <b>${visibleInc}/${inc.items.length}</b></span>
            </div>
          </div>
        </div>

        <div class="strip">
          <div><div class="sv warn">临界</div><div class="sl">FACILITY STATUS</div></div>
          <div><div class="sv">${allScp}</div><div class="sl">CONTAINMENT ENTRIES</div></div>
          <div><div class="sv">${inc.timeline.length}</div><div class="sl">MAJOR INCIDENTS</div></div>
          <div><div class="sv eng">6</div><div class="sl">TASK FORCES</div></div>
        </div>

        <section class="sec">
          <div class="sec-h"><span class="no">01</span><h2>设施总述</h2><span class="en">Overview</span></div>
          <div class="prose">
            ${ov.lead.map(p => `<p>${esc(p)}</p>`).join('')}
            <p class="dim">${esc(ov.vein.warning)}</p>
          </div>
          <div class="note" style="margin-top:26px">
            <span class="lbl">档案原则</span>
            任何文件若与最新现场状态不一致，应先核对文件编制日期、修订记录与事件编号，而不是直接把其中一份认定为虚假。
          </div>
          <div style="margin-top:22px"><a class="btn" href="overview.html">进入设施概览 →</a></div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">02</span><h2>核心异常</h2><span class="en">Primary Anomaly</span></div>
          <div class="zone a-warn" style="cursor:default">
            <div class="zc">SCP-vein-572</div>
            <h3>异常矿脉网络</h3>
            <div class="ze">Anomalous Vein Network</div>
            <p>${esc(ov.vein.paras[0])}</p>
            <div class="zitems">
              <span class="chip">原地抑制</span>
              <span class="chip">局部现实偏移</span>
              <span class="chip">全球灾难级风险建模</span>
            </div>
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">03</span><h2>重大事件</h2><span class="en">Major Incidents</span></div>
          <div class="grid c2">
            ${inc.items.filter(i => ['EC-68G', 'K96-X'].indexOf(i.id) >= 0).map(i => {
              const locked = !can(i.lv);
              return `<a class="inc-card a-${i.accent} ${locked ? 'is-locked' : ''}"
                        href="${locked ? '#' : 'incidents.html?q=' + encodeURIComponent(i.id)}"
                        data-lock="${locked ? i.lv : ''}">
                <div class="top-row">
                  <span class="sev">${esc(i.level.split('／')[0])}</span>
                  <span class="code">${esc(i.code)}</span>
                </div>
                <h3>${esc(i.zh)}</h3>
                <div class="en">${esc(i.en)}</div>
                <div class="sum">${locked ? '本报告内容不在当前许可等级范围内。' : esc(i.summary)}</div>
                <div class="stats">
                  ${locked
                    ? `<span class="locktag">${LOCK_SVG} 需 ${esc(lvLabel(i.lv))}</span>`
                    : `<span>死亡 <b class="dl-b">${i.casualties.dead}</b></span>
                       <span>受伤 <b>${i.casualties.injured}</b></span>
                       <span>重伤 <b>${i.casualties.critical}</b></span>`}
                </div>
              </a>`;
            }).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">04</span><h2>部门形象</h2><span class="en">Department Posters</span></div>
          <div class="poster-grid">
            ${posters.map(p => `
              <div class="poster" data-poster="${p[0]}" data-name="${esc(p[1])}">
                <img src="${p[0]}" alt="${esc(p[1])}" loading="lazy">
                <div class="pcap"><b>${esc(p[1])}</b><span>${esc(p[2])}</span></div>
              </div>`).join('')}
          </div>
          <div class="note warn" style="margin-top:22px">
            <span class="lbl">宣传栏 · 内容复核</span>
            设施宣传材料载明「Absolutely no containment breaches」「The lowest D-Class turnover rate」「The best work-life balance」。
            以上表述与 EC-68G、K96-X 及人员自然损耗记录所载事实不符，应作为宣传口径而非事实陈述引用。
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">05</span><h2>接入索引</h2><span class="en">Access Index</span></div>
          <ul class="linklist">
            ${SITE.nav.filter(n => n.id !== 'search' && n.id !== 'home')
              .filter(n => n.id !== 'finale' || can(5))
              .map(n => {
                const locked = (n.lv || 0) > LV();
                return `<li><a href="${n.href}">
                  <span class="no">${esc(n.code)}</span>
                  <span class="tx">${esc(n.zh)}</span>
                  <span class="ex">${locked ? '需 ' + esc(lvLabel(n.lv)) : esc(n.en)}</span>
                </a></li>`;
              }).join('')}
            ${(SESS.tabs || []).map((t, i) => `<li><a href="${t.href}">
                  <span class="no">${esc(t.code || String(9 + i).padStart(2, '0'))}</span>
                  <span class="tx">${esc(t.zh)}</span>
                  <span class="ex">${esc(t.en)}</span>
                </a></li>`).join('')}
          </ul>
        </section>

        ${footer()}
      </div>`;

    $$('.poster').forEach(p => {
      p.addEventListener('click', () => {
        modal('部门形象 / POSTER', p.dataset.name, '', `
          <img src="${p.dataset.poster}" alt="" style="width:100%;border:1px solid var(--line);margin-bottom:18px">
          <p class="sm dim">AREA-372 内部宣传材料。宣传口径与事故记录不一致，引用时须注明来源为宣传栏，不得作为设施可靠性证据。</p>
        `);
      });
    });

    $$('[data-lock]').forEach(el => {
      if (!el.dataset.lock) return;
      el.addEventListener('click', e => {
        e.preventDefault();
        lockedModal(parseInt(el.dataset.lock, 10));
      });
    });
  };

  /* ---------- OVERVIEW ---------- */
  PAGES.overview = async function () {
    const ov = await load('overview');
    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> FACILITY <i>/</i> 设施概览</div>
          <h1>塔卡尔地下综合区域</h1>
          <div class="h1-cn">Takal Underground Complex · 设施总档案</div>
          <p class="lead">${esc(ov.lead[0])}</p>
          <div class="phead-bar"></div>
        </div>

        <section class="sec">
          <div class="sec-h"><span class="no">01</span><h2>基础信息</h2><span class="en">Basic Data</span></div>
          <dl class="dl">
            ${ov.basic.map(b => `<div class="dl-row">
                <dt><b>${esc(b.k)}</b>${esc(b.ke)}</dt><dd>${esc(b.v)}</dd></div>`).join('')}
          </dl>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">02</span><h2>设施性质</h2><span class="en">Nature</span></div>
          <div class="prose">${ov.lead.map(p => `<p>${esc(p)}</p>`).join('')}</div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">03</span><h2>核心异常</h2><span class="en">SCP-vein-572</span></div>
          <div class="prose">${ov.vein.paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="note warn"><span class="lbl">收容判据</span>${esc(ov.vein.warning)}</div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">04</span><h2>历史沿革</h2><span class="en">Chronology</span></div>
          ${ov.history.map(h => `
            <div class="era">
              <div class="yr">${esc(h.era)}</div>
              <h3>${esc(h.zh)}</h3>
              <div class="en">${esc(h.en)}</div>
              <p>${esc(h.text)}</p>
            </div>`).join('')}
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">05</span><h2>设施分区</h2><span class="en">Zones</span></div>
          <div class="grid c2">
            ${ov.zones.map(z => `<div class="zone a-${z.accent}">
                <div class="zc">${esc(z.code)}</div>
                <h3>${esc(z.zh)}</h3>
                <div class="ze">${esc(z.en)}</div>
                <p>${esc(z.desc)}</p>
                <div class="zitems">${z.items.map(i => `<span class="chip">${esc(i)}</span>`).join('')}</div>
              </div>`).join('')}
          </div>
          <div class="note" style="margin-top:24px">
            <span class="lbl">${esc(ov.notAbca.en)}</span>${esc(ov.notAbca.text)}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">06</span><h2>管理要求</h2><span class="en">Standing Orders</span></div>
          <ol class="linklist">
            ${ov.principles.map((p, i) => `<li style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--line-soft)">
              <span class="code dim2" style="font-size:10px;flex:0 0 24px">0${i + 1}</span>
              <span class="mid" style="color:var(--fg-soft)">${esc(p)}</span></li>`).join('')}
          </ol>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">07</span><h2>支援体系</h2><span class="en">Task Force System</span></div>
          <div class="note"><span class="lbl">编制说明</span>${esc(ov.facilityTeamNote)}</div>
          <div style="margin-top:20px"><a class="btn" href="tuc.html">查看 TUC 分队档案 →</a></div>
        </section>

        ${footer()}
      </div>`;
  };

  /* ---------- SCP ---------- */
  PAGES.scp = async function () {
    const d = await load('scp');
    const q = currentRoute().q.get('q');

    const all = [];
    d.groups.forEach(g => g.items.forEach(it => all.push(Object.assign({ _g: g }, it))));
    const visCount = all.filter(i => can(i.lv)).length;

    $('#app').innerHTML = `
      <div class="wrap wide">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> CONTAINMENT <i>/</i> 收容项目</div>
          <h1>收容项目规划表</h1>
          <div class="h1-cn">Containment Registry · 修订版</div>
          <p class="lead">${esc(d.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note" style="margin-bottom:24px">
          <span class="lbl">可见范围</span>
          登记条目共 ${all.length} 条，当前许可等级（${esc(ownLabel())}）可读取其中
          <b style="color:var(--fg)">${visCount}</b> 条详情。
          其余条目仍会显示编号与分区，但收容措施不对本会话开放。
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px" id="filterBar">
          <button class="chip on" data-g="all">全部 ${all.length}</button>
          ${d.groups.map(g => `<button class="chip" data-g="${g.id}">${esc(g.zh)} ${g.items.length}</button>`).join('')}
        </div>

        <div id="scpGrid" class="grid auto">
          ${all.map(it => {
            const locked = !can(it.lv);
            const cls = (it.cls || '').toLowerCase();
            const clsKey = cls.indexOf('keter') >= 0 ? 'keter' : cls.indexOf('euclid') >= 0 ? 'euclid'
              : cls.indexOf('safe') >= 0 ? 'safe' : (cls.indexOf('无效') >= 0 ? 'void' : '');
            return `<button class="scp-card a-${it._g.accent} ${locked ? 'is-locked' : ''}"
                      data-id="${esc(it.id)}" data-group="${esc(it._g.id)}" data-lock="${locked ? it.lv : ''}">
              <div class="row1">
                <span class="sid">${esc(it.id)}</span>
                <span class="cls ${clsKey}">${esc(it.cls)}</span>
              </div>
              <div class="nm">${esc(it.zh)}</div>
              <div class="nm-en">${esc(it.en)}</div>
              <div class="meas">${locked ? '收容措施不在当前许可等级范围内。' : esc(it.measure)}</div>
              ${locked ? `<div style="margin-top:10px"><span class="locktag">${LOCK_SVG} 需 ${esc(lvLabel(it.lv))}</span></div>` : ''}
            </button>`;
          }).join('')}
        </div>

        ${footer()}
      </div>`;

    function open(id) {
      const it = all.find(x => x.id === id);
      if (!it) return;
      if (!can(it.lv)) return lockedModal(it.lv);
      modal('收容项目 / ' + it._g.zh, it.id + ' · ' + it.zh, it.en + ' · ' + it.cls, `
        <div class="mlabel">分区 / Zone</div>
        <div class="mtext">${esc(it._g.zh)} <span class="dim2">/ ${esc(it._g.en)}</span></div>
        <div class="mlabel">收容措施 / Containment Procedures</div>
        <div class="mtext">${esc(it.measure)}</div>
        <div class="mlabel">风险要点 / Risk Notes</div>
        <div class="mtext">${esc(it.risk)}</div>
        ${it.note ? `<div class="mlabel">本站备注 / Site Note</div><div class="mtext">${esc(it.note)}</div>` : ''}
        ${it.logs && it.logs.length ? `
          <div class="mlabel">关联记录 / Cross References</div>
          <div class="mtext">${it.logs.map(l => `<span class="chip" style="margin:0 6px 6px 0;display:inline-block">${esc(l)}</span>`).join('')}</div>` : ''}
        <div class="note" style="margin-top:24px"><span class="lbl">引用约束</span>
          本条目为设施职能规划摘要，不替代该项目的正式收容文件。具体措施以项目专属规程为准。
        </div>
      `, 'var(--' + it._g.accent + ')');
    }

    $$('.scp-card').forEach(c => c.addEventListener('click', () => open(c.dataset.id)));

    $$('#filterBar .chip').forEach(b => {
      b.addEventListener('click', () => {
        $$('#filterBar .chip').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const g = b.dataset.g;
        $$('.scp-card').forEach(c => {
          c.style.display = (g === 'all' || c.dataset.group === g) ? '' : 'none';
        });
      });
    });

    if (q) {
      const hit = all.find(x => x.id.toLowerCase() === q.toLowerCase());
      if (hit) setTimeout(() => open(hit.id), 260);
    }
  };

  /* ---------- INCIDENTS ---------- */
  PAGES.incidents = async function () {
    const d = await load('incidents');
    const q = currentRoute().q.get('q');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> INCIDENTS <i>/</i> 事件档案</div>
          <h1>重大事件记录</h1>
          <div class="h1-cn">Incident Archive · 时间线</div>
          <p class="lead">各事故的确切日期及部分记录被遮蔽。顺序依据报告之间的交叉引用关系推定。</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note warn" style="margin-bottom:40px">
          <span class="lbl">时间线声明</span>${esc(d.disclaimer)}
        </div>

        <div class="tl">
          ${d.timeline.map(t => {
            const it = d.items.find(x => x.id === t.id) || {};
            const locked = it.lv != null && !can(it.lv);
            return `<div class="tl-item a-${t.accent} ${locked ? 'is-locked' : ''}" data-id="${esc(t.id)}" data-lock="${locked ? it.lv : ''}">
              <div class="tl-yr">${esc(t.year)}</div>
              <div class="tl-body">
                <div class="tl-no">NO.${esc(t.no)} · SEV-${esc(t.sev)}</div>
                <h3>${esc(t.zh)}</h3>
                <div class="tl-tag">${esc(t.en)} · ${esc(t.tag)}</div>
                ${locked
                  ? `<div style="margin-top:10px"><span class="locktag">${LOCK_SVG} 需 ${esc(lvLabel(it.lv))}</span></div>`
                  : `<a class="tl-cta" href="#${esc(t.id)}">查阅报告 →</a>`}
              </div>
            </div>`;
          }).join('')}
        </div>

        <hr class="rule" style="margin:48px 0">

        <div class="grid" style="gap:18px">
          ${d.items.map(i => {
            const locked = !can(i.lv);
            return `<div class="inc-card a-${i.accent} ${locked ? 'is-locked' : ''}" data-id="${esc(i.id)}" data-lock="${locked ? i.lv : ''}">
              <div class="top-row">
                <span class="sev">${esc(i.level.split('／')[0])}</span>
                <span class="code">${esc(i.code)}</span>
              </div>
              <h3>${esc(i.zh)}</h3>
              <div class="en">${esc(i.en)}</div>
              <div class="sum">${locked ? '本报告内容不在当前许可等级范围内。' : esc(i.summary)}</div>
              <div class="stats">
                ${locked
                  ? `<span class="locktag">${LOCK_SVG} 需 ${esc(lvLabel(i.lv))}</span>`
                  : `<span>死亡 <b class="dl-b">${i.casualties.dead}</b></span>
                     <span>受伤 <b>${i.casualties.injured}</b></span>
                     <span>重伤 <b>${i.casualties.critical}</b></span>
                     <span style="margin-left:auto">${esc(i.clearance)}</span>`}
              </div>
            </div>`;
          }).join('')}
        </div>

        ${footer()}
      </div>`;

    function open(id) {
      const it = d.items.find(x => x.id === id);
      if (!it) return;
      if (!can(it.lv)) return lockedModal(it.lv);
      const full = can(it.lvFull);
      const acc = 'var(--' + it.accent + ')';

      const tlHtml = full ? `
        <div class="mlabel">时间线 / Timeline</div>
        <div class="tl-mini">
          ${it.timeline.map(t => `<div class="tm"><b>${esc(t.t)}</b><p>${esc(t.x)}</p></div>`).join('')}
        </div>
        <div class="mlabel">原因分析 / Cause Analysis</div>
        <ul class="bullets">${it.cause.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        <div class="mlabel">结论 / Outcome</div>
        <div class="mtext">${esc(it.outcome)}</div>
        ${it.unresolved ? `<div class="mlabel">未解问题 / Unresolved</div>
          <ul class="bullets">${it.unresolved.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ` : `
        <div class="locked-note" style="margin-top:26px">
          <b>时间线、原因分析与结论</b> 需 <b>${esc(lvFull(it.lvFull))}</b>。
          当前会话（${esc(lvFull(LV()))}）仅可读取摘要与伤亡统计。
        </div>
      `;

      const glitchClass = (it.id === 'K96-X' || it.id === 'EC-68G') ? 'glitch-zone' : '';
      const glitchTag = it.id === 'K96-X' ? '⚠ 本段记录存在时间断层 · 回放可能不连续'
        : it.id === 'EC-68G' ? '⚠ 本段记录来自多个不同时钟源 · 时间戳可能不一致' : '';

      modal('事件报告 / ' + it.level, it.zh, it.code + ' · ' + it.en, `
        <div class="stat-row">
          <div><div class="sv dead">${it.casualties.dead}</div><div class="sl">死亡 / DEAD</div></div>
          <div><div class="sv">${it.casualties.injured}</div><div class="sl">受伤 / INJURED</div></div>
          <div><div class="sv">${it.casualties.critical}</div><div class="sl">重伤 / CRITICAL</div></div>
        </div>

        <div class="mlabel">事项 / Metadata</div>
        <dl class="kv">
          <dt>日期</dt><dd>${esc(it.date)}</dd>
          <dt>密级</dt><dd>${esc(it.clearance)}</dd>
          <dt>撰写</dt><dd>${esc(it.dept)}</dd>
          <dt>区域</dt><dd>${it.zones.map(esc).join(' · ')}</dd>
          <dt>涉及项目</dt><dd>${it.projects.map(esc).join(' · ')}</dd>
          <dt>参与单位</dt><dd>${it.units.map(esc).join(' · ')}</dd>
          <dt>记录状态</dt><dd>${esc(it.record)}</dd>
        </dl>

        <div class="mlabel">摘要 / Summary</div>
        <div class="mtext">${esc(it.summary)}</div>

        ${full ? `<div class="${glitchClass}">
          <div class="gz-tag">${esc(glitchTag)}</div>
          ${tlHtml}
        </div>` : tlHtml}

        <div class="note warn" style="margin-top:26px"><span class="lbl">引用约束</span>${esc(it.warning)}</div>
      `, acc);

      if (full && it.id === 'K96-X') {
        setTimeout(() => AREA.jitter($('#modalBody .tl-mini'), 2), 700);
      }
    }

    $$('.tl-item, .inc-card').forEach(c => {
      c.addEventListener('click', e => {
        if (e.target.tagName === 'A') e.preventDefault();
        if (c.dataset.lock) return lockedModal(parseInt(c.dataset.lock, 10));
        open(c.dataset.id);
      });
    });

    if (q) setTimeout(() => open(q), 280);
  };

  /* ---------- DAILY ---------- */
  PAGES.daily = async function () {
    const d = await load('daily');
    const vis = d.items.filter(i => can(i.lv)).length;

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> DAILY <i>/</i> 日常记录</div>
          <h1>日常事件记录</h1>
          <div class="h1-cn">Daily Incident Logs · DLY 系列</div>
          <p class="lead">${esc(d.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="sec-h"><span class="no">${vis}/${d.items.length}</span><h2>登记条目</h2><span class="en">Registered Entries</span></div>
        <div>
          ${d.items.map(it => {
            const locked = !can(it.lv);
            return `<div class="log-row a-${it.accent} ${locked ? 'is-locked' : ''}" data-id="${esc(it.id)}" data-lock="${locked ? it.lv : ''}">
              <div class="lid">${esc(it.id)}</div>
              <div>
                <div class="lt">${esc(it.zh)}</div>
                <div class="lz">${locked ? '详情需 ' + esc(lvLabel(it.lv)) : esc(it.en) + ' · ' + esc(it.zone)}</div>
              </div>
              <div class="lg">${locked ? 'LOCKED' : esc(it.grade)}</div>
            </div>`;
          }).join('')}
        </div>

        ${footer()}
      </div>`;

    function open(id) {
      const it = d.items.find(x => x.id === id);
      if (!it) return;
      if (!can(it.lv)) return lockedModal(it.lv);
      modal('日常记录 / ' + it.grade, it.zh, it.id + ' · ' + it.en, `
        <dl class="kv">
          <dt>登记等级</dt><dd>${esc(it.grade)}</dd>
          <dt>涉及区域</dt><dd>${esc(it.zone)}</dd>
          <dt>涉及项目</dt><dd>${esc(it.project)}</dd>
          <dt>报告部门</dt><dd>${esc(it.dept)}</dd>
        </dl>
        <div class="mlabel">事件摘要 / Summary</div>
        <div class="mtext">${esc(it.summary)}</div>
        <div class="mlabel">已确认 / Confirmed</div>
        <ul class="bullets">${it.confirmed.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        ${it.unknown.length ? `<div class="mlabel">未知事项 / Unknown</div>
          <ul class="bullets">${it.unknown.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        <div class="mlabel">处置与整改 / Action</div>
        <div class="mtext">${esc(it.action)}</div>
        <div class="note" style="margin-top:24px"><span class="lbl">结论</span>${esc(it.verdict)}</div>
      `, 'var(--' + it.accent + ')');
    }

    $$('.log-row').forEach(r => r.addEventListener('click', () => {
      if (r.dataset.lock) return lockedModal(parseInt(r.dataset.lock, 10));
      open(r.dataset.id);
    }));
  };

  /* ---------- TUC ---------- */
  PAGES.tuc = async function () {
    const d = await load('tuc');
    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> TASK FORCES <i>/</i> 特遣分队</div>
          <h1>TUC 系列分队档案</h1>
          <div class="h1-cn">Special Task Force Registry</div>
          <p class="lead">${esc(d.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="grid" style="gap:18px">
          ${d.items.map(t => `<div class="tuc a-${t.accent}" data-id="${esc(t.id)}">
              <div class="tid">
                <b>${esc(t.id)}</b>
                <span class="cn">「${esc(t.zh)}」</span>
                <span class="en">${esc(t.en)}</span>
              </div>
              <div class="meta">
                <span>驻地 <b>${esc(t.station)}</b></span>
                <span>编制 <b>${t.crew.reduce((n, c) => n + c.n, 0)} 人</b></span>
                <span>状态 <b>${esc(t.state)}</b></span>
              </div>
              <p>${esc(t.duty)}</p>
            </div>`).join('')}
        </div>

        ${footer()}
      </div>`;

    function open(id) {
      const it = d.items.find(x => x.id === id);
      if (!it) return;
      const full = can(it.lvFull);
      modal('特遣分队 / ' + it.post, it.id + ' 「' + it.zh + '」', it.en, `
        <dl class="kv">
          <dt>驻地</dt><dd>${esc(it.station)}</dd>
          <dt>状态</dt><dd>${esc(it.state)}</dd>
          <dt>总编制</dt><dd>${it.crew.reduce((n, c) => n + c.n, 0)} 人</dd>
        </dl>
        <div class="mlabel">组建目的 / Mandate</div>
        <div class="mtext">${esc(it.duty)}</div>
        <div class="mlabel">职责边界 / Limits</div>
        <div class="mtext">${esc(it.limit)}</div>
        ${it.metric ? `<div class="mlabel">能力记录 / Performance Record</div><div class="mtext">${esc(it.metric)}</div>` : ''}
        ${full ? `
          <div class="mlabel">人员编制 / Personnel</div>
          <div class="crew">${it.crew.map(c => `<div><span>${esc(c.role)}</span><b>${c.n}</b></div>`).join('')}</div>
          <div class="mlabel">行动原则 / Operating Principles</div>
          <ul class="bullets">${it.principles.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        ` : `<div class="locked-note" style="margin-top:24px">
          人员编制与行动原则需 <b>${esc(lvFull(it.lvFull))}</b>。当前会话仅可读取对外编制说明。
        </div>`}
        ${it.motto ? `<div class="mlabel">口号 / Motto</div>
          <div class="mtext" style="font-size:15px;color:var(--accent)">「${esc(it.motto)}」</div>` : ''}
        ${it.mottoNote ? `<div class="note" style="margin-top:20px"><span class="lbl">附注</span>${esc(it.mottoNote)}</div>` : ''}
        ${it.logs.length ? `<div class="mlabel">关联事件 / Cross References</div>
          <div class="mtext">${it.logs.map(l => `<span class="chip" style="margin:0 6px 6px 0;display:inline-block">${esc(l)}</span>`).join('')}</div>` : ''}
      `, 'var(--' + it.accent + ')');
    }

    $$('.tuc').forEach(c => c.addEventListener('click', () => open(c.dataset.id)));
  };

  /* ---------- GATE ---------- */
  function gate(opt) {
    return `
      <div class="wrap">
        <div class="gate">
          <div class="gk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="4" y="10" width="16" height="11"/><path d="M8 10V7a4 4 0 018 0v3"/>
            </svg>
          </div>
          <h2>${esc(opt.title)}</h2>
          <div class="gcn">${esc(opt.cn)}</div>
          <p>${esc(opt.msg)}</p>
          <div class="gmeta">
            <div>卷宗 <b>${esc(opt.file)}</b></div>
            <div>当前会话 <b>${esc(SESS.display)} · ${esc(ownLabel())}</b></div>
            <div>需要 <b>${esc(opt.need || '—')}</b></div>
            <div>判定 <b style="color:var(--warn)">ACCESS DENIED</b></div>
            <div>审计记录 <b>已写入</b></div>
          </div>
          ${opt.extra ? `<div class="note warn" style="margin-top:24px;text-align:left">${opt.extra}</div>` : ''}
        </div>
        ${footer()}
      </div>`;
  }

  /* ---------- CORRUPTION ---------- */
  PAGES.corruption = async function () {
    const d = await load('corruption');
    if (!can(5)) {
      const isTarget = !SESS.grant && (SESS.id === 'director' || SESS.id === 'security');
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED',
        cn: '无权查看《贪腐调查卷（Omega-1 证据包）》',
        msg: isTarget ? d.deniedNote
          : '本卷宗仅向 Omega-1「律法左手」调查人员、内部安全代理及 5 级授权人员开放。当前会话不满足任一条件。',
        file: d.fileNo,
        need: lvFull(5),
        extra: isTarget ? '依据权限隔离要求：任何调查对象不得自行筛选与自己有关的原始记录、审核自己的电子签名、批准相关员工的处分或决定本案结案。' : ''
      });
      applyAccent('warn');
      return;
    }

    applyAccent(SESS.accent === 'o5' ? 'o5' : (SESS.accent === 'isa' ? 'isa' : 'omega'));

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> INTERNAL <i>/</i> Omega-1</div>
          <h1>贪腐调查卷 · Omega-1 证据包</h1>
          <div class="h1-cn">${esc(d.fileNo)}</div>
          <p class="lead">${esc(d.classification)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note warn"><span class="lbl">呈交声明</span>${esc(d.statement)}</div>

        <section class="sec" style="margin-top:34px">
          <div class="sec-h"><span class="no">00</span><h2>核心请求</h2><span class="en">Request</span></div>
          <ul class="bullets" style="font-size:13.5px">${d.request.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          <dl class="kv" style="margin-top:22px">
            <dt>呈交人</dt><dd>${esc(d.submittedBy)}</dd>
            <dt>签署状态</dt><dd>${esc(d.signature)}</dd>
          </dl>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">01</span><h2>调查对象</h2><span class="en">Subjects</span></div>
          <div class="grid c2">
            ${d.targets.map(t => `<div class="zone a-warn" style="cursor:default">
                <div class="zc">${esc(t.code)}</div>
                <h3>${esc(t.role)}</h3>
                <p>${esc(t.detail)}</p></div>`).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">02</span><h2>七组异常</h2><span class="en">Findings</span></div>
          <div class="grid" style="gap:16px">
            ${d.groups.map(g => `<div class="zone a-${g.accent}" style="cursor:default">
                <div class="zc">${esc(g.no)} · ${esc(g.code)}</div>
                <h3 style="font-size:14.5px;line-height:1.6">${esc(g.zh)}</h3>
                <p>${esc(g.body)}</p>
                <ul class="bullets" style="margin-top:12px">${g.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
                <div class="note" style="margin:16px 0 0;padding:11px 16px;font-size:11.5px">
                  <span class="lbl" style="font-size:8.5px">边界 / 证据限制</span>${esc(g.boundary)}</div>
              </div>`).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">03</span><h2>证据汇编 O1-A ~ O1-G</h2><span class="en">Evidence Set</span></div>
          <div style="margin-bottom:18px;display:flex;gap:8px;flex-wrap:wrap">
            ${d.evidenceLevels.map(l => `<span class="chip" style="cursor:default">${esc(l.code)} — ${esc(l.zh)}</span>`).join('')}
          </div>
          <div class="grid" style="gap:14px">
            ${d.evidence.map(e => `<div class="zone a-omega" style="cursor:pointer" data-ev="${esc(e.code)}">
                <div class="zc">${esc(e.code)}${e.level && e.level !== '—' ? ' · ' + esc(e.level) : ''}</div>
                <h3 style="font-size:14px">${esc(e.zh)}</h3>
                <div class="ze">${esc(e.en)}</div>
                <p>${esc(e.summary)}</p>
                <div class="zitems"><span class="chip">${esc(e.fileNo)}</span></div></div>`).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">04</span><h2>附件目录 A ~ L</h2><span class="en">Attachments</span></div>
          <div class="grid c2">
            ${d.attachments.map(a => `<div style="border-bottom:1px solid var(--line-soft);padding:12px 0;display:flex;gap:14px">
                <span class="code" style="color:var(--accent);flex:0 0 20px;font-size:11px">${esc(a.code)}</span>
                <span><span class="mid" style="color:var(--fg-soft);display:block">${esc(a.zh)}</span>
                <span class="sm dim2" style="display:block;margin-top:4px;line-height:1.75">${esc(a.desc)}</span></span>
              </div>`).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">05</span><h2>关联卷宗</h2><span class="en">Related Files</span></div>
          <div class="grid" style="gap:16px">
            ${d.related.map(r => `<div class="zone a-${r.accent}" style="cursor:pointer" data-rel="${esc(r.fileNo)}">
                <div class="zc">${esc(r.fileNo)}</div>
                <h3 style="font-size:14px;line-height:1.6">${esc(r.zh)}</h3>
                <p>${esc(r.summary)}</p>
                <div class="zitems"><span class="chip">${esc(r.status)}</span></div></div>`).join('')}
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">06</span><h2>证据处理原则</h2><span class="en">Chain of Custody</span></div>
          <ul class="bullets">${d.principles.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </section>

        <div class="note" style="margin-top:8px"><span class="lbl">呈交人结语</span>${esc(d.finalWord)}</div>

        ${footer()}
      </div>`;

    $$('[data-ev]').forEach(el => {
      el.addEventListener('click', () => {
        const e = d.evidence.find(x => x.code === el.dataset.ev);
        if (!e) return;
        modal('证据 / ' + e.code, e.zh, e.fileNo + (e.level && e.level !== '—' ? ' · ' + e.level : ''), `
          <div class="mlabel">摘要 / Summary</div><div class="mtext">${esc(e.summary)}</div>
          <div class="mlabel">明细 / Detail</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          ${e.status ? `<div class="mlabel">状态 / Status</div><div class="mtext">${esc(e.status)}</div>` : ''}
        `, 'var(--omega)');
      });
    });

    $$('[data-rel]').forEach(el => {
      el.addEventListener('click', () => {
        const r = d.related.find(x => x.fileNo === el.dataset.rel);
        if (!r) return;
        modal('关联卷宗 / RELATED', r.zh, r.fileNo, `
          <div class="mlabel">摘要 / Summary</div><div class="mtext">${esc(r.summary)}</div>
          <div class="mlabel">要点 / Key Points</div>
          <ul class="bullets">${r.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          <div class="mlabel">状态 / Status</div><div class="mtext">${esc(r.status)}</div>
        `, 'var(--' + r.accent + ')');
        setTimeout(() => AREA.jitter($('#modalBody .mtext'), 2), 500);
      });
    });
  };

  /* ---------- FINALE ---------- */
  PAGES.finale = async function () {
    const d = await load('finale');
    if (!can(5)) {
      $('#app').innerHTML = gate({
        title: 'NO PERMISSION',
        cn: '无权限访问《威胁评估档案》',
        msg: '该卷宗不属于当前会话的权限范围。威胁评估档案仅向 5 级以上授权开放，其中内部章节仅对未登记权限开放。',
        file: d.fileNo,
        need: lvFull(5),
        extra: '该访问尝试已记录。若你持有有效授权，请重新核验身份凭证。'
      });
      applyAccent('finale');
      return;
    }

    const isFull = can(6);
    applyAccent('finale');
    document.body.classList.add('finale-mode');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">THREAT ASSESSMENT <i>/</i> PROJECT FINAL DAWN</div>
          <h1>威胁评估 · 终幕计划</h1>
          <div class="h1-cn">Project Final Dawn（标志标注 Finale Plan）</div>
          <p class="lead">${esc(d.headerNote)}</p>
          <div class="phead-bar"></div>
        </div>

        <div style="display:flex;align-items:center;gap:24px;border:1px solid var(--line);padding:22px 24px;margin-bottom:32px;background:rgba(191,31,44,.035);flex-wrap:wrap">
          <figure style="margin:0;flex:0 0 auto;width:230px">
            <img src="${esc(d.emblem.brand)}" alt="Finale Plan" style="width:100%;display:block;border:1px solid #2c2c32">
            <figcaption class="tiny dim2" style="margin-top:7px;letter-spacing:.14em">证据附件 · 白底印刷件扫描</figcaption>
          </figure>
          <div style="min-width:0;flex:1">
            <div class="code" style="font-size:10px;letter-spacing:.2em;color:var(--finale);margin-bottom:10px">THREAT LEVEL · ${esc(d.threat.level)}</div>
            <div class="disp" style="font-size:20px;letter-spacing:.1em">${esc(d.threat.levelZh)}威胁</div>
            <p class="sm dim" style="margin-top:12px;line-height:1.85">${d.threat.reasons.map(esc).join('')}</p>
          </div>
        </div>

        <div class="note warn" style="margin-bottom:28px">
          <span class="lbl">证据等级提示</span>${esc(d.warning)}
        </div>

        ${!isFull ? `<div class="note" style="margin-bottom:34px;border-left-color:var(--finale)">
          <span class="lbl">本会话可见范围</span>${esc(d.o5Limitation)}
        </div>` : ''}

        <section class="sec">
          <div class="sec-h"><span class="no">01</span><h2>组织身份</h2><span class="en">Identity</span></div>
          <dl class="dl">
            ${d.identity.map(b => `<div class="dl-row"><dt><b>${esc(b.k)}</b></dt><dd>${esc(b.v)}</dd></div>`).join('')}
          </dl>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">02</span><h2>创始人</h2><span class="en">Founder</span></div>
          <div class="disp" style="font-size:18px;letter-spacing:.1em;margin-bottom:20px">${esc(d.founder.name)}</div>
          ${d.founder.sections.map(s => `<div class="era"><h3>${esc(s.zh)}</h3><p>${esc(s.body)}</p></div>`).join('')}
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">03</span><h2>起源</h2><span class="en">Origin</span></div>
          <div class="note" style="border-left-color:var(--finale)">
            <span class="lbl">档案说明</span>${esc(d.origin.note)}
          </div>
          <div class="grid" style="gap:16px;margin-top:20px">
            ${d.origin.docs.map((doc, i) => `
              <div class="zone a-finale" style="cursor:pointer" data-origin="${i}">
                <div class="zc">${esc(doc.code)} · ${esc(doc.kind)}</div>
                <h3 style="font-size:14.5px;line-height:1.6">${esc(doc.title)}</h3>
                <div class="ze">${esc(doc.date)}</div>
                <p>${esc(doc.body[0])}</p>
                <div class="zitems"><span class="chip">${esc(doc.verdict)}</span></div>
              </div>`).join('')}
          </div>
          <div class="note warn" style="margin-top:26px">
            <span class="lbl">起源结论</span>
            <ul class="bullets" style="margin-top:6px">${d.origin.conclusion.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">04</span><h2>标志</h2><span class="en">Emblem</span></div>
          <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
            <img src="${esc(d.emblem.image)}" alt="emblem" style="width:200px;background:#fff;padding:12px;flex:0 0 auto">
            <div style="flex:1;min-width:240px">
              <p class="mtext">${esc(d.emblem.body)}</p>
              <p class="mtext" style="margin-top:12px;color:var(--accent)">${esc(d.emblem.meaning)}</p>
            </div>
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">05</span><h2>内部章节</h2><span class="en">Internal</span></div>
          ${!isFull ? `<div class="locked-note" style="margin:12px 0 0">
              <b>组织历史 · 管理体系 · 研究体系 · 后勤 · 对外关系 · 情报状态 · 行动评估</b>
              收录于本卷「内部」章节，需 <b>${esc(lvFull(6))}</b>。
              <br><br>
              基金会知道这个组织是怎么开始的。关于它之后十七年发生了什么、现在有多少人、基地在哪里——
              我们没有可靠情报。这部分不是被加密了，是从来就没有被写入。
            </div>` : `
            <div class="grid c2">
              ${d.history.map(h => `<div class="zone a-finale"><h3 style="font-size:14px">${esc(h.zh)}</h3><p>${esc(h.body)}</p></div>`).join('')}
            </div>
            <div class="mlabel" style="margin-top:26px">管理体系 / Command</div>
            <div class="grid c2">
              ${d.structure.map(h => `<div class="zone a-finale"><h3 style="font-size:14px">${esc(h.zh)}</h3><p>${esc(h.body)}</p></div>`).join('')}
            </div>
            <div class="mlabel" style="margin-top:26px">研究体系 / Research</div>
            <div class="grid c2">
              ${d.research.map(h => `<div class="zone a-finale"><h3 style="font-size:14px">${esc(h.zh)}</h3><p>${esc(h.body)}</p></div>`).join('')}
            </div>
            <div class="mlabel" style="margin-top:26px">经济 · 后勤 · 基地 / Logistics</div>
            <dl class="dl">${d.logistics.map(b => `<div class="dl-row"><dt><b>${esc(b.zh)}</b></dt><dd>${esc(b.body)}</dd></div>`).join('')}</dl>
            <div class="mlabel" style="margin-top:26px">对外关系 / Relations</div>
            <dl class="dl">${d.relations.map(r => `<div class="dl-row">
              <dt><b>${esc(r.who)}</b>${r.tone === 'hostile' ? 'HOSTILE' : 'UNDETERMINED'}</dt>
              <dd style="${r.tone === 'hostile' ? 'color:var(--warn)' : ''}">${esc(r.state)}</dd></div>`).join('')}</dl>
            <div class="mlabel" style="margin-top:26px">基金会情报状态 / Intelligence</div>
            <div class="grid c2">
              <div class="zone a-isa"><h3 style="font-size:14px">已知 / KNOWN</h3>
                <ul class="bullets" style="margin-top:10px">${d.foundationKnown.known.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>
              <div class="zone a-finale"><h3 style="font-size:14px">未知 / UNKNOWN</h3>
                <ul class="bullets" style="margin-top:10px">${d.foundationKnown.unknown.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>
            </div>
            <div class="note warn" style="margin-top:24px"><span class="lbl">针对 AREA-372 的行动 · 未发动</span>
              <ul class="bullets" style="margin-top:6px">${d.operation.area372.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
            </div>
            <p class="sm dim2" style="margin-top:16px">${esc(d.operation.note)}</p>
            <div class="mlabel" style="margin-top:26px">设定连续性提醒 / Continuity</div>
            <ul class="bullets">${d.continuity.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
          `}
        </section>

        ${footer()}
      </div>`;

    $$('[data-origin]').forEach(el => {
      el.addEventListener('click', () => {
        const doc = d.origin.docs[parseInt(el.dataset.origin, 10)];
        if (!doc) return;
        modal('起源卷 / ' + doc.code, doc.title, doc.kind + ' · ' + doc.date, `
          <div class="mlabel">正文 / Transcript</div>
          <div class="mtext">
            ${doc.body.map(p => `<p style="margin:0 0 .9em">${esc(p)}</p>`).join('')}
          </div>
          <div class="note warn" style="margin-top:26px"><span class="lbl">归档判断</span>${esc(doc.verdict)}</div>
        `, 'var(--finale)');
        setTimeout(() => AREA.jitter($('#modalBody .mtext'), 2), 600);
      });
    });
  };

  /* ---------- CHAT HELPERS ---------- */
  function msgHtml(m) {
    if (m.from === 'sys') {
      return `<div class="msg sys"><div class="bub">${esc(m.x)}</div></div>`;
    }
    const mine = m.from === 'me';
    return `<div class="msg ${m.from}">
      <div class="who">${mine ? '本账号 · ' : ''}${esc(m.name)} · ${esc(m.t)}</div>
      <div class="bub">${esc(m.x)}</div>
    </div>`;
  }

  /* ---------- CHAT: IS-12 ---------- */
  PAGES['chat-isa'] = async function () {
    if (SESS.id !== 'isa' && !SESS.grant) {
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED', cn: '内部安全代理专属通讯档案',
        msg: '本档案由内部安全代理独立维护，不经过站点行政服务器。仅该岗位本人的会话可读取。',
        file: 'AREA-372/IS-12/RELAY', need: '内部安全代理'
      });
      return;
    }
    const d = await load('chat-isa');
    applyAccent('isa');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> SECURE RELAY <i>/</i> 内部通讯</div>
          <h1>${esc(d.header.zh)}</h1>
          <div class="h1-cn">${esc(d.header.en)}</div>
          <p class="lead">${esc(d.header.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note warn" style="margin-bottom:32px">
          <span class="lbl">证据限制</span>${esc(d.caution)}
        </div>

        <section class="sec">
          <div class="sec-h"><span class="no">${String(d.threads.length).padStart(2, '0')}</span><h2>会话记录</h2><span class="en">Threads</span></div>
          ${d.threads.map(t => `<div class="thread a-${t.accent}">
            <div class="thread-h">
              <span class="tid">${esc(t.id)}</span>
              <h3>${esc(t.title)}</h3>
              <span class="kind">${esc(t.kind)}</span>
              <span class="risk ${t.risk === '高' || t.risk === '极高' ? 'high' : ''}">风险 ${esc(t.risk)}</span>
            </div>
            <div class="thread-body">
              <div style="margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap">
                <span class="kind">本账号 · ${esc(SESS.display)}</span>
                <span class="kind">对方 · ${esc(t.with)}</span>
              </div>
              <p class="thread-sum">${esc(t.summary)}</p>
              ${t.msgs.map(msgHtml).join('')}
              <div class="thread-flag"><b>留档说明</b> · ${esc(t.flag)}</div>
            </div>
          </div>`).join('')}
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">◈</span><h2>${esc(d.dossier.name)}</h2><span class="en">Transmission</span></div>
          <div class="zone a-warn" style="cursor:default">
            <div class="zc">${esc(d.dossier.fileNo)}</div>
            <p style="margin-top:0">${esc(d.dossier.intro)}</p>
            <div class="zitems" style="margin-bottom:20px">
              <span class="chip">${esc(d.dossier.count)}</span>
              <span class="chip">证据袋 ${esc(d.dossier.seal)}</span>
            </div>
            <div class="tx">
              ${d.dossier.transmission.map(l => `<div class="ln ${l.s === 'final' ? 'final' : ''}">
                <span class="t">${esc(l.t)}</span>
                <span class="x">${esc(l.x)}</span>
                <span class="r s-${l.s}">${l.n || (l.s === 'ok' ? 'OK' : l.s === 'fail' ? 'FAIL' : '……')}</span>
              </div>`).join('')}
            </div>
            <div style="margin-top:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
              <span class="seal"><span class="dot"></span>已发送 律法左手</span>
              <span class="sm dim2">接收端回执 · ${esc(d.dossier.transmission[d.dossier.transmission.length - 1].t)}</span>
            </div>
            <div class="note" style="margin-top:20px"><span class="lbl">交接注</span>${esc(d.dossier.finalNote)}</div>
          </div>
        </section>

        ${footer()}
      </div>`;

    setTimeout(() => {
      const t = $$('.thread')[5];
      if (t) AREA.jitter(t.querySelector('.thread-body'), 2);
    }, 1400);
  };

  /* ---------- CHAT: DIRECTOR ---------- */
  PAGES['chat-director'] = async function () {
    if (SESS.id !== 'director' && !SESS.grant) {
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED', cn: '主管办公室通讯留档',
        msg: '本档案由主管办公室终端自动留档，仅该办公室授权会话可读取。',
        file: 'AREA-372/DIR-OFFICE/RELAY', need: '设施主管'
      });
      return;
    }
    const d = await load('chat-director');
    applyAccent('warn');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> DIRECTOR RELAY <i>/</i> 主管通讯</div>
          <h1>${esc(d.header.zh)}</h1>
          <div class="h1-cn">${esc(d.header.en)}</div>
          <p class="lead">${esc(d.header.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note warn" style="margin-bottom:32px">
          <span class="lbl">阅读提示</span>${esc(d.caution)}
        </div>

        <section class="sec">
          <div class="sec-h"><span class="no">${String(d.threads.length).padStart(2, '0')}</span><h2>留档会话</h2><span class="en">Threads</span></div>
          ${d.threads.map(t => `<div class="thread a-${t.accent}">
            <div class="thread-h">
              <span class="tid">${esc(t.id)}</span>
              <h3>${esc(t.title)}</h3>
              <span class="kind">${esc(t.kind)}</span>
              <span class="risk ${t.risk === '高' || t.risk === '极高' ? 'high' : ''}">风险 ${esc(t.risk)}</span>
            </div>
            <div class="thread-body">
              <div style="margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap">
                <span class="kind">本账号 · ${esc(SESS.display)}</span>
                <span class="kind">对方 · ${esc(t.with)}</span>
              </div>
              <p class="thread-sum">${esc(t.summary)}</p>
              ${t.msgs.map(msgHtml).join('')}
              <div class="thread-flag"><b>留档说明</b> · ${esc(t.flag)}</div>
            </div>
          </div>`).join('')}
        </section>

        ${footer()}
      </div>`;

    setTimeout(() => {
      const t = $$('.thread')[3];
      if (t) AREA.jitter(t.querySelector('.thread-body'), 2);
    }, 1200);
  };

  /* ---------- O5 PANEL ---------- */
  PAGES['o5-panel'] = async function () {
    if (SESS.id !== 'o5' && !SESS.grant) {
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED', cn: 'O5 议会控制台',
        msg: '本控制台仅对 O5 议会授权会话开放。',
        file: 'AREA-372/O5/CONSOLE', need: 'O5 议会 / L-5'
      });
      return;
    }
    const d = await load('o5-panel');
    applyAccent('o5');
    const own = LV();

    $('#app').innerHTML = `
      <div class="wrap wide">
        <div class="phead">
          <div class="crumb">O5 <i>/</i> COUNCIL CONSOLE</div>
          <h1>议会控制台</h1>
          <div class="h1-cn">${esc(d.fileNo)}</div>
          <p class="lead">${esc(d.note)}</p>
          <div class="phead-bar"></div>
        </div>

        <section class="sec">
          <div class="sec-h"><span class="no">01</span><h2>安保许可等级</h2><span class="en">Clearance Ladder</span></div>
          <div class="grid c2">
            ${d.levels.map(l => {
              const me = l.lv === own;
              return `<div class="zone ${me ? 'a-o5' : 'a-mono'}" style="cursor:default;${me ? 'border-color:rgba(201,162,39,.5)' : ''}">
                <div class="zc">${esc(l.code)} ${me ? '· 当前会话' : ''}</div>
                <h3 style="font-size:14px">${esc(l.zh)}</h3>
                <div class="ze">LV ${l.lv}</div>
              </div>`;
            }).join('')}
          </div>
          <p class="sm dim2" style="margin-top:16px">
            说明：即便拥有 5 级权限，也遵循「须知」原则，并非能随意查看所有文件。6 级不在现行体系中。
          </p>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">02</span><h2>人员权限总览</h2><span class="en">Personnel Clearance</span></div>
          <div style="overflow-x:auto">
            <table class="perm-table">
              <thead><tr><th>岗位</th><th>代号</th><th>许可</th><th>状态</th><th>标记</th><th>风险</th></tr></thead>
              <tbody>
                ${d.personnel.map(p => `<tr>
                  <td>${esc(p.role)}</td>
                  <td class="code" style="color:var(--dim)">${esc(p.code)}</td>
                  <td><div class="lvbar">
                    ${[0, 1, 2, 3, 4, 5, 6].map(n => `<i class="${n <= p.lv ? 'on' : ''}"></i>`).join('')}
                    <span class="n">${p.lv}</span></div></td>
                  <td>${esc(p.state)}</td>
                  <td class="flag-cell">${esc(p.flag)}</td>
                  <td class="${p.risk === '极高' ? 'risk-vh' : p.risk === '高' ? 'risk-h' : 'flag-cell'}">${esc(p.risk)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">03</span><h2>站点实时指标</h2><span class="en">Metrics</span></div>
          <dl class="dl">
            ${d.metrics.map(m => `<div class="dl-row">
              <dt><b>${esc(m.k)}</b></dt>
              <dd style="${m.tone === 'warn' ? 'color:var(--warn)' : ''}">${esc(m.v)}</dd></div>`).join('')}
          </dl>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">04</span><h2>加密档案索引</h2><span class="en">Encrypted Index</span></div>
          <div style="overflow-x:auto">
            <table class="perm-table">
              <thead><tr><th>编号</th><th>名称</th><th>状态</th><th>保留限制</th></tr></thead>
              <tbody>
                ${d.encryptedIndex.map(e => `<tr>
                  <td class="code" style="color:var(--dim)">${esc(e.code)}</td>
                  <td>${esc(e.zh)}</td>
                  <td style="color:var(--isa)">${esc(e.state)}</td>
                  <td class="flag-cell">${esc(e.keep)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">05</span><h2>议会通告</h2><span class="en">Council Notices</span></div>
          <div class="grid" style="gap:16px">
            ${d.notices.filter(n => can(n.lv)).map(n => `
              <div class="zone a-${n.accent}" style="cursor:default">
                <h3 style="font-size:14px">${esc(n.title)}</h3>
                <p>${esc(n.body)}</p>
              </div>`).join('')}
          </div>
          ${d.notices.some(n => !can(n.lv)) ? `<div class="locked-note" style="margin-top:16px">
            另有 <b>${d.notices.filter(n => !can(n.lv)).length}</b> 条议会通告需 6 级权限。该等级不在现行体系中。
          </div>` : ''}
        </section>

        <section class="sec">
          <div class="sec-h"><span class="no">06</span><h2>议事原则</h2><span class="en">Standing Principles</span></div>
          <ul class="bullets">${d.council.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        </section>

        ${footer()}
      </div>`;
  };

  /* ---------- CHIEF EGG ---------- */
  PAGES['chief-egg'] = async function () {
    if (SESS.id !== 'security' && !SESS.grant) {
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED', cn: '该目录不对当前会话开放',
        msg: '本目录由安保值班链维护。条目名称为「安全主管大声说话」。',
        file: 'AREA-372/SEC-02/LOUD', need: '安全主管'
      });
      return;
    }
    applyAccent('warn');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> LOUD CHIEF <i>/</i> 安全主管大声说话</div>
          <h1>安全主管大声说话</h1>
          <div class="h1-cn">LOUD CHIEF · 1 个项目</div>
          <p class="lead">本目录由安保值班链自行维护，未纳入站点正式档案编号体系。目录内仅有 1 个文件。</p>
          <div class="phead-bar"></div>
        </div>

        <div class="log-row a-warn" id="eggRow" style="cursor:pointer">
          <div class="lid">SEC-02</div>
          <div>
            <div class="lt">安全主管大声说话</div>
            <div class="lz">BROADCAST CAPTURE · 来源不明 · 未经批准</div>
          </div>
          <div class="lg">1 项</div>
        </div>

        <div class="note" style="margin-top:26px">
          <span class="lbl">目录说明</span>
          该文件由一名未登记的操作者在安保值班终端上创建，创建时间与 IS-07 死亡当夜的门禁缓存导出时间重合。创建者字段为空。
        </div>

        ${footer()}
      </div>`;

    $('#eggRow').addEventListener('click', () => {
      modal('目录条目 / SEC-02', '安全主管大声说话', 'BROADCAST CAPTURE · 来源不明', `
        <img src="assets/img/chief-loud.webp" alt="安全主管大声说话"
             style="width:100%;border:1px solid var(--line);display:block">
        <div style="margin-top:26px;font-size:15px;line-height:2.1;color:var(--fg)">
          你找到彩蛋了！居然是红帽大声说话😱😱😱<br>
          我问你，我能不能大声说话😡😡😡
        </div>
        <div class="note warn" style="margin-top:24px">
          <span class="lbl">档案附注 · 严肃部分</span>
          该画面为一则未经批准的设施内部广播截图。画面中的制服不属于本站点任何现役安保编制；
          「ASSAULT IN PROGRESS」字样对应的时间码，早于本站点任何一次已登记袭击事件。
          换言之：这不是本站点的画面。安保值班链解释不清它为什么会出现在自己的终端上。
        </div>
      `, 'var(--warn)');
      setTimeout(() => {
        document.body.classList.add('flicker');
        setTimeout(() => document.body.classList.remove('flicker'), 1400);
      }, 300);
    });
  };

  /* ---------- 通用阵营标签页 ---------- */
  function renderBlocks(blocks) {
    return (blocks || []).map(b => {
      const t = b.t || 'p';
      if (t === 'h') return `<div class="mlabel">${esc(b.x)}</div>`;
      if (t === 'p') return `<p class="mtext" style="margin:0 0 .9em">${md(b.x)}</p>`;
      if (t === 'list') return `<ul class="bullets">${(b.items || []).map(i => `<li>${md(i)}</li>`).join('')}</ul>`;
      if (t === 'note') return `<div class="note ${b.tone === 'warn' ? 'warn' : ''}" style="margin:20px 0">
          <span class="lbl">${esc(b.label || '附注')}</span>${md(b.x)}</div>`;
      if (t === 'kv') return `<dl class="kv">${(b.rows || []).map(r =>
          `<dt>${esc(r[0])}</dt><dd>${md(r[1])}</dd>`).join('')}</dl>`;
      if (t === 'table') return `<div style="overflow-x:auto;margin:16px 0">
          <table class="perm-table">
            <thead><tr>${(b.head || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${(b.rows || []).map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`;
      if (t === 'log') return `<div class="tx">${(b.lines || []).map(l => `<div class="ln">
          <span class="t">${esc(l.time || '')}</span>
          <span class="x">${esc(l.x || '')}</span>
          <span class="r s-${l.s || 'ok'}">${esc(l.n || (l.s === 'fail' ? 'FAIL' : 'OK'))}</span>
        </div>`).join('')}</div>`;
      if (t === 'chat') return `<div class="chat-wrap">${(b.msgs || []).map(m => msgHtml(m)).join('')}</div>`;
      if (t === 'redacted') return `<div class="redacted-line">${redact(b.x)}</div>`;
      return '';
    }).join('');
  }

  /* 极简行内标记：**粗体** 与 `代码` */
  function md(s) {
    let out = esc(s == null ? '' : s);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--fg)">$1</strong>');
    out = out.replace(/`([^`]+)`/g, '<code class="code" style="color:var(--dim);border:1px solid var(--line);padding:0 4px">$1</code>');
    out = out.replace(/█/g, '<span class="redact">█</span>');
    return out;
  }
  function redact(s) {
    return esc(s == null ? '' : s).replace(/█/g, '<span class="redact">█</span>');
  }

  PAGES.tab = async function () {
    const id = QS().get('id') || '';
    const held = (SESS.tabs || []).map(t => t.id);
    const here = (SESS.tabs || []).find(t => t.id === id);

    if (!id || held.indexOf(id) < 0) {
      $('#app').innerHTML = gate({
        title: 'ACCESS DENIED', cn: '该标签页不属于当前身份',
        msg: '每个阵营的档案只对本阵营的授权身份开放。当前会话未持有本条目的访问凭据。',
        file: 'AREA-372/FACTION/' + (id || 'UNKNOWN').toUpperCase(),
        need: '对应阵营身份'
      });
      return;
    }

    /* —— 特例：O5 的全部身份名册 —— */
    if (id === 'roster') {
      applyAccent('o5');
      const groups = {};
      (SITE.accounts || []).forEach(acc => {
        const fid = acc.faction || 'scp';
        (groups[fid] = groups[fid] || []).push(acc);
      });
      const fmeta = {};
      (SITE.factions || []).forEach(f => fmeta[f.id] = f);
      const order = (SITE.factions || []).map(f => f.id);

      $('#app').innerHTML = `
        <div class="wrap wide">
          <div class="phead">
            <div class="crumb">O5 <i>/</i> ALL IDENTITIES</div>
            <h1>全部身份登记</h1>
            <div class="h1-cn">Global Identity Registry · 全阵营</div>
            <p class="lead">本页为 O5 议会专属视图，汇总全部 ${SITE.accounts.length} 个已登记身份的阵营归属、岗位与许可标记。
            非基金会阵营的许可等级显示为「[数据删除]」——不是系统故障，是基金会确实不知道对方的权限边界。</p>
            <div class="phead-bar"></div>
          </div>

          ${order.filter(fid => groups[fid]).map(fid => {
            const f = fmeta[fid] || { zh: '未登记', en: '—', abbr: '—', accent: 'mono' };
            return `<section class="sec">
              <div class="sec-h"><span class="no">${esc(f.abbr || '—')}</span><h2>${esc(f.zh)}</h2>
                <span class="en">${esc(f.en)} · ${groups[fid].length}</span></div>
              <div style="overflow-x:auto">
                <table class="perm-table">
                  <thead><tr><th>身份</th><th>部门 / 序列</th><th>许可</th><th>标签页</th><th>备注</th></tr></thead>
                  <tbody>
                    ${groups[fid].map(acc => `<tr>
                      <td style="color:var(--fg-soft)">${esc(acc.display)}</td>
                      <td class="flag-cell">${esc(acc.dept)}</td>
                      <td class="lv-cell">${esc(acc.clearanceLabel || ('L-' + acc.clearance))}</td>
                      <td class="flag-cell">${(acc.tabs || []).length ? acc.tabs.map(t => esc(t.zh)).join(' · ') : '—'}</td>
                      <td class="flag-cell">${esc(acc.note || '')}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </section>`;
          }).join('')}

          <div class="note" style="border-left-color:var(--o5)">
            <span class="lbl">议会批注</span>
            名册中的最后一行不在任何阵营之下。它的权限徽记在档案设立之初即已被写入，写入人为空。
            本控制台无法修改该条目，也无法删除。
          </div>

          ${footer()}
        </div>`;
      return;
    }

    /* —— 普通阵营标签页 —— */
    const d = await load('factions');
    let faction = null, tabData = null;
    for (const f of d.factions) {
      if (f.tabs && f.tabs[id]) { faction = f; tabData = f.tabs[id]; break; }
    }
    if (!tabData) {
      $('#app').innerHTML = gate({
        title: 'RECORD MISSING', cn: '该条目标签页暂无可读内容',
        msg: '档案目录中存在该条目，但正文尚未归档。请联系对应阵营的资料管理员。',
        file: 'AREA-372/FACTION/' + id.toUpperCase()
      });
      return;
    }

    applyAccent(tabData.accent || faction.accent || 'mono');

    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">${esc(faction.abbr || '—')} <i>/</i> ${esc(faction.en)} <i>/</i> ${esc(tabData.zh)}</div>
          <h1>${esc(tabData.zh)}</h1>
          <div class="h1-cn">${esc(tabData.sub || tabData.en || '')}</div>
          <p class="lead">${esc(faction.tagline || '')}</p>
          <div class="phead-bar"></div>
        </div>

        <div class="note" style="margin-bottom:30px">
          <span class="lbl">${esc(faction.zh)} · ${esc(faction.en)}</span>${esc(faction.desc || '')}
        </div>

        <div class="faction-body">${renderBlocks(tabData.blocks)}</div>

        ${footer()}
      </div>`;

    // 深红王之子与终幕相关页面加抖动
    if (faction.id === 'cotsk' || id === 'cotsk-whisper') {
      setTimeout(() => AREA.jitter($('.faction-body'), 2), 900);
    }
  };

  /* ---------- SEARCH ---------- */
  PAGES.search = async function () {
    $('#app').innerHTML = `
      <div class="wrap">
        <div class="phead">
          <div class="crumb">AREA-372 <i>/</i> SEARCH <i>/</i> 档案检索</div>
          <h1>档案检索</h1>
          <div class="h1-cn">Archive Retrieval</div>
          <p class="lead">输入档案编号、SCP 编号或关键词。检索范围仅包含当前许可等级（${esc(ownLabel())}）可读的档案。</p>
          <div class="phead-bar"></div>
        </div>

        <div class="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>
          <input id="q" type="text" placeholder="例：EC-68G / SCP-682 / 抑制系统 / Omega-1" autocomplete="off" spellcheck="false">
        </div>
        <div class="search-meta" id="meta">输入关键词开始检索</div>
        <div id="results"></div>

        ${footer()}
      </div>`;

    const input = $('#q');
    const meta = $('#meta');
    const out = $('#results');

    let index = null;
    async function build() {
      if (index) return index;
      index = [];
      const push = (kind, title, sub, text, href) =>
        index.push({ kind, title: title || '', sub: sub || '', text: text || '', href: href || '#' });

      const scp = await load('scp');
      scp.groups.forEach(g => g.items.forEach(it => {
        if (!can(it.lv)) return;
        push('收容项目', it.id + ' · ' + it.zh, it.en + ' · ' + g.zh,
          [it.measure, it.risk, it.note, it.cls].join(' '), 'scp.html?q=' + encodeURIComponent(it.id));
      }));

      const inc = await load('incidents');
      inc.items.forEach(it => {
        if (!can(it.lv)) return;
        push('事件档案', it.zh, it.code + ' · ' + it.en,
          [it.summary, it.outcome, it.zones.join(' '), it.projects.join(' '),
            can(it.lvFull) ? it.timeline.map(t => t.x).join(' ') : ''].join(' '),
          'incidents.html?q=' + encodeURIComponent(it.id));
      });

      const dl = await load('daily');
      dl.items.forEach(it => {
        if (!can(it.lv)) return;
        push('日常记录', it.zh, it.id + ' · ' + it.en,
          [it.summary, it.zone, it.project, it.action, it.verdict].join(' '), 'daily.html');
      });

      const tuc = await load('tuc');
      tuc.items.forEach(it => {
        push('特遣分队', it.id + ' 「' + it.zh + '」', it.en,
          [it.duty, it.limit, it.station, it.metric, it.motto].join(' '), 'tuc.html');
      });

      const ov = await load('overview');
      ov.zones.forEach(z => push('设施分区', z.zh, z.en, z.desc + ' ' + z.items.join(' '), 'overview.html'));
      ov.history.forEach(h => push('历史沿革', h.era + ' ' + h.zh, h.en, h.text, 'overview.html'));
      push('核心异常', 'SCP-vein-572', 'Anomalous Vein Network',
        ov.vein.paras.join(' ') + ' ' + ov.vein.warning, 'overview.html');

      if (can(5)) {
        const co = await load('corruption');
        co.groups.forEach(g => push('内部调查', g.zh, g.no + ' · ' + g.code, g.body + ' ' + g.bullets.join(' '), 'corruption.html'));
        co.evidence.forEach(e => push('调查证据', e.code + ' · ' + e.zh, e.fileNo, e.summary + ' ' + e.bullets.join(' '), 'corruption.html'));
        co.related.forEach(r => push('关联卷宗', r.zh, r.fileNo, r.summary + ' ' + r.bullets.join(' '), 'corruption.html'));

        const fin = await load('finale');
        fin.origin.docs.forEach(dc => push('威胁评估 · 起源', dc.code + ' · ' + dc.title, dc.kind,
          dc.body.join(' ') + ' ' + dc.verdict, 'finale.html'));
      }

      const tabIds = (SESS.tabs || []).map(t => t.id);
      if (tabIds.indexOf('chat-isa') >= 0) {
        const ch = await load('chat-isa');
        ch.threads.forEach(t => push('内部通讯', t.title, t.id + ' · ' + t.with,
          t.summary + ' ' + t.msgs.map(m => m.x).join(' '), 'chat-isa.html'));
      }
      if (tabIds.indexOf('chat-director') >= 0) {
        const ch = await load('chat-director');
        ch.threads.forEach(t => push('主管通讯', t.title, t.id + ' · ' + t.with,
          t.summary + ' ' + t.msgs.map(m => m.x).join(' '), 'chat-director.html'));
      }
      if (tabIds.indexOf('chief-egg') >= 0) {
        push('安保目录', '安全主管大声说话', 'SEC-02 · BROADCAST CAPTURE',
          '安全主管 大声 说话 广播 截获 彩蛋', 'chief-egg.html');
      }

      // 阵营标签页内容进入检索（仅当当前身份持有该标签页）
      try {
        const fac = await load('factions');
        (SESS.tabs || []).forEach(t => {
          fac.factions.forEach(f => {
            const td = (f.tabs || {})[t.id];
            if (!td) return;
            const txt = (td.blocks || []).map(b =>
              b.x || (b.items || []).join(' ') || (b.rows || []).map(r => r.join(' ')).join(' ') ||
              (b.lines || []).map(l => l.x || '').join(' ') || (b.msgs || []).map(m => m.x || '').join(' ')
            ).join(' ');
            push('阵营档案 · ' + f.abbr, td.zh, f.zh + ' · ' + (td.sub || td.en || ''),
              txt, 'tab.html?id=' + encodeURIComponent(t.id));
          });
        });
      } catch (e) { /* 阵营数据缺失不影响主检索 */ }

      return index;
    }

    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(run, 130);
    });

    async function run() {
      const raw = input.value;
      const q = raw.trim();
      if (!q) { meta.textContent = '输入关键词开始检索'; out.innerHTML = ''; return; }

      if (q.indexOf('做的很好') >= 0) {
        AREA.toast('非计划投递 / UNSCHEDULED DELIVERY',
          '某个匿名行政人员在备份目录里留了一张便条：<br><br>' +
          '「如果你能找到这里——说明你没有只用主管办公室提供的那份摘要。<br>' +
          '这份记录能保存下来，是因为有人多按了一次『另存为』。<br>' +
          '谢谢。继续查。」<br><br>' +
          '<span style="color:var(--dim-2)">—— 便条无签名。纸张背面印着 C-12 走廊的旧编号。</span>', 14000);
        await sleep(120);
      }

      const idx = await build();
      const low = q.toLowerCase();
      const hits = idx.filter(e => (e.title + ' ' + e.sub + ' ' + e.text).toLowerCase().indexOf(low) >= 0);

      meta.textContent = `检索「${q}」 · 命中 ${hits.length} 条 · 索引 ${idx.length} 条（${ownLabel()} 可见范围内）`;

      if (!hits.length) {
        out.innerHTML = `<div class="note warn" style="margin-top:20px">
          <span class="lbl">NO MATCH</span>
          未在当前许可等级可读的档案中匹配到「${esc(q)}」。
          若目标为受限卷宗，需要更高许可等级；部分档案的存在本身也不对本站点公开。
        </div>`;
        return;
      }

      out.innerHTML = hits.slice(0, 60).map(e => `
        <a class="sres" href="${esc(e.href)}">
          <div class="sk">${esc(e.kind)} · ${esc(e.sub)}</div>
          <div class="st">${hl(e.title, q)}</div>
          <div class="sd">${esc(snip(e.text, q))}</div>
        </a>`).join('');
    }

    function hl(s, q) {
      const esc2 = esc(s);
      const safeQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return esc2.replace(new RegExp(safeQ, 'ig'), m => `<mark>${m}</mark>`);
    }
    function snip(text, q) {
      const t = String(text || '');
      const i = t.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return t.slice(0, 130);
      const s = Math.max(0, i - 46);
      return (s > 0 ? '…' : '') + t.slice(s, s + 150) + '…';
    }

    input.focus();
  };

  /* ---------- FOOTER ---------- */
  function footer() {
    const wiki = SITE.site.wiki;
    return `<div class="foot">
      <div>AREA-372 · TAKAL UNDERGROUND COMPLEX · BUILD 372.1.0 · SESSION ${esc(SESS.displayEn || SESS.display)} · ${esc(ownLabel())}</div>
      <div class="fc">
        本页面为基于 SCP 基金会设定的原创同人作品，非官方站点。SCP 基金会设定内容遵循
        <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.zh" target="_blank" rel="noopener">CC BY-SA 3.0</a>
        协议；AREA-372、TUC 系列、终幕计划及相关人物、事件、档案编号均为本项目原创设定。
        页面内容为虚构创作，与现实中的任何机构、个人、事件无关。
        <br>外部资料库：<a href="${esc(wiki.href)}" target="_blank" rel="noopener">${esc(wiki.zh)}</a>
      </div>
    </div>`;
  }

  /* ============================================================
     BOOTSTRAP
     ============================================================ */
  async function main() {
    try {
      SITE = await AREA.site();
    } catch (err) {
      console.error('[AREA-372] 数据层载入失败', err);
      const hint = document.getElementById('stageHint');
      if (hint) {
        hint.style.display = 'block';
        hint.insertAdjacentHTML('afterbegin',
          '<div style="color:#e2542b;margin-bottom:10px">数据层载入失败：' +
          esc(err && err.message) + '</div>');
      }
      return;
    }

    if (window.__SINGLE__) { startSingle(); return; }

    const page = document.body.dataset.page;

    if (page === 'index') {
      AREA.consoleInit(null);
      await AREA.boot();
      const form = $('#authForm');
      const inp = $('#authInput');
      if (form) {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          const sess = await AREA.submitAuth(inp ? inp.value : '');
          if (inp) inp.blur();
          await AREA.runScene(sess, 'home.html');
        });
      }
      const skip = $('#skipBtn');
      if (skip) skip.addEventListener('click', async () => {
        const cfg = await AREA.site();
        const sess = AREA.guestSession(cfg);
        await AREA.runScene(sess, 'home.html');
      });

      /* ── 永久授权：向上箭头 + 全员名册 ── */
      const unlock = $('#authUnlock');
      const panel  = $('#rosterPanel');
      const body   = $('#rosterBody');
      let built = false;

      async function buildRoster() {
        if (built) return;
        const cfg = await AREA.site();
        const fmeta = {};
        (cfg.factions || []).forEach(f => fmeta[f.id] = f);
        const order = (cfg.factions || []).map(f => f.id);
        const groups = {};
        (cfg.accounts || []).forEach(acc => {
          (groups[acc.faction] = groups[acc.faction] || []).push(acc);
        });

        body.innerHTML = order.filter(fid => groups[fid]).map(fid => {
          const f = fmeta[fid] || { zh: '未登记', abbr: '—' };
          return `<div class="roster-group">
            <div class="rg-head"><span class="rg-abbr">${esc(f.abbr || '—')}</span>${esc(f.zh)}</div>
            ${groups[fid].map((acc, i) => {
              const lv = acc.clearanceLabel || ('L-' + acc.clearance);
              return `<button type="button" class="roster-item" data-f="${esc(fid)}" data-i="${i}">
                <span class="ri-name">${esc(acc.display)}</span>
                <span class="ri-dept">${esc(acc.dept)}</span>
                <span class="ri-lv">${lv === '█' ? '<span class="redact">█</span>' : esc(lv)}</span>
              </button>`;
            }).join('')}
          </div>`;
        }).join('');

        body.querySelectorAll('.roster-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            const fid = btn.dataset.f, i = parseInt(btn.dataset.i, 10);
            const acc = (cfg.accounts || []).filter(x => x.faction === fid)[i];
            if (!acc) return;
            const sess = AREA.commitPermanent(acc);
            if (inp) inp.blur();
            await AREA.runScene(sess, 'home.html');
          });
        });

        built = true;
      }

      function syncUnlock() {
        if (!unlock) return;
        let g = false;
        try { g = AREA.hasGrant(); } catch (e) { g = false; }
        if (g) unlock.removeAttribute('hidden');
        else unlock.setAttribute('hidden', '');
      }

      if (unlock && panel) {
        syncUnlock();
        unlock.addEventListener('click', async e => {
          e.preventDefault();
          if (panel.hidden) {
            await buildRoster();
            panel.hidden = false;
            unlock.classList.add('open');
          } else {
            panel.hidden = true;
            unlock.classList.remove('open');
          }
        });
      }

      if (form) {
        form.addEventListener('submit', () => {
          const v = String(inp && inp.value || '').trim().toLowerCase().replace(/\s+/g, ' ');
          if (v === 'director grant') setTimeout(syncUnlock, 100);
        });
      }

      return;
    }

    let sess = AREA.getSession();
    if (!sess) {
      /* 兜底：若会话无法持久化（隐私模式 / 存储被策略禁用），
         index 与当前页会互相重定向。用 URL 计数阻断死循环并给出可读提示。 */
      const b = parseInt(QS().get('b') || '0', 10) || 0;
      if (b >= 1) {
        document.body.innerHTML = `
          <div style="max-width:620px;margin:14vh auto;padding:0 24px;font-family:var(--f-cn);color:#e7e7e3">
            <div style="font-family:var(--f-mono);font-size:10px;letter-spacing:.24em;color:#e2542b;margin-bottom:18px">
              SESSION NOT PERSISTED
            </div>
            <h1 style="font-size:20px;letter-spacing:.04em;margin-bottom:16px">会话无法保存</h1>
            <p style="font-size:13.5px;line-height:1.95;color:#b9b9b4">
              本终端需要写入浏览器本地存储来保存身份核验结果，但当前浏览器拒绝了这次写入。
              常见原因：无痕／隐私模式、站点数据被禁用、或存储配额已满。
            </p>
            <p style="font-size:13.5px;line-height:1.95;color:#b9b9b4;margin-top:14px">
              请关闭无痕模式、允许本站点保存数据后重新接入。也可以先以访客身份浏览公开档案。
            </p>
            <p style="margin-top:26px">
              <a href="index.html" style="display:inline-block;border:1px solid #4d4d55;padding:11px 20px;
                 font-family:var(--f-mono);font-size:11.5px;letter-spacing:.18em;color:#e7e7e3">
                 重新接入 / RECONNECT
              </a>
            </p>
          </div>`;
        return;
      }
      location.href = 'index.html?b=1';
      return;
    }

    /* 会话自动对齐：若 site.json 中的账号定义有更新（标签页、等级、部门），
       用最新定义刷新本会话，避免用户必须重新登录才能看到改动。 */
    try {
      const acc = (SITE.accounts || []).find(x => x.keys && x.keys[0] === sess.id);
      if (acc) {
        sess = AREA.setSession(Object.assign({}, sess, {
          display: acc.display, displayEn: acc.displayEn,
          dept: acc.dept, deptEn: acc.deptEn,
          clearance: acc.clearance,
          clearanceLabel: acc.clearanceLabel || null,
          loadout: acc.loadout, accent: acc.accent,
          tabFaction: acc.faction,
          tabs: acc.tabs || []
        }));
      }
    } catch (e) { /* 对齐失败不影响既有会话 */ }

    shell(sess, page);
    AREA.consoleInit(sess);
    AREA.fxInit();

    const app = document.createElement('main');
    app.className = 'main';
    app.id = 'app';
    document.body.appendChild(app);

    const render = PAGES[page];
    if (render) {
      try {
        await render();
      } catch (e) {
        console.error(e);
        app.innerHTML = `<div class="wrap"><div class="gate">
          <h2>TERMINAL FAULT</h2>
          <div class="gcn">档案载入失败</div>
          <p>数据层无法读取。若通过 file:// 直接打开页面，浏览器会阻断本地 JSON 读取。请通过本地服务器访问本终端。</p>
          <div class="gmeta"><div>错误 <b>${esc(e && e.message)}</b></div></div>
        </div></div>`;
      }
    }
  }

  /* ============================================================
     单文件版：hash 路由（无服务器、双击即可运行）
     ============================================================ */
  /* 出错时把原因直接显示出来，而不是静默停住 */
  function installErrorOverlay() {
    const show = (label, msg) => {
      let box = $('#fatal');
      if (!box) {
        box = document.createElement('div');
        box.id = 'fatal';
        box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
          'background:#2a0d0d;border-top:2px solid #e2542b;color:#ffd9cf;' +
          'font-family:ui-monospace,monospace;font-size:12px;line-height:1.7;' +
          'padding:14px 18px;max-height:42vh;overflow:auto;white-space:pre-wrap';
        document.body.appendChild(box);
      }
      box.textContent = '【' + label + '】\n' + msg;
    };
    window.addEventListener('error', e => {
      show('脚本错误', (e.message || 'unknown') + '\n' +
        (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') +
        (e.error && e.error.stack ? '\n\n' + e.error.stack : ''));
    });
    window.addEventListener('unhandledrejection', e => {
      const r = e.reason;
      show('未捕获的 Promise 异常', (r && (r.message || String(r))) +
        (r && r.stack ? '\n\n' + r.stack : ''));
    });
  }

  function startSingle() {
    installErrorOverlay();
    bindAuth();
    window.addEventListener('hashchange', route);
    route();

    /* 拦截所有 .html 链接，转成 hash 路由 */
    document.addEventListener('click', e => {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      const h = a.getAttribute('href') || '';
      if (!/\.html(\?|$)/.test(h) || /^https?:/.test(h)) return;
      e.preventDefault();
      location.hash = '#' + h.replace(/\.html/, '');
    });
  }

  let _authBound = false;
  function bindAuth() {
    if (_authBound) return;
    _authBound = true;
    AREA.consoleInit(null);
    AREA.boot();

    const form = $('#authForm');
    const inp = $('#authInput');
    /* 无论中间哪一步出错，最终都一定渲染出页面——绝不停在加载界面 */
    async function enter(raw) {
      let sess = null;
      try {
        sess = await AREA.submitAuth(raw || '');
        if (inp) inp.blur();
        await AREA.runScene(sess, null);
      } catch (err) {
        console.error('[AREA-372] 登入流程异常，降级为访客：', err);
        try {
          const cfg = await AREA.site();
          sess = AREA.guestSession(cfg);
        } catch (e2) { console.error(e2); }
      }
      if (location.hash !== '#home') location.hash = '#home';
      route();                       // 无条件渲染，不依赖 hashchange 事件
    }

    if (form) {
      form.addEventListener('submit', e => { e.preventDefault(); enter(inp ? inp.value : ''); });
    }
    const skip = $('#skipBtn');
    if (skip) skip.addEventListener('click', () => enter(''));
  }

  let _fxOn = false;

  let _routing = false;
  async function route() {
    if (_routing) return;
    _routing = true;
    try { await _route(); } finally { _routing = false; }
  }

  async function _route() {
    const r = currentRoute();
    const sess = AREA.getSession();
    const bootEl = $('#boot');          // 每次重新取，避免作用域问题

    // 清掉上一屏
    $$('.side, .top, #app, .nav-backdrop, .load-scene').forEach(el => el.remove());

    if (!sess) {
      if (bootEl) bootEl.classList.remove('gone');
      return;                       // 停在身份核验界面
    }

    if (bootEl) bootEl.classList.add('gone');
    document.body.dataset.page = r.page;

    shell(sess, r.page);
    AREA.consoleInit(sess);
    if (!_fxOn) { AREA.fxInit(); _fxOn = true; }

    const app = document.createElement('main');
    app.className = 'main';
    app.id = 'app';
    document.body.appendChild(app);

    const render = PAGES[r.page] || PAGES.home;
    try {
      await render();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="wrap"><div class="gate">
        <h2>TERMINAL FAULT</h2><div class="gcn">档案载入失败</div>
        <p>${esc(e && e.message)}</p></div></div>`;
    }

    // 渲染后把内部链接统一改写为 hash
    $$('a').forEach(el => {
      const h = el.getAttribute('href') || '';
      if (/\.html(\?|$)/.test(h) && !/^https?:/.test(h)) {
        el.setAttribute('href', '#' + h.replace(/\.html/, ''));
      }
    });

    window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
