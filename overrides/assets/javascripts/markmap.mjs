/* Markmap 运行时前端渲染（架构与 mermaid.mjs 对齐）
   ──────────────────────────────────────────────
   为什么不用 markmap-autoloader 而用 markmap-lib + markmap-view 组合：
   - markmap-autoloader 把"扫描 DOM + 下载依赖 + 渲染"打包成一行脚本，扫描规则
     是 <script type="text/template"> 或 <pre><code class="language-markmap">，
     与本站通过 pymdownx.superfences custom_fences 输出的 <pre class="markmap-src">
     结构不匹配；若强行适配就要魔改 autoloader 的扫描逻辑，反而更复杂。
   - 与 mermaid.mjs 同构的"两阶段流水线（preprocessAll → renderAll）+ 订阅
     document$ + 物理隔离 Material Shadow DOM"架构，在本仓库已被验证稳定，
     markmap 沿用同一套骨架，维护心智负担最低。
   - 精细控制：可定制默认展开层级、错误回显、容器类名隔离、SPA 切页重渲染等。

   容器约定（与 mermaid 对称）：
   - 源码容器：<pre class="markmap-src"><code>markdown 大纲</code></pre>
     （由 superfences 的 custom_fences 配置产出，class 名称规避 Material bundle.js
      对 .mermaid / .markmap 等约定类名的自动扫描）
   - 渲染容器：<div class="markmap-rendered">，内嵌 <svg>

   CDN 说明：
   - 使用 jsdelivr 的 /+esm 产物（自动把 CommonJS 转 ESM，并解析 d3 等传递依赖）。
     这是 markmap-view 在浏览器里能直接 import 的最简方式；若 /+esm 不可用，
     可手动切换到 esm.sh（同样提供浏览器 ESM 打包服务）。
   - 与 mermaid.mjs 的 CDN 策略一致，统一走 jsdelivr。 */
import { Transformer } from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18/+esm';
import { Markmap } from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18/+esm';

// Transformer 作为模块级单例：同一个 Transformer 实例在整站复用，避免每次渲染
// 重复初始化内部的 remark 插件链（markmap 内部 transformer 成本不低）
const transformer = new Transformer();

// 每次渲染需要唯一 id，避免 SVG 内部 defs（clipPath / marker 等）id 冲突
let renderSeq = 0;

/* ──────────────────────────────────────────────
   暗色主题同步（走 markmap 官方扩展点，不与其内部 CSS 斗优先级）：
   ---------------------------------------------
   markmap-view 自带暗色规则，激活后会把整套 CSS 变量重绑为暗色：
     --markmap-text-color / --markmap-code-bg / --markmap-code-color /
     --markmap-circle-open-bg

   ⚠️ 关键坑（v0.18 实测源码）：其暗色 CSS 是**后代选择器**——
     .markmap-dark .markmap { --markmap-text-color: #eee; ... }
   两个类之间有空格，意味着 `.markmap-dark` 必须加在 `<svg class="markmap">`
   的**祖先元素**上，而不是 SVG 自身。若误加在 SVG 上（让两个类同级共存），
   后代选择器永远命中不到，CSS 变量不切换，暗色主题视觉上表现为"没反应"。
   本模块因此把类加到外层容器 <div class="markmap-rendered">。

   Material 的主题开关会改 <body data-md-color-scheme="default|slate">（证据：
   mkdocs-material 源码 src/templates/assets/javascripts/components/palette/index.ts
   `document.body.setAttribute('data-md-color-${key}', value)`），本模块：
   1. 每次新容器渲染后，根据当前主题同步 markmap-dark 类到容器
   2. 模块级安装一次 MutationObserver，监听 data-md-color-scheme 变化，
      切换时批量同步页面内所有已渲染容器
   ────────────────────────────────────────────── */
// 统一日志前缀，默认关闭（需要排查时在控制台执行 window.__MARKMAP_DEBUG__ = true 即可开启），
// 避免正常阅读时控制台被波发日志污染
const LOG_PREFIX = '[markmap]';
const debug = () => typeof window !== 'undefined' && window.__MARKMAP_DEBUG__ === true;
const log = (...args) => { if (debug()) console.log(LOG_PREFIX, ...args); };
const warn = (...args) => console.warn(LOG_PREFIX, ...args);

function isDarkTheme() {
  const scheme = document.body && document.body.getAttribute('data-md-color-scheme');
  return scheme === 'slate';
}

// ⭐ 关键：markmap-view 0.18 内部的暗色规则用的是后代选择器：
//     .markmap-dark .markmap { --markmap-text-color: #eee; ... }
// 注意：`.markmap-dark` 与 `.markmap` 中间有空格，这是"后代"而非"自身兼有"。
// 因此，必须把 `markmap-dark` 加到 <svg class="markmap"> 的**祖先**上（容器 div），
// 而不是 SVG 自身；否则后代选择器永远命中不到 SVG，字体颜色变量不会切换。
// 之前把类加在 SVG 上是前几轮调试暗色主题一直不生效的根因。
function syncDarkClass(container) {
  const dark = isDarkTheme();
  container.classList.toggle('markmap-dark', dark);
  log('syncDarkClass:', {
    containerClass: container.getAttribute('class'),
    dark,
    bodyScheme: document.body && document.body.getAttribute('data-md-color-scheme'),
  });
}

function syncAllDarkClass(reason) {
  const dark = isDarkTheme();
  const containers = document.querySelectorAll('.markmap-rendered');
  log('syncAllDarkClass triggered:', {
    reason,
    dark,
    bodyScheme: document.body && document.body.getAttribute('data-md-color-scheme'),
    containerCount: containers.length,
  });
  containers.forEach(c => c.classList.toggle('markmap-dark', dark));
}

// 模块级单次安装：监听 body 上 data-md-color-scheme 属性变化
// 只监听属性变化，成本极低；attributeFilter 精确到这一个属性，不会被其他变化触发
// 注意：ESM 模块解析可能早于 <body> 创建（如果 <script type="module"> 在 <head>），
// 故用 IIFE + 延迟安装兼容这种场景，并打印挂载日志确认执行时机
function installThemeObserver() {
  if (!document.body) {
    log('installThemeObserver: document.body not ready, retry on DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', installThemeObserver, { once: true });
    return;
  }
  const themeObserver = new MutationObserver((mutations) => {
    log('MutationObserver fired:', mutations.map(m => ({
      type: m.type,
      attrName: m.attributeName,
      oldValue: m.oldValue,
      newValue: document.body.getAttribute(m.attributeName),
    })));
    syncAllDarkClass('mutation');
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-md-color-scheme'],
    attributeOldValue: true,
  });
  log('installThemeObserver: observer attached to <body>, initial scheme =',
    document.body.getAttribute('data-md-color-scheme'));
}
installThemeObserver();

/* ──────────────────────────────────────────────
   工具栏（7 按钮）：放大 / 缩小 / 上 / 下 / 左 / 右 / 居中
   ---------------------------------------------
   设计取舍：
   1. 不引入 markmap-toolbar 官方包。官方默认 4 按钮（zoomIn/Out/fit/recurse）
      覆盖不了"上下左右"；且其胶囊深色视觉与 Material 主题不一致，二次定制
      成本比自研还高。自研只需调用 Markmap 实例已暴露的三个 API：
        - mm.rescale(k)    ：按比例缩放，k=1.25 放大、k=0.8 缩小
        - mm.fit()         ：自动缩放并居中到当前视图
        - mm.svg + mm.zoom ：底层 d3 选择器与 zoom behavior，用于编程式平移
      这样零运行时依赖，也能精准对齐本站 Material 视觉。
   2. 图标用 Material Design Icons 的 SVG path（内联字符串），与 mkdocs-material
      theme.icon 所用的同一套图标库保持命名哲学一致，避免引第三方图标字体。
   3. 仅在容器进入"激活态"（.markmap-active）时显示工具栏。默认态隐藏，
      避免与右下角"点击激活"提示条打架、不干扰读者正常阅读。
   4. 平移步长取 SVG 可视高/宽的 15%——实测"方向感明显但不会飞出视野"。
   ────────────────────────────────────────────── */

// Material Design Icons SVG path（来源 https://pictogrammers.com/library/mdi/）
// 只保留纯 path 字符串，外层在 createBtn 里用统一 viewBox 包裹
const MDI_ICONS = {
  zoomIn:   'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14m2.5-4h-2v2H9v-2H7V9h2V7h1v2h2z',
  zoomOut:  'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14M7 9h5v1H7z',
  up:       'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  down:     'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  left:     'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z',
  right:    'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
  center:   'M5 15H3v4c0 1.1.9 2 2 2h4v-2H5zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2m0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3',
  // MDI `fullscreen` / `fullscreen-exit`（与 Mermaid 侧保持像素级一致）
  fullscreen:     'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  fullscreenExit: 'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z',
};

// 共享单飞锁：Mermaid / Markmap 两侧任一先加载将创建实例，后加载方直接复用。
// 封装为 getter 以兼容 mermaid.mjs 未被加载的场景（纯 Markmap 页面）。
function getFullscreenLock() {
  if (typeof window === 'undefined') return null;
  // 若 Mermaid 侧已创建则复用；否则当场构造同语义的最小实现，避免此处导入 mermaid.mjs。
  if (!window.__diagramFullscreenLock__) {
    const set = new Set();
    let snapshotOverflow = null;
    let locked = false;
    const acquire = () => {
      if (locked) return;
      snapshotOverflow = document.body.style.overflow;
      document.body.classList.add('diagram-fullscreen-lock');
      locked = true;
    };
    const release = () => {
      if (!locked) return;
      document.body.classList.remove('diagram-fullscreen-lock');
      document.body.style.overflow = snapshotOverflow ?? '';
      snapshotOverflow = null;
      locked = false;
    };
    window.__diagramFullscreenLock__ = {
      enter(c) { if (set.has(c)) return; set.add(c); if (set.size === 1) acquire(); },
      exit(c)  { if (!set.has(c)) return; set.delete(c); if (set.size === 0) release(); },
      clear()  { set.clear(); release(); },
      has(c)   { return set.has(c); },
      get size() { return set.size; },
    };
  }
  return window.__diagramFullscreenLock__;
}

/**
 * Markmap 侧伪全屏外壳：切类 + 锁 + 按钮属性同步 + 显式 mm.fit() 重算。
 * 与 Mermaid 版的差别：markmap 的 d3-zoom 不监听 window resize，必须调 mm.fit() 才能
 * 重新自适应标纯容器尺寸。退出全屏同样再调一次 mm.fit()，避免回到较小容器时后
 * 内容超出边界。※ 由于「退出保留 viewBox」的硬性需求（需求 3.5）主要针对 Mermaid 的
 * SVG viewBox 状态机；markmap 的 d3-zoom transform 会被 mm.fit() 重置，这是 markmap-view
 * 自身的 API 语义特性。本期对齐 Mermaid 侧「退出时自适应新容器尺寸」的用户感知。
 */
// 全屏态下容器的原位置锚点（placeholder）存储——WeakMap 避免 DOM 内存泄漏
const fullscreenPlaceholders = new WeakMap();

/**
 * 同步 markmap-view 的 scrollForPan 行为，使滚轮语义随容器状态变化。
 *
 * 行为矩阵（激活、全屏任一为真 → 裸滚轮缩放；都假 → 平台默认平移）：
 *
 *  | markmap-active | diagram-fullscreen | scrollForPan | 裸滚轮语义 |
 *  | :-: | :-: | :-- | :-- |
 *  |  ❌ |  ❌  | 平台默认（Mac=true / 其他=false） | 平移 / 缩放（依平台） |
 *  |  ✅ |  ❌  | false | 缩放 |
 *  |  ❌ |  ✅  | false | 缩放 |
 *  |  ✅ |  ✅  | false | 缩放 |
 *
 * 为什么走 markmap-view 原生 setOptions 接口：markmap-view 0.18 内部的 d3-zoom filter
 * 实时读 this.options.scrollForPan 引用，setOptions({ scrollForPan }) 立即改写 filter
 * 行为，无须重建实例。平台默认值与 markmap-view 源码的模块级常量 `f` 一致，保证退出
 * 交互态后行为与"未加载 Markmap"时用户熟悉的默认保持一致。
 */
function applyScrollForPan(container, mm) {
  if (!mm || typeof mm.setOptions !== 'function') return;
  const needsZoom =
    container.classList.contains('markmap-active') ||
    container.classList.contains('diagram-fullscreen');
  const platformDefault = typeof navigator !== 'undefined'
    && navigator.userAgent.includes('Macintosh');
  mm.setOptions({ scrollForPan: needsZoom ? false : platformDefault });
}

function toggleFullscreen(container, button, mm) {
  const nowFullscreen = !container.classList.contains('diagram-fullscreen');

  // ⭐ DOM 级逃逸（Portal 模式）：将容器从原位置提升到 document.body 下
  // ─────────────────────────────────────────────────────────────────
  // 为什么必须逃逸：CSS 规范硬约束——若任一祖先元素上有 `transform` / `filter` /
  // `perspective` / `will-change: transform` / `contain: layout|paint|strict|content`
  // 等声明，会为其后代的 `position: fixed` 建立新的 containing block，让 fixed 相对
  // 该祖先定位而非视口。本站 `.md-content__inner` 被 `page-fade-in` 动画施加了
  // `transform: translateY(...)`，导致 `.diagram-fullscreen` 的 `position: fixed`
  // 被劫持到正文栏内，全屏视觉上只占正文宽度。
  // 业界同类场景（react-modal / tippy.js / @floating-ui portal）均采用此法。
  // 实现细节：插入一个占位 span 记住原位置，退出时用占位替换还原。
  if (nowFullscreen) {
    const placeholder = document.createElement('span');
    placeholder.style.display = 'none';
    placeholder.setAttribute('data-markmap-fullscreen-placeholder', '');
    container.parentNode.insertBefore(placeholder, container);
    fullscreenPlaceholders.set(container, placeholder);
    document.body.appendChild(container);
  } else {
    const placeholder = fullscreenPlaceholders.get(container);
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(container, placeholder);
      fullscreenPlaceholders.delete(container);
    }
  }

  container.classList.toggle('diagram-fullscreen', nowFullscreen);

  const lock = getFullscreenLock();
  if (lock) {
    if (nowFullscreen) lock.enter(container);
    else lock.exit(container);
  }

  // 全屏态切换后同步滚轮语义（矩阵见 applyScrollForPan 头注释）
  applyScrollForPan(container, mm);

  if (button) {
    const iconKey = nowFullscreen ? 'fullscreenExit' : 'fullscreen';
    const label = nowFullscreen ? '退出全屏' : '进入全屏';
    button.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS[iconKey]}"/></svg>`;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', nowFullscreen ? 'true' : 'false');
  }

  // 下一帧调用 mm.fit()：等浏览器应用 .diagram-fullscreen 的 position:fixed/100vh，
  // 使容器的 getBoundingClientRect 更新到全屏尺寸后再测量重算，保证树布局覆盖整个视口。
  if (mm && typeof mm.fit === 'function') {
    requestAnimationFrame(() => { try { mm.fit(); } catch {} });
  }
}

// CSS 只注入一次；所有选择器都作用域到 .markmap-rendered / .markmap-toolbar，避免污染全局
let toolbarStylesInjected = false;
function injectToolbarStyles() {
  if (toolbarStylesInjected) return;
  toolbarStylesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-markmap-toolbar', '');
  style.textContent = `
    .markmap-rendered { position: relative; }
    .markmap-toolbar {
      position: absolute;
      top: 8px;
      left: 8px;
      display: none;                                  /* 默认隐藏 */
      gap: 4px;
      padding: 4px;
      background: var(--md-default-bg-color);
      border: 1px solid var(--md-default-fg-color--lightest);
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      z-index: 2;
      user-select: none;
    }
    .markmap-rendered.markmap-active .markmap-toolbar { display: inline-flex; }
    .markmap-toolbar-group {
      display: inline-flex;
      gap: 2px;
    }
    .markmap-toolbar-sep {
      width: 1px;
      background: var(--md-default-fg-color--lightest);
      margin: 2px 2px;
    }
    .markmap-toolbar button {
      all: unset;                                     /* 清掉 Material 对 button 的全局样式 */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--md-default-fg-color--light);
      transition: background-color .12s, color .12s;
    }
    .markmap-toolbar button:hover {
      background: var(--md-default-fg-color--lightest);
      color: var(--md-accent-fg-color);
    }
    .markmap-toolbar button:active {
      background: var(--md-default-fg-color--lighter);
    }
    .markmap-toolbar button:focus-visible {
      outline: 2px solid var(--md-accent-fg-color);
      outline-offset: 1px;
    }
    .markmap-toolbar button svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 在容器内创建 7 按钮工具栏并返回 dispose 钩子。
 * @param {HTMLElement} container .markmap-rendered 容器
 * @param {Markmap}     mm        Markmap.create 返回的实例
 * @returns {() => void} 清理函数：移除工具栏节点
 */
function createToolbar(container, mm) {
  injectToolbarStyles();

  const toolbar = document.createElement('div');
  toolbar.className = 'markmap-toolbar';
  // 阻止工具栏自身的点击冒泡到容器（容器点击会进入激活态，这里已处于激活态）
  // 更关键：阻止点击工具栏被 document 的 mousedown 监听误判为"容器外点击"退出激活态。
  toolbar.addEventListener('mousedown', (ev) => ev.stopPropagation());

  // 按钮工厂：统一生成 button + Material 图标 SVG
  const makeBtn = (iconKey, title, handler) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS[iconKey]}"/></svg>`;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      try { handler(); } catch (e) { warn('toolbar action failed:', title, e); }
    });
    return btn;
  };

  /* 缩放：rescale 是 markmap-view 官方公共 API，参数是"相对当前的乘数"，
     带内建 duration 动画，比自己操作 d3 zoom 更稳。 */
  const zoomIn  = () => mm.rescale(1.25);
  const zoomOut = () => mm.rescale(0.8);

  /* 平移：markmap-view 实例暴露了 svg（d3 selection）和 zoom（d3 zoom behavior），
     用 zoom.translateBy 配合 svg.transition() 触发带动画的平移——
     与 rescale 内部实现同构，视觉上和其他按钮一致。
     步长取当前 SVG 客户区尺寸的 15%，保证在不同屏幕/容器下方向感一致。 */
  const translate = (dxRatio, dyRatio) => {
    if (!mm.svg || !mm.zoom) return;
    const node = mm.svg.node();
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const dx = rect.width  * dxRatio;
    const dy = rect.height * dyRatio;
    mm.svg.transition().duration(200).call(mm.zoom.translateBy, dx, dy);
  };
  const panUp    = () => translate(0, +0.15);   // 视图向下移 = 内容相对向上
  const panDown  = () => translate(0, -0.15);
  const panLeft  = () => translate(+0.15, 0);
  const panRight = () => translate(-0.15, 0);

  /* 居中：fit() 既重置缩放到自适应、也居中，作为"恢复" reset 按钮最直观 */
  const fitCenter = () => mm.fit();

  // 分组：[缩放] | [方向键十字] | [居中]
  const zoomGroup = document.createElement('div');
  zoomGroup.className = 'markmap-toolbar-group';
  zoomGroup.append(
    makeBtn('zoomIn',  '放大',  zoomIn),
    makeBtn('zoomOut', '缩小',  zoomOut),
  );

  const panGroup = document.createElement('div');
  panGroup.className = 'markmap-toolbar-group';
  panGroup.append(
    makeBtn('left',  '向左平移', panLeft),
    makeBtn('up',    '向上平移', panUp),
    makeBtn('down',  '向下平移', panDown),
    makeBtn('right', '向右平移', panRight),
  );

  const resetGroup = document.createElement('div');
  resetGroup.className = 'markmap-toolbar-group';
  // 第 3 组 = [恢复居中 · 全屏]，并列两按钮（与 Mermaid 侧对称）。
  // 全屏按钮手工构造：需要按钮实例引用供 toggleFullscreen 切换图标/aria 属性。
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.type = 'button';
  fullscreenBtn.className = 'markmap-fullscreen-btn';  // 语义类：供 ESC 路径精确定位
  fullscreenBtn.title = '进入全屏';
  fullscreenBtn.setAttribute('aria-label', '进入全屏');
  fullscreenBtn.setAttribute('aria-pressed', 'false');
  fullscreenBtn.innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS.fullscreen}"/></svg>`;
  fullscreenBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    try { toggleFullscreen(container, fullscreenBtn, mm); }
    catch (e) { warn('toolbar action failed: 全屏', e); }
  });
  resetGroup.append(makeBtn('center', '恢复居中', fitCenter), fullscreenBtn);

  const sep = () => {
    const s = document.createElement('div');
    s.className = 'markmap-toolbar-sep';
    return s;
  };

  toolbar.append(zoomGroup, sep(), panGroup, sep(), resetGroup);
  container.appendChild(toolbar);

  return () => { toolbar.remove(); };
}

/* ──────────────────────────────────────────────
   滚轮拦截策略（解决"悬停在图上滚轮时页面不能滚动"）：
   ---------------------------------------------
   markmap-view 内部用 d3-zoom 在 svg 上绑定 wheel 事件，d3-zoom 会调
   preventDefault() 吃掉 wheel——在正文阅读场景下是干扰而非功能。解决思路：
   在容器的"捕获阶段"拦 wheel，根据当前状态决定是否用 stopPropagation
   阻止事件下传给 d3-zoom——一旦打断，浏览器默认页面滚动逻辑就会生效。

   三档策略（与读者习惯对齐）：
   1. 默认态：wheel 穿透到页面，读者滚动不被打断
   2. 按住 Ctrl / ⌘ + wheel：临时缩放（Google Maps 式，一次性交互）
   3. 点击容器：进入激活态，wheel 直接给 markmap 缩放；点击容器外任意位置退出

   技术要点：必须用 { capture: true }，因为 d3-zoom 的 wheel handler 绑在
   svg 元素上（也是冒泡阶段），我们需要在更早的捕获阶段决定是否放行。
   ────────────────────────────────────────────── */
function attachScrollGuard(container, mm) {
  // 状态标记：是否已进入交互模式（永久性缩放/拖拽）
  let active = false;
  const setActive = (next) => {
    if (active === next) return;
    active = next;
    container.classList.toggle('markmap-active', active);
    // 激活 / 退出激活都要同步滚轮语义（矩阵见 applyScrollForPan 头注释）
    applyScrollForPan(container, mm);
  };

  // wheel 拦截：捕获阶段运行，早于 d3-zoom handler
  container.addEventListener('wheel', (ev) => {
    // 放行条件：激活态 或 按住 Ctrl/⌘/Meta。这两种情况下 wheel
    // 正常冒泡给 markmap，markmap 会 preventDefault 防止页面滚动，符合读者预期
    if (active || ev.ctrlKey || ev.metaKey) return;

    // 默认态：阻止事件下传给 d3-zoom，浏览器默认行为（页面滚动）自动生效
    // 注意：不调 preventDefault，否则页面滚动反而被打断
    ev.stopPropagation();
  }, { capture: true, passive: true });

  // 点击容器：进入激活态
  container.addEventListener('click', () => setActive(true));

  // 点击容器外：退出激活态。用 mousedown 而非 click 是为了更快的响应
  const outsideHandler = (ev) => {
    if (!container.contains(ev.target)) setActive(false);
  };
  document.addEventListener('mousedown', outsideHandler);

  // ESC 键：若在全屏态，先完整退出全屏（复用 toggleFullscreen 的 Portal 还原 /
  // 按钮图标 / mm.fit() 全套逻辑）；若在激活态，再退出激活。两者可叠加触发。
  const keyHandler = (ev) => {
    if (ev.key !== 'Escape') return;
    if (container.classList.contains('diagram-fullscreen')) {
      const btn = container.querySelector('.markmap-fullscreen-btn');
      toggleFullscreen(container, btn, mm);
    }
    if (active) setActive(false);
  };
  document.addEventListener('keydown', keyHandler);

  // 清理钩子：SPA 切页时调用，避免小概率的事件泄漏
  container._markmapGuardDispose = () => {
    document.removeEventListener('mousedown', outsideHandler);
    document.removeEventListener('keydown', keyHandler);
  };
}

/**
 * 从 <code> 节点的 textContent 提取 markmap 源码（Markdown 大纲）。
 * 不直接取 <pre>.textContent 是为了避开兄弟节点污染，与 mermaid.mjs 一致。
 */
function extractSource(preNode) {
  const code = preNode.querySelector(':scope > code');
  if (code) return code.textContent;
  return preNode.textContent;
}

/**
 * 预处理：把所有 <pre class="markmap-src"><code>src</code></pre> 转成
 * <div class="markmap-rendered" data-markmap-src="src">（空 div，等待 renderAll 填 SVG）。
 * 该阶段纯 DOM 替换，极快，不阻塞首屏；即便后续渲染失败也能随时重试。
 */
function preprocessAll() {
  const pres = document.querySelectorAll('pre.markmap-src');
  pres.forEach(pre => {
    const src = extractSource(pre);
    if (!src || !src.trim()) return;
    const div = document.createElement('div');
    div.className = 'markmap-rendered';
    div.dataset.markmapSrc = src;
    pre.replaceWith(div);
  });
}

/**
 * 渲染单个容器：transformer 把 Markdown 大纲转成 markmap 内部树，
 * 在容器内创建 <svg> 并由 Markmap.create 绘制。
 *
 * 选项说明：
 * - initialExpandLevel: 3 —— 默认展开前 3 层，兼顾首屏信息密度与读者概览需求
 * - maxWidth: 0          —— 节点文字不强制换行截断，长节点自然撑开
 * - duration: 300        —— 展开/折叠动画时长（毫秒），体感流畅
 * - embedGlobalCSS: true —— markmap 默认样式注入到页面，保证字体/颜色生效
 */
async function renderOne(container) {
  const source = container.dataset.markmapSrc;
  if (!source) return;

  try {
    // ① Markdown 大纲 → markmap 树
    const { root } = transformer.transform(source);

    // ② 创建 SVG 容器（每个 markmap 独占一个 svg）
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', `markmap-svg-${Date.now()}-${renderSeq++}`);
    // 显式占位尺寸：markmap-view 内部会根据容器尺寸自适应，宽度铺满、高度给足
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    // 在 Markmap.create 之前同步暗色类（加在容器而非 SVG 上，见 syncDarkClass 头注释）：
    // markmap-view 会在初次渲染时读取 CSS 变量，等它创建完再加类会多一次重绘。
    syncDarkClass(container);
    container.appendChild(svg);

    log('renderOne: before Markmap.create', {
      svgId: svg.id,
      containerClass: container.getAttribute('class'),
      dark: isDarkTheme(),
    });

    // ③ 实例化 Markmap 渲染
    const mm = Markmap.create(svg, {
      initialExpandLevel: 3,
      maxWidth: 0,
      duration: 300,
      embedGlobalCSS: true,
    }, root);

    // ♔ 绑定滚轮拦截逻辑（默认不吞页面滚动，点击/Ctrl 才激活缩放）
    attachScrollGuard(container, mm);

    // ♕ 挂载工具栏（仅激活态显示，dispose 钩子交给容器统一管理）
    const disposeToolbar = createToolbar(container, mm);
    const prevDispose = container._markmapGuardDispose;
    container._markmapGuardDispose = () => {
      if (typeof prevDispose === 'function') prevDispose();
      disposeToolbar();
    };

    log('renderOne: after Markmap.create', {
      svgId: svg.id,
      svgClassAttr: svg.getAttribute('class'),
      containerClass: container.getAttribute('class'),
    });

    container.dataset.rendered = 'true';
  } catch (e) {
    console.warn('[markmap] render error:', e, '\nsource:', source.slice(0, 200));
    container.dataset.rendered = 'error';
    // 渲染失败时用 <pre> 回显源码，便于读者识别哪张图出了问题
    container.innerHTML = `<pre style="color:#c00;background:#fff3f3;padding:8px;border:1px solid #fcc;border-radius:4px;white-space:pre-wrap;">${
      source.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))
    }</pre>`;
  }
}

/**
 * 渲染调度：串行处理所有未渲染容器。
 * 串行而非并发的理由：markmap-view 内部使用共享的 d3 zoom / 全局样式注入，
 * 并发渲染容易出现样式覆盖与 id 冲突（与 mermaid.mjs 同）。
 */
async function renderAll() {
  // SPA 切页兜底：清空全屏锁集合 + 恢复 body.overflow 快照 + 移除锁类。
  // 与 Mermaid 侧幂等：计单飞锁已被清理过再 clear() 无副作用；两侧同时挂在 document$
  // 订阅里保证任一侧在纯 Markmap / 纯 Mermaid 页面中单独工作时也有兜底。
  const lock = getFullscreenLock();
  if (lock) lock.clear();

  // SPA 切页残留清理：上一次进入全屏时我们把容器提升到了 <body> 下（DOM Portal），
  // Material navigation.instant 只会替换 .md-container 下的 DOM，挂在 body 顶层的
  // 全屏容器与正文中的 placeholder 都会残留。此处一并清掉。
  document.querySelectorAll('.markmap-rendered.diagram-fullscreen').forEach(node => {
    if (node.parentNode === document.body) node.remove();
  });
  document.querySelectorAll('[data-markmap-fullscreen-placeholder]').forEach(node => node.remove());

  preprocessAll();
  const nodes = document.querySelectorAll(
    'div.markmap-rendered[data-markmap-src]:not([data-rendered="true"]):not([data-rendered="error"])'
  );
  if (nodes.length === 0) return;
  for (const node of nodes) {
    // 若已有 SVG 残留（比如 SPA 切页回来），先清空再渲染，避免叠加
    if (node.querySelector(':scope > svg')) {
      // 同时释放旧的滚轮拦截钩子，避免 document 上的全局监听堆积
      if (typeof node._markmapGuardDispose === 'function') {
        node._markmapGuardDispose();
        node._markmapGuardDispose = null;
      }
      node.innerHTML = '';
    }
    await renderOne(node);
  }
}

/* ──────────────────────────────────────────────
   触发时机（与 mermaid.mjs 完全一致）：
   - Material Instant Navigation：订阅 document$，每次切页触发
   - 非 SPA 场景：按 readyState 分派 DOMContentLoaded 或立即执行
   ────────────────────────────────────────────── */
if (typeof window.document$ !== 'undefined' && typeof window.document$.subscribe === 'function') {
  window.document$.subscribe(() => {
    requestAnimationFrame(renderAll);
  });
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAll);
} else {
  renderAll();
}
