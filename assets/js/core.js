/* ============================================================
   AREA-372 · core.js  (build 372.0.9)
   session / auth / boot sequence / load scenes / fx / console
   ============================================================ */
'use strict';

const AREA = (function () {
  const KEY = 'area372.session';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- data ---------- */
  const _cache = {};
  async function load(name) {
    if (_cache[name]) return _cache[name];
    // 单文件版：全部数据已内联在 window.__DB__，无需网络请求
    if (window.__DB__ && window.__DB__[name]) {
      _cache[name] = window.__DB__[name];
      return _cache[name];
    }
    const r = await fetch('data/' + name + '.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('DATA ' + name + ' ' + r.status);
    const d = await r.json();
    _cache[name] = d;
    return d;
  }

  /* ---------- marks ---------- */
  // 设施徽记：直接使用原始标志图中抠出的透明版本
  const MARK_IMG = 'assets/img/mark-white.png';

  // 终幕徽记：矢量复刻（原图为白底印刷件，此处按几何重绘）
  const MARK_FINALE = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" fill="none"
      stroke="currentColor" stroke-width="4.5" stroke-linejoin="miter" stroke-linecap="square">
    <path d="M46 12 L94 12 L124 50 L94 88 L46 88 L16 50 Z"/>
    <path d="M52 25 L88 25 L110 50 L88 75 L52 75 L30 50 Z" stroke-width="3.5"/>
    <path d="M60 38 L80 38 L92 50 L80 62 L60 62 L48 50 Z" stroke-width="3"/>
    <rect x="4" y="44" width="132" height="12" fill="currentColor" stroke="none"/>
    <path d="M24 41 l7 -5" stroke="#bf1f2c" stroke-width="3.5"/>
    <path d="M24 59 l7 5" stroke="#bf1f2c" stroke-width="3.5"/>
    <path d="M116 41 l-7 -5" stroke="#bf1f2c" stroke-width="3.5"/>
    <path d="M116 59 l-7 5" stroke="#bf1f2c" stroke-width="3.5"/>
  </svg>`;

  function mark(size, finale) {
    if (finale) {
      return `<span class="mark mark-finale" style="width:${size}px;height:${size}px">${MARK_FINALE}</span>`;
    }
    return `<span class="mark" style="width:${size}px;height:${size}px">` +
      `<img src="${MARK_IMG}" alt="AREA-372" draggable="false"></span>`;
  }

  /* ---------- session ---------- */
  let _site = null;
  async function site() {
    if (!_site) _site = await load('site');
    return _site;
  }

  function getSession() {
    let s = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { s = null; }
    if (!s || !s.display) s = _mem;
    if (!s || !s.display) return null;
    if (s.at && Date.now() - s.at > 1000 * 60 * 60 * 12) return null;
    return s;
  }

  /* localStorage 可能被隐私模式或策略禁用：写入失败时退化为内存副本，
     避免 home.html 因读不到会话而与 index.html 互相重定向成死循环。 */
  let _mem = null;
  try { _mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { _mem = null; }

  function setSession(s) {
    s.at = Date.now();
    _mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 内存副本已生效 */ }
    return s;
  }

  function clearSession() {
    _mem = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* 会话是否存在（含内存退化副本） */
  function hasSession() {
    if (_mem && _mem.display) return true;
    return !!getSession();
  }

  function guestSession(cfg) {
    const g = cfg.guest;
    return setSession({
      id: 'guest', display: g.display, displayEn: g.displayEn,
      dept: g.dept, deptEn: g.deptEn, clearance: g.clearance,
      loadout: g.loadout, accent: g.accent, note: g.note,
      tab: null, denied: ''
    });
  }

  /* ---------- resolve login ---------- */
  function resolve(raw, cfg) {
    const inp = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!inp) return { type: 'guest' };
    const acc = (cfg.accounts || []).find(a =>
      (a.keys || []).some(k => String(k).toLowerCase() === inp)
    );
    return acc ? { type: 'account', acc } : { type: 'unknown' };
  }

  function commit(acc) {
    return setSession({
      id: acc.keys[0],
      display: acc.display,
      displayEn: acc.displayEn,
      dept: acc.dept,
      deptEn: acc.deptEn,
      clearance: acc.clearance,
      clearanceLabel: acc.clearanceLabel || null,
      loadout: acc.loadout,
      accent: acc.accent,
      note: acc.note,
      tab: acc.tab || null,
      denied: ''
    });
  }

  /* ---------- boot lines（总时长约 2.5 秒） ---------- */
  const BOOT = [
    'SCP FOUNDATION · FACILITY INTRANET TERMINAL',
    'BUILD 372.0.9 / REV 20██-██      CHANNEL TAKAL-0372',
    '',
    '> power-on self test ............. <em>OK</em>',
    '> mount  /dev/vein572-monitor .... <em>OK</em>',
    '> link   containment-grid/HCZ .... <em>DEGRADED</em>',
    '> link   containment-grid/SCZ .... <em>SEALED</em>',
    '> link   sensor/temporal ......... <em>OFFLINE</em>',
    '> auth   personnel-registry ...... <em>READY</em>',
    '',
    'WARNING: 本站点状态 CRITICAL / LIMITED OPERATION',
    '',
    '等待人员身份核验 ……'
  ];

  const SCENES = {
    standard: {
      title: 'AREA-372', sub: 'ACCESS GRANTED',
      log: [
        '> 校验人员凭证 …… <b>通过</b>',
        '> 比对人事登记表 …… <b>一致</b>',
        '> 核定许可等级 …… <b>完成</b>',
        '> 加载公共档案层 …… <b>完成</b>',
        '> 挂载终端会话 …… <b>就绪</b>'
      ]
    },
    restricted: {
      title: 'RESTRICTED ACCESS', sub: 'MANAGEMENT CHAIN',
      log: [
        '> 校验人员凭证 …… <b>通过</b>',
        '> 比对人事登记表 …… <b>一致</b>',
        '> 检测到管理链权限 …… <b>已提升</b>',
        '> 扫描未结调查卷宗关联 …… <b>存在关联</b>',
        '> 标记本会话查阅范围 …… <b>完成</b>',
        '> 写入访问审计日志 …… <b>完成</b>'
      ]
    },
    isa: {
      title: 'INTERNAL SECURITY', sub: 'EVIDENCE CHAIN',
      log: [
        '> 校验人员凭证 …… <b>通过</b>',
        '> 建立独立证据保管链 …… <b>已建立</b>',
        '> 隔离站点内部安全部门审查权 …… <b>完成</b>',
        '> 挂载 IS-12 独立通讯档案 …… <b>就绪</b>',
        '> 挂载 Omega-1 卷宗只读镜像 …… <b>就绪</b>',
        '> 核对证据袋 IS12-SEAL-04 …… <b>封存完好</b>'
      ]
    },
    omega: {
      title: "OMEGA-1 / LAW'S LEFT HAND", sub: 'EXTERNAL OVERSIGHT',
      log: [
        '> 校验外部调查单位凭证 …… <b>通过</b>',
        '> 断开站点主管指挥链 …… <b>已断开</b>',
        '> 接管证据保全权限 …… <b>完成</b>',
        '> 核验呈交件版本与校验值 …… <b>一致</b>',
        '> 载入 O1-A ~ O1-G 证据汇编 …… <b>就绪</b>',
        '> 载入七组异常索引 …… <b>就绪</b>'
      ]
    },
    o5: {
      title: 'O5 COUNCIL AUTHORIZATION', sub: 'LEVEL 5 / THAUMIEL',
      log: [
        '> 校验 O5 授权 …… <b>通过</b>',
        '> 解除 K-96 使用记录封存 …… <b>完成</b>',
        '> 解除 K96-X 时间断层附录封存 …… <b>完成</b>',
        '> 载入全站未结调查卷宗 …… <b>就绪</b>',
        '> 挂载议会控制台 …… <b>就绪</b>',
        '> 载入威胁评估 · 起源部分 …… <b>就绪</b>',
        '> 内部章节 …… <b>不可读</b>',
        '> 本会话不计入站点管理链审计 …… <b>例外批准</b>'
      ]
    },
    darl: {
      title: 'FINAL DAWN', sub: 'IDENTITY UNVERIFIED',
      log: [
        '> 校验人员凭证 …… <b>无匹配记录</b>',
        '> 人员凭证不在现任人事登记表中 …… <b>继续</b>',
        '> 权限徽记来源 …… <b>写入人为空</b>',
        '> 压制装置状态 …… <b>在线</b>',
        '> 第四面墙假说 …… <b>未证实</b>',
        '> 你迟到了。'
      ]
    }
  };

  /* ---------- boot / auth ---------- */
  const BOOT_STEP = 165;              // 13 行 × 165ms ≈ 2.1s

  function showAuth(stageA, stageB, linesEl) {
    if (stageA) stageA.style.display = 'none';
    if (stageB) stageB.style.display = '';
    if (linesEl) linesEl.classList.add('faded');   // 代码日志淡出，避免与表单文字重叠
    const bg = $('.boot-bg');
    if (bg) bg.classList.add('faded');             // 欢迎图背景同步淡出，保持表单干净
    const sl = $('#bootSlogan');
    if (sl) sl.classList.add('in');                // 无论走哪条路径，标语都要可见
    const inp = $('#authInput');
    if (inp) setTimeout(() => inp.focus(), 60);
  }

  async function boot() {
    const root = $('#boot');
    if (!root) return;
    window.__BOOT_OK__ = true;      // 告诉外围看门狗：主脚本已正常运行

    const linesEl = $('#bootLines');
    const bar = $('#bootBar > i');
    const pctEl = $('#bootPct');
    const stageA = $('#stageBoot');
    const stageB = $('#stageAuth');
    const slogan = $('#bootSlogan');

    // 看门狗：无论发生什么，2.9s 后一定露出身份核验界面
    let done = false;
    const watchdog = setTimeout(() => {
      if (done) return;
      done = true;
      showAuth(stageA, stageB, linesEl);
    }, 2900);

    try {
      await site();                       // 数据层不可用时不应永久卡住
    } catch (e) {
      // 继续：认证界面仍可显示，取数据时再报错
    }

    if (linesEl) linesEl.innerHTML = BOOT.join('\n');

    const steps = BOOT.length;
    for (let i = 0; i < steps; i++) {
      if (done) break;
      await sleep(BOOT_STEP);
      const p = Math.round(((i + 1) / steps) * 100);
      if (bar) bar.style.width = p + '%';
      if (pctEl) pctEl.textContent = String(p).padStart(3, '0') + '%';
      if (i === Math.floor(steps * 0.55) && slogan) slogan.classList.add('in');
    }

    if (done) return;
    done = true;
    clearTimeout(watchdog);

    if (slogan) slogan.classList.add('in');
    await sleep(180);
    showAuth(stageA, stageB, linesEl);
  }

  async function submitAuth(raw) {
    const cfg = await site();
    const res = resolve(raw, cfg);
    let sess;
    if (res.type === 'account') {
      sess = commit(res.acc);
    } else {
      sess = guestSession(cfg);
      if (res.type === 'unknown') {
        sess.denied = '凭证未在人事登记表中匹配，已降级为访客会话。';
        setSession(sess);
      }
    }
    return sess;
  }

  /* ---------- load scene ---------- */
  async function runScene(sess, redirect) {
    const key = sess.loadout || 'standard';
    const sc = SCENES[key] || SCENES.standard;
    const accentVar = sess.accent === 'mono' ? 'var(--fg)' : 'var(--' + sess.accent + ')';

    const host = document.createElement('div');
    host.className = 'load-scene scene-' + key;
    host.style.setProperty('--accent', accentVar);
    host.innerHTML = `
      <div class="load-ring"><i></i><i></i><i></i><b>${esc(String(sess.clearance))}</b></div>
      <div class="load-title">${esc(sc.title)}</div>
      <div class="load-sub">${esc(sc.sub)}</div>
      <div class="load-log" id="scLog"></div>
      <div class="load-bar"><i id="scBar"></i></div>
      <div class="load-badge">登记者 <u>${esc(sess.display)}</u> · ${esc(sess.dept)} · L-${esc(String(sess.clearance))}</div>
    `;
    document.body.appendChild(host);

    const logEl = host.querySelector('#scLog');
    const bar = host.querySelector('#scBar');
    const total = sc.log.length;
    const step = key === 'darl' ? 520 : 340;

    for (let i = 0; i < total; i++) {
      await sleep(step);
      const div = document.createElement('div');
      div.innerHTML = sc.log[i];
      if (key === 'darl') div.style.color = 'rgba(191,31,44,.8)';
      logEl.appendChild(div);
      if (bar) bar.style.width = Math.round(((i + 1) / total) * 100) + '%';
    }
    await sleep(520);

    host.classList.add('out');
    await sleep(480);
    if (redirect) location.href = redirect;
  }

  /* ---------- fx ---------- */
  let _fxTimer = null;

  function fxInit() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    fxCycle();
  }

  function fxCycle() {
    const base = document.body.dataset.page === 'finale' ? 7000 : 11000;
    _fxTimer = setTimeout(() => {
      if (Math.random() <= 0.34) {
        const heavy = document.body.dataset.page === 'finale';
        document.body.classList.add('glitch');
        if (heavy && Math.random() < 0.6) document.body.classList.add('flicker');
        setTimeout(() => document.body.classList.remove('glitch'), 300);
        setTimeout(() => document.body.classList.remove('flicker'), 1200);
        if (Math.random() < (heavy ? 0.55 : 0.24)) sweep();
      }
      fxCycle();
    }, base + Math.random() * 6000);
  }

  function sweep() {
    const l = document.createElement('div');
    l.className = 'fx-line';
    document.body.appendChild(l);
    setTimeout(() => l.remove(), 1300);
  }

  /* 针对局部元素的一次性抖动（用于特殊段落） */
  function jitter(el, times) {
    if (!el) return;
    const n = times || 1;
    let i = 0;
    const run = () => {
      el.classList.add('txt-glitch');
      setTimeout(() => el.classList.remove('txt-glitch'), 240);
      if (++i < n) setTimeout(run, 900 + Math.random() * 700);
    };
    run();
  }

  /* ---------- toast ---------- */
  let _toastT = null;
  function toast(title, msg, ms) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<span class="tk">${esc(title)}</span>${msg}`;
    t.classList.add('in');
    clearTimeout(_toastT);
    _toastT = setTimeout(() => t.classList.remove('in'), ms || 5200);
  }

  /* ---------- console ---------- */
  function consoleInit(sess) {
    const style = 'color:#f0a500;font-family:monospace';
    const dim = 'color:#7e7e7a;font-family:monospace';

    console.log('%cAREA-372 TERMINAL', 'color:#e7e7e3;font-family:monospace;font-size:15px;letter-spacing:4px');
    console.log('%cTakal Underground Complex · Build 372.0.8', dim);
    console.log('%c输入 area372.help() 查看可用指令。', dim);

    window.area372 = {
      whoami: () => sess,
      help: () => {
        console.log('%c可用指令', style);
        console.log('  area372.help()        列出指令');
        console.log('  area372.whoami()      当前会话');
        console.log('  area372.status()      设施状态');
        console.log('  area372.scp(682)      打开项目档案');
        console.log('  area372.omega1()      内部调查卷宗');
        console.log('  area372.veil()        关于 SCP-vein-572');
        console.log('  area372.slogan()      设施标语');
        console.log('  area372.sudo()        提权尝试');
        console.log('  area372.logout()      结束会话');
        return 'ok';
      },
      status: () => {
        console.log('%cAREA-372 · CRITICAL / LIMITED OPERATION', style);
        console.log('  许可等级  ' + sess.clearance + ' 级');
        console.log('  收容项目  19 在押 / 1 预留 / 1 已无效化');
        console.log('  封锁区域  特殊收容区、办公区外围部分走廊、M-17 支道');
        console.log('  未结调查  Omega-1 · IS-O1 · FINAL-SUBMISSION-01');
        return 'ok';
      },
      scp: (n) => {
        const id = String(n || '').replace(/^scp-?/i, '');
        if (!id) return location.href = 'scp.html';
        location.href = 'scp.html?q=SCP-' + id;
      },
      omega1: () => location.href = 'corruption.html',
      veil: () => {
        console.log('%cSCP-vein-572', style);
        console.log('  异常矿脉网络 · 贯穿塔卡尔矿洞深层');
        console.log('  抑制系统：下游独立 / 上游节点共用（最高级别维护风险）');
        console.log('  评估：若大规模失控，后果可能达到全球灾难级别');
        return 'ok';
      },
      slogan: () => { console.log('%c我们向下掘进，我们向上守望。', style); return 'ok'; },
      sudo: () => {
        console.log('%c本终端不接受提权。', 'color:#e2542b;font-family:monospace');
        console.log('%c所有授权均需可追溯链。', dim);
        return 'denied';
      },
      logout: () => {
        clearSession();
        if (window.__SINGLE__) { location.hash = '#index'; location.reload(); }
        else location.href = 'index.html';
      }
    };
  }

  return {
    $, $$, sleep, esc, load, mark, MARK_FINALE, MARK_IMG,
    site, getSession, setSession, clearSession, hasSession,
    boot, submitAuth, runScene,
    fxInit, sweep, jitter, toast, consoleInit,
    resolve, guestSession, commit
  };
})();
