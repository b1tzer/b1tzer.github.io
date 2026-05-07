/* Mermaid 运行时前端渲染
   ─────────────────────────────────────
   为何不用 class="mermaid"：Material for MkDocs 9.x 会扫描 .mermaid 元素并
   用 Shadow DOM 包装 SVG，导致选择器 / 复制 / 渲染定制全部失效。
   解决：容器改用 <pre class="mermaid-src"> (superfences) → 渲染后换为
   <div class="mermaid-rendered">，全程用 mermaid.render() 拿 SVG 字符串手动
   innerHTML 到 light DOM，物理隔离 Material 自动接管。 */
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';

// 注册 ELK 布局器——必须在 initialize 之前调用，否则 layout: "elk" 无效
mermaid.registerLayoutLoaders(elkLayouts);

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  layout: "elk",
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true, showSequenceNumbers: false, actorMargin: 50, messageMargin: 35 },
  classDiagram: { useMaxWidth: true },
  stateDiagram: { useMaxWidth: true },
  er: { useMaxWidth: true },
});

/* 渲染调度：
   1) 不用 mermaid.run()，避免 Shadow DOM 包装
   2) 两阶段渲染：预处理（preprocessAll）把 <pre> 换成空 <div>、把源码存到 dataset；
      渲染（renderAll）扫描未渲染的 <div>、调 mermaid.render() 拿 SVG 字符串 innerHTML 写入。
   3) 拆分的好处：源码永久存在 dataset，渲染失败可重试；预处理纯 DOM 替换、不阻塞首屏。
   4) Material Instant Navigation 场景：document$ 在切页时触发，新页面未处理节点会被重新识别。 */

// 每次 render 需要唯一 id，避免 mermaid 内部 SVG id 冲突
let renderSeq = 0;

/**
 * 从 <code> 节点的 textContent 提取源码。
 * 不使用 <pre>.textContent 是为了避开兄弟节点污染场景。
 */
function extractSource(preNode) {
  const code = preNode.querySelector(':scope > code');
  if (code) return code.textContent;
  // 兜底：若 superfences 配置变动导致没有 <code> 包裹，直接用 pre 的 textContent
  return preNode.textContent;
}

/**
 * 预处理：把所有 <pre class="mermaid-src"><code>src</code></pre> 转成
 * <div class="mermaid-rendered" data-mermaid-src="src">（空 div，等待 renderAll 填 SVG）
 */
function preprocessAll() {
  const pres = document.querySelectorAll('pre.mermaid-src');
  pres.forEach(pre => {
    const src = extractSource(pre).trim();
    if (!src) return;
    const div = document.createElement('div');
    div.className = 'mermaid-rendered';
    div.dataset.mermaidSrc = src;
    pre.replaceWith(div);
  });
}

async function renderOne(container) {
  const source = container.dataset.mermaidSrc;
  if (!source) return;

  try {
    const id = `mermaid-svg-${Date.now()}-${renderSeq++}`;
    const { svg, bindFunctions } = await mermaid.render(id, source);
    // ⭐ 关键：innerHTML 直接写入 SVG 字符串 → 纯 light DOM，无 Shadow DOM
    container.innerHTML = svg;
    // click 等交互绑定（securityLevel: "loose" 下才有效）
    if (bindFunctions) bindFunctions(container);
    container.dataset.rendered = 'true';
    // ⭐ 挂载 B1 档缩放/平移交互（Ctrl/⌘+滚轮缩放、拖拽平移、双击复位）
    // 包一层 try-catch 做防御：交互层任何异常（签名变更、浏览器兼容等）都不应阻断
    // 渲染链路——SVG 已经通过 innerHTML 写入，至少"能看到图"这一核心功能必须保住。
    const svgEl = container.querySelector(':scope > svg');
    if (svgEl) {
      try { enablePanZoom(svgEl, container); }
      catch (e) { console.warn('[mermaid] enablePanZoom failed:', e); }
    }
  } catch (e) {
    console.warn('[mermaid] render error:', e, '\nsource:', source.slice(0, 200));
    container.dataset.rendered = 'error';
    // 渲染失败时用 <pre> 回显源码，便于读者识别哪张图出了问题
    container.innerHTML = `<pre style="color:#c00;background:#fff3f3;padding:8px;border:1px solid #fcc;border-radius:4px;white-space:pre-wrap;">${
      source.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))
    }</pre>`;
  }
}

async function renderAll() {
  // SPA 切页兜底：清空全屏锁集合 + 恢复 body.overflow 快照 + 移除锁类。
  // 场景：读者在全屏态下点侧栏切到新文章 → Material Instant Navigation 直接替换 DOM，
  // 旧容器没机会走 toggleFullscreen 的 exit 分支，body.overflow 会残留导致新页面无法滚动。
  // 单飞集合 clear() 与后续 disposeMermaidContainer 幂等，重复执行无副作用。
  if (fullscreenLock) fullscreenLock.clear();

  // SPA 切页残留清理：上一次进入全屏时我们把容器提升到了 <body> 下（DOM Portal），
  // Material navigation.instant 只会替换 .md-container 下的 DOM，挂在 body 顶层的
  // 全屏容器与其在正文中的 placeholder 都会残留——前者残留为"新文章第一屏遮罩"，
  // 后者残留为"新文章里一个 display:none 的空 span"（无害但肮脏）。
  // 两类残留统一路径：body 顶层的 .diagram-fullscreen 走 disposeMermaidContainer（顺带清掉
  // activeContainers / apiMap 等登记项再 remove），占位 span 直接 remove。
  document.querySelectorAll('.mermaid-rendered.diagram-fullscreen').forEach(node => {
    if (node.parentNode === document.body) disposeMermaidContainer(node);
  });
  document.querySelectorAll('[data-mermaid-fullscreen-placeholder]').forEach(node => node.remove());

  // SPA 切页清理：遍历旧容器，若已脱离 DOM（不在当前 document 树中）则释放其 document 级监听
  // 典型场景：Material Instant Navigation 切换文章后，旧文章的 .mermaid-rendered 被整块替换，
  // 需要释放 disposeMap 中登记的 outsideHandler / keyHandler 派发表条目。
  document.querySelectorAll('.mermaid-rendered').forEach(node => {
    if (!document.body.contains(node)) {
      disposeMermaidContainer(node);
    }
  });

  preprocessAll();
  const nodes = document.querySelectorAll(
    'div.mermaid-rendered[data-mermaid-src]:not([data-rendered="true"]):not([data-rendered="error"])'
  );
  if (nodes.length === 0) return;
  // 串行渲染，避免 mermaid 内部共享状态被并发搞乱
  for (const node of nodes) {
    // 容器若有残留的旧监听（极少见：同一容器被重置后重新渲染），先清干净再重新挂载
    disposeMermaidContainer(node);
    await renderOne(node);
  }
}

// 订阅 Material Instant Navigation 的 document$（每次切页触发），降级到 DOMContentLoaded
const material$ = window.document$;
if (typeof material$?.subscribe === 'function') {
  material$.subscribe(() => { requestAnimationFrame(renderAll); });
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAll);
} else {
  renderAll();
}

/* 模块级容器注册表（取代向 DOM 节点挂自定义字段的反模式）
   ────────────────────────────────────────
   旧方案把 `_mermaidApi` / `_mermaidGuardDispose` 直接挂在 container 上的三个问题：
   ① 污染 DOM 节点、TS 类型系统不友好；
   ② 闭包跟随 DOM 引用存活，容器 remove 后可能延迟回收；
   ③ 每个容器各自向 document 注册一对 mousedown/keydown，N 张图 = N 对监听。

   改造：
   - apiMap / disposeMap：WeakMap，DOM 被 GC 时自动失效。
   - activeContainers：Set，当前处于激活态的容器集合。
   - document 级 mousedown / keydown 全模块唯一一对，遍历 activeContainers 派发。 */

const apiMap = new WeakMap();
const disposeMap = new WeakMap();
const activeContainers = new Set();

// 导出给工具栏 / 外部调试：通过 WeakMap 查询，不污染 DOM
export function getMermaidApi(container) {
  return apiMap.get(container);
}

/* 共享：Diagram 伪全屏 body 滚动锁单飞集合（Mermaid + Markmap 通用）
   ─────────────────────────────────────────────
   语义：enter/exit 维护一个容器集合，集合从空→非空时快照 body.overflow 并加锁类，
         从非空→空时除类并恢复快照值；clear() 为 SPA 切页兜底。
   为何挂 window 单例：Mermaid 与 Markmap 同页加载时，两模块通过 `??=` 拿到同一实例，
         避免两套集合互相覆盖 body.overflow 导致锁失效或残留。 */
function createDiagramFullscreenLock() {
  const set = new Set();
  let snapshotOverflow = null;
  let locked = false;

  function acquire() {
    if (locked) return;
    // 读 style.overflow 而非 getComputedStyle，保证退出时还原的是
    // "其他脚本/行内样式显式设置的值"，若本来就没设置则还原为空字符串（让 UA 默认接管）
    snapshotOverflow = document.body.style.overflow;
    document.body.classList.add('diagram-fullscreen-lock');
    locked = true;
  }
  function release() {
    if (!locked) return;
    document.body.classList.remove('diagram-fullscreen-lock');
    // 恢复快照值（可能是空字符串，意即清掉我们留下的任何痕迹）
    document.body.style.overflow = snapshotOverflow ?? '';
    snapshotOverflow = null;
    locked = false;
  }

  return {
    enter(container) {
      if (set.has(container)) return;
      set.add(container);
      if (set.size === 1) acquire();
    },
    exit(container) {
      if (!set.has(container)) return;
      set.delete(container);
      if (set.size === 0) release();
    },
    clear() {
      set.clear();
      release();
    },
    has(container) { return set.has(container); },
    get size() { return set.size; },
  };
}

// 懒初始化 window 单例；Markmap 侧同样用 `??=` 取到同一实例
if (typeof window !== 'undefined') {
  window.__diagramFullscreenLock__ ??= createDiagramFullscreenLock();
}
const fullscreenLock = (typeof window !== 'undefined') ? window.__diagramFullscreenLock__ : null;

// 容器失效时调用：移出激活集合 + 执行 dispose 钩子 + 清理 WeakMap 登记
function disposeMermaidContainer(container) {
  const dispose = disposeMap.get(container);
  if (typeof dispose === 'function') {
    try { dispose(); } catch {}
  }
  disposeMap.delete(container);
  apiMap.delete(container);
  activeContainers.delete(container);
  // 容器被释放时一并退出全屏锁集合：防止 SPA 切页时 DOM 已离开但容器仍在锁里
  // 导致 body.overflow 残留（归一到共享单飞锁的「集合空时解锁」语义）。
  if (fullscreenLock && fullscreenLock.has(container)) {
    fullscreenLock.exit(container);
    container.classList.remove('diagram-fullscreen');
  }
}

// 全模块唯一的 document 级监听——无论页面有多少张图，监听数恒为 2
document.addEventListener('mousedown', (ev) => {
  // 对每个激活容器判定「点击是否落在容器外」；若是则退出激活态。
  // 容器内部（含 SVG 与工具栏）的 mousedown 已经 stopPropagation 或自然不触发退出
  activeContainers.forEach(container => {
    if (!container.contains(ev.target)) {
      const api = apiMap.get(container);
      api?.exitActive();
    }
  });
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  activeContainers.forEach(container => {
    // ESC 键：若在全屏态，先完整退出全屏（复用 toggleFullscreen 的 Portal 还原 /
    // 按钮图标 / resize 派发全套逻辑）再走激活退出。
    // 顺序要求：先退全屏才能让后续 recenter 在「已回到文中尺寸」下重算 viewBox。
    if (container.classList.contains('diagram-fullscreen')) {
      const btn = container.querySelector('.mermaid-fullscreen-btn');
      toggleFullscreen(container, btn);
    }
    const api = apiMap.get(container);
    api?.exitActive();
  });
});

/* 交互增强实现：分层架构
   ────────────────────────────────────────
     enablePanZoom                       ← 协调器（组装各层）
├── createViewBoxController       ← 纯状态机：viewBox 四元组 + 算子（recenter/zoomAt/panByRatio/applyViewBox）
       ├── attachWheelHandler            ← 三档滚轮
       ├── attachPointerHandlers         ← 鼠标拖拽 + 触屏双指/单指（统一 pointer 总线）
       ├── attachActivation              ← click 进入激活 / exitActive 出口
       └── attachDblclickReset           ← 双击复位

   职责边界：ViewBoxController 不摸 DOM 事件，只提供算子；事件适配层不直接改 cx/cy/cw/ch。
   SVG 的 viewBox 永远保持 mermaid 原始值，容器尺寸由 CSS min-height: 400 托底，
   激活/退出激活不做任何几何变动，所有交互都只改 cx/cy/cw/ch 四元组。 */

// ── 交互参数常量（全部归拢到模块顶层，避免魔数散落） ──
const ZOOM_MIN = 0.5;                    // 视觉最小缩放（viewBox 最大 = iw/ZOOM_MIN）
const ZOOM_MAX = 8;                      // 视觉最大缩放
const ZOOM_STEP = 0.15;                  // 滚轮单步缩放比例
const ZOOM_BTN_FACTOR_IN = 1.25;         // 工具栏放大按钮单次倍率
const ZOOM_BTN_FACTOR_OUT = 0.8;         // 工具栏缩小按钮单次倍率（= 1/1.25，保证点一次大一次抵消）
const PAN_STEP_RATIO = 0.15;             // 工具栏方向按钮：按当前 viewBox 尺寸的百分比平移
const DRAG_THRESHOLD = 5;                // 拖拽阈值（像素）：越过此距离才视为"拖拽"而非"点击"

// Material Design Icons SVG path（与 markmap 保持像素级一致）
const MDI_ICONS = {
  zoomIn:   'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14m2.5-4h-2v2H9v-2H7V9h2V7h1v2h2z',
  zoomOut:  'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14M7 9h5v1H7z',
  up:       'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  down:     'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  left:     'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z',
  right:    'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
  center:   'M5 15H3v4c0 1.1.9 2 2 2h4v-2H5zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2m0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3',
  // MDI `fullscreen` / `fullscreen-exit`（与 zoomIn / zoomOut 同一家族，视觉粗细一致）
  fullscreen:     'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  fullscreenExit: 'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z',
};

/* 工具栏样式运行时注入（复用 markmap 的策略，避免 extra.css 与 JS 逻辑两处散落）：
   - 仅首次调用时注入一次，通过 <style data-mermaid-toolbar> 标签作唯一性标记
   - 选择器全部作用域到 .mermaid-rendered / .mermaid-toolbar，不污染全局
   - 所有颜色走 Material 的 --md-* 变量，自动适配明暗主题
*/
let toolbarStylesInjected = false;
function ensureToolbarStyle() {
  if (toolbarStylesInjected) return;
  if (document.head.querySelector('style[data-mermaid-toolbar]')) {
    toolbarStylesInjected = true;
    return;
  }
  toolbarStylesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-mermaid-toolbar', '');
  style.textContent = `
    .mermaid-toolbar {
      position: absolute;
      top: 8px;
      left: 8px;
      display: none;
      gap: 4px;
      padding: 4px;
      background: var(--md-default-bg-color);
      border: 1px solid var(--md-default-fg-color--lightest);
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      z-index: 2;
      user-select: none;
    }
    .mermaid-rendered.mermaid-active .mermaid-toolbar { display: inline-flex; }
    .mermaid-toolbar-group { display: inline-flex; gap: 2px; }
    .mermaid-toolbar-sep {
      width: 1px;
      background: var(--md-default-fg-color--lightest);
      margin: 2px 2px;
    }
    .mermaid-toolbar button {
      all: unset;
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
    .mermaid-toolbar button:hover {
      background: var(--md-default-fg-color--lightest);
      color: var(--md-accent-fg-color);
    }
    .mermaid-toolbar button:active {
      background: var(--md-default-fg-color--lighter);
    }
    .mermaid-toolbar button:focus-visible {
      outline: 2px solid var(--md-accent-fg-color);
      outline-offset: 1px;
    }
    /* 工具栏内 SVG 图标尺寸——与 markmap.mjs 的 .markmap-toolbar button svg 朴素版本保持一致，
       不加 !important、不显式重置 max-width/max-height：
       - 外层 .mermaid-rendered svg { max-width:100%; height:auto } 的选择器特异性 (0,1,1)
       - 本规则 .mermaid-toolbar button svg 的特异性 (0,2,1)
       后者更高，18px 固定值能正确胜出；保持与 markmap 字面一致，避免"两处各写一套" */
    .mermaid-toolbar button svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/* ──────────────────────────────────────────────
   伪全屏外壳：toggleFullscreen(container, button)
   ─────────────────────────────────────────────
   职责：
   - 切换容器的 .diagram-fullscreen 类
   - 通过共享单飞锁 enter/exit，管理 body.overflow 与 .diagram-fullscreen-lock
   - 同步工具栏按钮的 icon（fullscreen ↔ fullscreenExit）/ title / aria-label / aria-pressed
   - 切换后派发一次 window resize，让 ViewBoxController 的 getBoundingClientRect
     重算（滚轮缩放步长、拖拽位移都依赖 rect，进入/退出视口尺寸变化需要重新测量）

   不做的事（与架构契约一致）：
   - 不触碰 createViewBoxController：全屏只是外壳层，viewBox 逻辑零感知
   - 不 recenter：按钮退出全屏时 viewBox 当前缩放/平移状态**完整保留**（需求 3.5）
   - 不处理激活态：按钮退出仅退出全屏；ESC 退出全屏由模块级 keydown 里走
     exitActive 自然带 recenter（那是激活退出的副作用，不是全屏退出的）
   ────────────────────────────────────────────── */
// 全屏态下容器的原位置锚点（placeholder）存储——WeakMap 避免 DOM 内存泄漏
const fullscreenPlaceholders = new WeakMap();

function toggleFullscreen(container, button) {
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
    placeholder.setAttribute('data-mermaid-fullscreen-placeholder', '');
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

  if (fullscreenLock) {
    if (nowFullscreen) fullscreenLock.enter(container);
    else fullscreenLock.exit(container);
  }

  if (button) {
    const iconKey = nowFullscreen ? 'fullscreenExit' : 'fullscreen';
    const label = nowFullscreen ? '退出全屏' : '进入全屏';
    button.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS[iconKey]}"/></svg>`;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', nowFullscreen ? 'true' : 'false');
  }

  // 派发 resize：viewBox 算子里的 zoomAt / drag 都依赖 getBoundingClientRect，
  // 视口尺寸从 "正文栏宽" 瞬变为 "整屏" 或反之，必须触发一次重算才能保证后续交互步长正确。
  // 下一帧派发：等待浏览器应用 .diagram-fullscreen 的 position:fixed/100vh 规则后再测量。
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

/**
 * 创建 8 按钮工具栏并绑定点击 handler（第 8 个为「全屏」，与「居中」并列在第 3 组末尾）。
 * @param {HTMLElement} container .mermaid-rendered 容器
 * @param {object}      api       { recenter, zoomAt, panByRatio } 容器级 API
 * @returns {() => void} dispose 钩子（移除工具栏 DOM）
 */
function createToolbar(container, api) {
  ensureToolbarStyle();

  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-toolbar';
  // 阻止工具栏 mousedown 被 document 级"外部点击退出"误判
  toolbar.addEventListener('mousedown', (ev) => ev.stopPropagation());

  const makeBtn = (iconKey, title, handler) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS[iconKey]}"/></svg>`;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();  // 避免触发容器 click 进入/重入激活态逻辑
      try { handler(); } catch (e) { console.warn('[mermaid] toolbar action failed:', title, e); }
    });
    return btn;
  };

  // 以容器中心为锚点（需求 3.3 / 3.4）
  const centerXY = () => {
    const rect = container.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  // 工具栏按钮共享一套 api：zoomAt / panByRatio / recenter 都是对 ctrl 的纯算子调用，
  // 不做任何额外的 "fit 容器" 预处理——SVG viewBox 契约保持 mermaid 原始值。

  const zoomIn  = () => { const { x, y } = centerXY(); api.zoomAt(x, y, ZOOM_BTN_FACTOR_IN); };
  const zoomOut = () => { const { x, y } = centerXY(); api.zoomAt(x, y, ZOOM_BTN_FACTOR_OUT); };
  // 方向键：按 SVG 当前 viewBox 的 15% 平移（需求 3.5）
  // ⚠️ 语义校正：操纵 viewBox 的方向与"内容视觉位移方向"相反。
  //    点击"上" → 读者期望内容向上滑 → viewBox 的 y 要向下移（正值）
  //    点击"下" → 内容向下滑 → viewBox y 向上移（负值）
  //    点击"左" / "右" 同理。此处符号均为"viewBox 方向 = 视觉方向相反"。
  const panUp    = () => api.panByRatio(0, +PAN_STEP_RATIO);   // 视觉向上 = viewBox 向下
  const panDown  = () => api.panByRatio(0, -PAN_STEP_RATIO);
  const panLeft  = () => api.panByRatio(+PAN_STEP_RATIO, 0);   // 视觉向左 = viewBox 向右
  const panRight = () => api.panByRatio(-PAN_STEP_RATIO, 0);
  const fitCenter = () => api.recenter();

  const sep = () => {
    const s = document.createElement('div');
    s.className = 'mermaid-toolbar-sep';
    return s;
  };

  const zoomGroup = document.createElement('div');
  zoomGroup.className = 'mermaid-toolbar-group';
  zoomGroup.append(
    makeBtn('zoomIn',  '放大', zoomIn),
    makeBtn('zoomOut', '缩小', zoomOut),
  );

  const panGroup = document.createElement('div');
  panGroup.className = 'mermaid-toolbar-group';
  panGroup.append(
    makeBtn('left',  '向左平移', panLeft),
    makeBtn('up',    '向上平移', panUp),
    makeBtn('down',  '向下平移', panDown),
    makeBtn('right', '向右平移', panRight),
  );

  // 第 3 组 = [恢复居中 · 全屏]，并列两按钮（不新建第 4 组，与 Markmap 对称）。
  // 全屏按钮不经 makeBtn：需要按钮实例引用供 toggleFullscreen 切换图标 / aria / title。
  const resetGroup = document.createElement('div');
  resetGroup.className = 'mermaid-toolbar-group';
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.type = 'button';
  fullscreenBtn.className = 'mermaid-fullscreen-btn';  // 语义类：供 ESC 路径精确定位
  fullscreenBtn.title = '进入全屏';
  fullscreenBtn.setAttribute('aria-label', '进入全屏');
  fullscreenBtn.setAttribute('aria-pressed', 'false');
  fullscreenBtn.innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MDI_ICONS.fullscreen}"/></svg>`;
  fullscreenBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    try { toggleFullscreen(container, fullscreenBtn); }
    catch (e) { console.warn('[mermaid] toolbar action failed: 全屏', e); }
  });
  resetGroup.append(makeBtn('center', '恢复居中', fitCenter), fullscreenBtn);

  toolbar.append(zoomGroup, sep(), panGroup, sep(), resetGroup);
  container.appendChild(toolbar);

  return () => { toolbar.remove(); };
}

/**
 * ViewBoxController：围绕 SVG viewBox 四元组的纯状态机。
 * - 算子：recenter / zoomAt / panByRatio / applyViewBox
 * - 状态：ix/iy/iw/ih（初始锚点，= mermaid 原始 viewBox）、cx/cy/cw/ch（当前）
 *
 * 返回 `null` 表示 SVG 既无 viewBox 又无法通过 getBBox 兜底，调用方应放弃后续挂载。
 */
function createViewBoxController(svg, container) {
  // 初始 viewBox：mermaid 渲染后 SVG 必带 viewBox（我们 initialize 时启用了 useMaxWidth）
  // 若偶发缺失，兜底用 getBBox 补一个
  let initialVB = svg.getAttribute('viewBox');
  if (!initialVB) {
    try {
      const bb = svg.getBBox();
      initialVB = `${bb.x} ${bb.y} ${bb.width} ${bb.height}`;
      svg.setAttribute('viewBox', initialVB);
    } catch {
      return null;   // 没有 viewBox 也无法用 getBBox
    }
  }
  let [ix, iy, iw, ih] = initialVB.split(/\s+/).map(Number);
  let cx = ix, cy = iy, cw = iw, ch = ih;

  function applyViewBox() {
    svg.setAttribute('viewBox', `${cx} ${cy} ${cw} ${ch}`);
  }

  // recenter：回到初始 viewBox = mermaid 原始 viewBox，等价于"回到页面刚打开时的样子"。
  // 双击复位、Esc 退出激活、工具栏「恢复居中」都走这里。
  function recenter() {
    cx = ix; cy = iy; cw = iw; ch = ih;
    applyViewBox();
  }

  /**
   * 以"客户端坐标 (clientX,clientY)"为锚点，按 factor 倍率缩放。
   * factor > 1 = 放大（viewBox 变小），factor < 1 = 缩小。
   * 锚点归一化基准用 svg rect：滚轮/双指的 clientX/Y 是鼠标在 SVG 元素盒内的物理坐标，
   * 用 svg.getBoundingClientRect 才能正确映射到 "viewBox 内的那一点"（与拖拽的平移基准有意用 container 不同）。
   */
  function zoomAt(clientX, clientY, factor) {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const vbX = cx + px * cw;
    const vbY = cy + py * ch;
    const scale = 1 / factor;
    let nw = cw * scale;
    let nh = ch * scale;
    const minW = iw / ZOOM_MAX, maxW = iw / ZOOM_MIN;
    if (nw < minW) { nw = minW; nh = ih / ZOOM_MAX; }
    if (nw > maxW) { nw = maxW; nh = ih / ZOOM_MIN; }
    cx = vbX - px * nw;
    cy = vbY - py * nh;
    cw = nw; ch = nh;
    applyViewBox();
  }

  /** 按当前 viewBox 尺寸的百分比平移。工具栏方向键 / 键盘方向键都走这里。 */
  function panByRatio(dxRatio, dyRatio) {
    cx += cw * dxRatio;
    cy += ch * dyRatio;
    applyViewBox();
  }

  // 供拖拽路径直接读写 cx/cy/cw/ch 的底层访问（拖拽不走 zoomAt/panByRatio 算子）
  // 返回引用对象，拖拽闭包通过 .cx/.cy 读当前值、通过 setXY 写回
  const state = {
    get cx() { return cx; },
    get cy() { return cy; },
    get cw() { return cw; },
    get ch() { return ch; },
    setXY(nx, ny) { cx = nx; cy = ny; },
    setWH(nw, nh) { cw = nw; ch = nh; },
  };

  return {
    applyViewBox,
    recenter,
    zoomAt,
    panByRatio,
    state,
    getSvg: () => svg,
  };
}

/**
 * 三档滚轮策略：默认态无修饰键让页面滚；Ctrl/⌘+滚轮缩放；激活态直接缩放。
 * 监听挂在 container：即使鼠标在 SVG 元素盒以外的容器空白区，滚轮缩放仍然生效，
 * 与 container 上的 pointer 拖拽响应区统一。
 */
function attachWheelHandler(svg, container, ctrl) {
  container.addEventListener('wheel', (e) => {
    const isActive = container.classList.contains('mermaid-active');
    const hasModifier = e.ctrlKey || e.metaKey;
    if (!isActive && !hasModifier) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
    ctrl.zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });
}

/**
 * 桌面端鼠标拖拽 + 移动端触屏（双指捏合缩放 / 单指拖拽）。
 * 统一 pointer 事件总线：同类事件只挂一次监听，内部按 e.pointerType 分流。
 * 事件挂在 container 而非 svg：容器尺寸固定（min-height: 400），即使 SVG 元素盒
 * 只占容器一部分（扁图只占顶部一条），鼠标在容器任意位置都能发起拖拽，不会再出现
 * "点击空白区无响应"的历史问题。
 * 返回 { didDragThisGesture() }：供 attachActivation 判断"刚拖拽过需吞 click"
 * ——"读即重置"语义，一次调用同时完成读取与清零，消除两步操作的时序隐患。
 */
function attachPointerHandlers(svg, container, ctrl) {
  // 鼠标拖拽所需状态
  let dragging = false;
  let dragMoved = false;      // 本次 pointerdown 以来是否已超出阈值
  let dragStartX = 0, dragStartY = 0, dragCX = 0, dragCY = 0;

  // 触屏：双指捏合缩放 + 单指拖拽所需状态
  const touches = new Map();   // pointerId → {x,y}
  let pinchStartDist = 0, pinchStartCW = 0, pinchStartCH = 0, pinchAnchor = null;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;              // 只响应主键
    // ⭐ 关键守卫：若点击落在工具栏内（按钮、图标、分隔条等），不启动拖拽。
    //   根因：container.setPointerCapture(pointerId) 会把后续 pointer 事件
    //   全部劫持到 container，浏览器将不再对按钮派发合成 click 事件——
    //   表现为"按钮能看到，但点击无反应"。工具栏内部的 click 由按钮自己的
    //   click 监听处理，这里直接放行即可。
    if (e.target.closest('.mermaid-toolbar')) return;
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragCX = ctrl.state.cx; dragCY = ctrl.state.cy;
    container.setPointerCapture(e.pointerId);
    // 故意不 preventDefault：让文字 selection 在默认态拖拽下仍可用
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    if (!dragMoved) {
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
      dragMoved = true;
      container.style.cursor = 'grabbing';
    }
    // 拖拽归一化基准用 SVG rect 而非 container：
    // viewBox 与 SVG 元素盒是 1:1 映射，像素→viewBox 换算比例 = cw / svgRect.width。
    // 若用 container 尺寸归一化，瓦图某轴会出现"拖拽很涩"（X/Y 灵敏度不一致）。
    // 响应区仍走 container（盖整个容器有效），与归一化基准正正好是两件独立的事。
    const svgRect = svg.getBoundingClientRect();
    const dx = deltaX / svgRect.width  * ctrl.state.cw;
    const dy = deltaY / svgRect.height * ctrl.state.ch;    ctrl.state.setXY(dragCX - dx, dragCY - dy);
    ctrl.applyViewBox();
  };
  const handleMouseUp = (e) => {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = '';
    try { container.releasePointerCapture(e.pointerId); } catch {}
  };

  const handleTouchDown = (e) => {
    // 同 handleMouseDown 的工具栏守卫：防止触屏在工具栏按钮上按下时被拖拽/捏合吞掉
    if (e.target.closest('.mermaid-toolbar')) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      // 双指捏合初始化：快照起始双指距离与当前 cw/ch，后续 handleTouchMove 按倍率缩放
      const pts = [...touches.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      pinchStartCW = ctrl.state.cw; pinchStartCH = ctrl.state.ch;
      pinchAnchor = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }
  };
  const handleTouchMove = (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && pinchAnchor) {
      const pts = [...touches.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const factor = dist / pinchStartDist;
      // 以最初的中点为锚点缩放到目标倍率：先回到起始 cw/ch 再按 factor 调整
      ctrl.state.setWH(pinchStartCW, pinchStartCH);
      ctrl.zoomAt(pinchAnchor.x, pinchAnchor.y, factor);
      e.preventDefault();
    }
  };
  const handleTouchUp = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinchAnchor = null;
  };

  // 事件统一挂 container（而非 svg）：容器任意位置都能发起拖拽，
  // 避免扁图场景下 SVG 只占顶部一条、空白区点不响应的历史问题。
  container.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') handleTouchDown(e);
    else handleMouseDown(e);
  });
  container.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') handleTouchMove(e);
    else handleMouseMove(e);
  }, { passive: false });
  const handlePointerEnd = (e) => {
    if (e.pointerType === 'touch') handleTouchUp(e);
    else handleMouseUp(e);
  };
  container.addEventListener('pointerup', handlePointerEnd);
  container.addEventListener('pointercancel', handlePointerEnd);

  // 返回单方法接口：attachActivation 在 click 回调里调一次
  // —— "读即重置"，消除两步操作的时序隐患
  return {
    didDragThisGesture() {
      const moved = dragMoved;
      dragMoved = false;
      return moved;
    },
  };
}

/**
 * click 激活入口 + exitActive 出口。
 * 激活时加 container 到 activeContainers 集合，让模块级 document 监听能统一派发退出。
 * 返回 exitActive 闭包，api 对外暴露，由 document 监听通过 apiMap 调用。
 */
function attachActivation(container, ctrl, dragRef) {
  container.addEventListener('click', (e) => {
    // 若本次 pointerdown-up 属于"拖拽"（didDragThisGesture 返回 true），则吞掉本次 click，
    // 避免拖拽松手后误入激活态（需求 6.1、6.2）。
    // 注意：click 在 pointerup 之后触发，didDragThisGesture 内部"读即重置"，
    //      天然保证本轮吞掉后标志位归零，不影响下一次真正的点击激活。
    if (dragRef.didDragThisGesture()) {
      e.stopPropagation();
      return;
    }
    // 激活态 = 纯视觉反馈：仅加高亮边框、显示工具栏、解锁无修饰键滚轮缩放。
    // 绝不在此触碰几何（不改容器尺寸、不改 SVG 尺寸、不改 viewBox），
    // 避免激活/退出瞬间的尺寸跳变——容器高度始终由 CSS min-height: 400 托底，
    // SVG 元素盒尺寸由 mermaid 渲染后的 max-width + height:auto 锁定。
    if (!container.classList.contains('mermaid-active')) {
      container.classList.add('mermaid-active');
      activeContainers.add(container);
    }
  });

  // 退出激活态（由模块级 document 监听派发调用）
  // 退出时 recenter 把 viewBox 拉回初始锚点（= mermaid 原始 viewBox），
  // 激活期间的缩放/拖拽位移在退出时全部复位，图形回到页面刚加载时的样子。
  const exitActive = () => {
    if (!container.classList.contains('mermaid-active')) return;
    container.classList.remove('mermaid-active');
    activeContainers.delete(container);
    ctrl.recenter();
  };
  return exitActive;
}

/** 双击复位：回到 mermaid 原始 viewBox（等价于页面刚打开时的样子）。 */
function attachDblclickReset(svg, ctrl) {
  svg.addEventListener('dblclick', (e) => {
    e.preventDefault();
    ctrl.recenter();
  });
}

/**
 * 顶层协调器：组装状态机 + 事件适配层 + 工具栏，登记 api/dispose 到 WeakMap。
 */
function enablePanZoom(svg, container) {
  const ctrl = createViewBoxController(svg, container);
  if (!ctrl) return;   // SVG 无 viewBox 且 getBBox 失败，放弃交互挂载

  const dragRef = attachPointerHandlers(svg, container, ctrl);
  attachWheelHandler(svg, container, ctrl);
  attachDblclickReset(svg, ctrl);
  const exitActive = attachActivation(container, ctrl, dragRef);

  // 对外 api：供工具栏 + document 级监听 + 外部调试（通过 getMermaidApi 查询 WeakMap）
  const api = {
    recenter: ctrl.recenter,
    zoomAt: ctrl.zoomAt,
    panByRatio: ctrl.panByRatio,
    applyViewBox: ctrl.applyViewBox,
    getSvg: ctrl.getSvg,
    exitActive,
  };
  apiMap.set(container, api);

  // 工具栏（激活态下显示）
  const disposeToolbar = createToolbar(container, api);

  // 资源清理钩子：SPA 切页或 renderAll 重渲染时调用
  disposeMap.set(container, () => {
    activeContainers.delete(container);
    disposeToolbar();
  });
}