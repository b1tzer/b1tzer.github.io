import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';

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

// 必须暴露给 Material for MkDocs 识别（部分内部逻辑会探测 window.mermaid）
window.mermaid = mermaid;

/* ──────────────────────────────────────────────
   渲染调度：解决 instant navigation (SPA) 下的时序问题
   ——
   背景：
   1) mermaid.mjs 是 ESM，异步加载；Material 在 DOMContentLoaded 时
      如果探测到 window.mermaid 不存在，会走自己的降级路径，
      导致首次进入带 mermaid 的页面可能渲染失败，需要刷新。
   2) Material Instant Navigation 每次切页只替换内容区，
      新页面里的 <pre class="mermaid"> 需要重新触发渲染。
   3) 使用 mermaid.run({ querySelector }) 精确指定未渲染的节点，
      避免重复处理已渲染元素。
   ────────────────────────────────────────────── */

/** 选择器：Material 把 ```mermaid 代码块渲染为 <pre class="mermaid">；
 *  superfences 自定义栅栏也可能输出 <div class="mermaid">。
 *  标记 data-processed="true" 是 mermaid 自身用来记录已渲染状态的属性，
 *  这里用 :not([data-processed="true"]) 过滤掉已渲染的节点。*/
const MERMAID_SELECTOR = '.mermaid:not([data-processed="true"])';

async function renderMermaid() {
  try {
    const nodes = document.querySelectorAll(MERMAID_SELECTOR);
    if (nodes.length === 0) return;
    await mermaid.run({ querySelector: MERMAID_SELECTOR });
  } catch (e) {
    // 渲染失败不阻塞页面其他逻辑；控制台打印便于定位
    console.warn('[mermaid] render error:', e);
  }
}

if (typeof window.document$ !== 'undefined' && typeof window.document$.subscribe === 'function') {
  // MkDocs Material SPA 模式：每次页面切换都会触发
  window.document$.subscribe(() => {
    // 用 rAF 等待新 DOM 完成插入，避免个别场景下节点尚未挂载
    requestAnimationFrame(renderMermaid);
  });
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderMermaid);
} else {
  renderMermaid();
}