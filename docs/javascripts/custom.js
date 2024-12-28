/**
 * The Stack - 自定义 JavaScript
 * 功能：
 * 1. 首页反馈组件隐藏（兼容 navigation.instant）
 * 2. Mermaid 图表缩放拖拽（panzoom / svg-pan-zoom 双库 A/B 切换）
 * 3. 重置视图（双击 + 按钮）
 * 4. 移动端交互适配
 * 5. 性能优化（节流、passive 事件）
 */

// ═══════════════════════════════════════════════════════════════
// 全局配置：切换缩放库，可选 'panzoom' 或 'svg-pan-zoom'
// ═══════════════════════════════════════════════════════════════
window.MERMAID_ZOOM_LIB = 'panzoom';

(function () {
  'use strict';

  // ─── 工具函数 ──────────────────────────────────────────────

  /** 节流函数，间隔不低于 16ms（60fps） */
  function throttle(fn, delay) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  /** 检测是否为移动端 */
  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches || navigator.maxTouchPoints > 1;
  }

  /** 检测当前页面是否是首页 */
  function isHomePage() {
    var path = window.location.pathname;
    return path === '/' || path === '/index.html' || path.endsWith('/') && path.split('/').filter(Boolean).length === 0;
  }

  // ─── 首页反馈组件隐藏 ─────────────────────────────────────

  function hideFeedbackOnHomepage() {
    if (isHomePage()) {
      var el = document.querySelector('.md-feedback');
      if (el) el.style.display = 'none';
    }
  }

  // ─── Mermaid 缩放拖拽核心 ─────────────────────────────────

  /** 存储所有已初始化的图表实例，用于页面切换时清理 */
  var mermaidInstances = [];

  /** 清理所有已初始化的实例 */
  function cleanupInstances() {
    mermaidInstances.forEach(function (item) {
      try {
        if (item.lib === 'panzoom' && item.instance && item.instance.dispose) {
          item.instance.dispose();
        }
        if (item.lib === 'svg-pan-zoom' && item.instance && item.instance.destroy) {
          item.instance.destroy();
        }
        // 移除包裹容器，恢复原始 DOM
        if (item.container && item.container.parentNode) {
          var svg = item.container.querySelector('svg');
          if (svg) item.container.parentNode.insertBefore(svg, item.container);
          item.container.parentNode.removeChild(item.container);
        }
      } catch (e) { /* 静默处理 */ }
    });
    mermaidInstances = [];
    // 移除所有滑动提示
    document.querySelectorAll('.mermaid-swipe-hint').forEach(function (el) { el.remove(); });
  }

  /** 创建重置按钮 */
  function createResetButton(container) {
    var btn = document.createElement('button');
    btn.className = 'mermaid-reset-btn';
    btn.innerHTML = '↺';
    btn.title = '重置视图';
    btn.style.display = 'none';
    btn.setAttribute('aria-label', '重置图表视图');
    container.appendChild(btn);
    return btn;
  }

  /** 检测图表是否处于非初始状态，控制重置按钮显示 */
  function updateResetButtonVisibility(btn, lib, instance) {
    if (!btn || !instance) return;
    try {
      if (lib === 'panzoom') {
        var t = instance.getTransform();
        var isDefault = Math.abs(t.x) < 1 && Math.abs(t.y) < 1 && Math.abs(t.scale - 1) < 0.01;
        btn.style.display = isDefault ? 'none' : 'block';
      } else if (lib === 'svg-pan-zoom') {
        var pan = instance.getPan();
        var zoom = instance.getZoom();
        var isDefault = Math.abs(pan.x) < 1 && Math.abs(pan.y) < 1 && Math.abs(zoom - 1) < 0.01;
        btn.style.display = isDefault ? 'none' : 'block';
      }
    } catch (e) { /* 静默处理 */ }
  }

  /** 重置图表到初始状态 */
  function resetView(lib, instance, svg) {
    try {
      if (lib === 'panzoom') {
        // 添加过渡动画
        svg.style.transition = 'transform 300ms ease';
        instance.moveTo(0, 0);
        instance.zoomAbs(0, 0, 1);
        setTimeout(function () { svg.style.transition = ''; }, 350);
      } else if (lib === 'svg-pan-zoom') {
        instance.resetZoom();
        instance.resetPan();
      }
    } catch (e) { /* 静默处理 */ }
  }

  /** 使用 panzoom 初始化单个 SVG */
  function initWithPanzoom(svg, container) {
    if (typeof window.panzoom !== 'function') return null;

    var instance = window.panzoom(svg, {
      minZoom: 0.1,
      maxZoom: 5,
      smoothScroll: false,
      bounds: true,
      boundsPadding: 0.1,
      zoomDoubleClickSpeed: 1, // 禁用内置双击缩放，我们自己处理双击重置
      beforeWheel: function (e) {
        // 仅当鼠标在图表上时才缩放，阻止页面滚动
        return false; // 返回 false 表示允许缩放
      },
      beforeMouseDown: function (e) {
        // 允许拖拽
        return false;
      }
    });

    return instance;
  }

  /** 使用 svg-pan-zoom 初始化单个 SVG */
  function initWithSvgPanZoom(svg, container) {
    if (typeof window.svgPanZoom !== 'function') return null;

    // svg-pan-zoom 需要 SVG 有 width/height 属性
    if (!svg.getAttribute('width')) {
      var bbox = svg.getBBox();
      svg.setAttribute('width', bbox.width || svg.clientWidth);
      svg.setAttribute('height', bbox.height || svg.clientHeight);
    }

    var instance = window.svgPanZoom(svg, {
      zoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: false,
      mouseWheelZoomEnabled: true,
      preventMouseEventsDefault: true,
      zoomScaleSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 5,
      dblClickZoomEnabled: false, // 双击用于重置
      fit: true,
      center: true
    });

    return instance;
  }

  /** 为单个 Mermaid SVG 初始化缩放拖拽 */
  function initSingleMermaid(svg) {
    // 避免重复初始化
    if (svg.dataset.zoomInitialized) return;
    svg.dataset.zoomInitialized = 'true';

    var lib = window.MERMAID_ZOOM_LIB || 'panzoom';

    // 创建包裹容器
    var container = document.createElement('div');
    container.className = 'mermaid-container';
    svg.parentNode.insertBefore(container, svg);
    container.appendChild(svg);

    // 创建重置按钮
    var resetBtn = createResetButton(container);

    // 根据选择的库初始化
    var instance = null;
    if (lib === 'panzoom') {
      instance = initWithPanzoom(svg, container);
    } else if (lib === 'svg-pan-zoom') {
      instance = initWithSvgPanZoom(svg, container);
    }

    if (!instance) return; // CDN 加载失败，优雅降级

    // 存储实例
    mermaidInstances.push({ lib: lib, instance: instance, container: container, svg: svg });

    // ── 重置按钮可见性更新（节流） ──
    var throttledUpdate = throttle(function () {
      updateResetButtonVisibility(resetBtn, lib, instance);
    }, 16);

    if (lib === 'panzoom') {
      instance.on('transform', throttledUpdate);
    } else if (lib === 'svg-pan-zoom') {
      // svg-pan-zoom 没有 transform 事件，用 MutationObserver 监听 SVG 变化
      var svgObserver = new MutationObserver(throttledUpdate);
      svgObserver.observe(svg, { attributes: true, subtree: true, attributeFilter: ['transform'] });
    }

    // ── 双击重置 ──
    container.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      resetView(lib, instance, svg);
      setTimeout(function () {
        updateResetButtonVisibility(resetBtn, lib, instance);
      }, 350);
    });

    // ── 重置按钮点击 ──
    resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      resetView(lib, instance, svg);
      setTimeout(function () {
        updateResetButtonVisibility(resetBtn, lib, instance);
      }, 350);
    });

    // ── 光标样式 ──
    container.style.cursor = 'grab';
    container.addEventListener('mousedown', function () { container.style.cursor = 'grabbing'; });
    document.addEventListener('mouseup', function () {
      if (container) container.style.cursor = 'grab';
    });

    // ── 阻止图表上的滚轮事件冒泡到页面 ──
    container.addEventListener('wheel', function (e) {
      e.preventDefault();
    }, { passive: false });

    // ── 移动端适配 ──
    if (isMobile()) {
      // fit-to-width：将图表缩放至容器宽度
      setTimeout(function () {
        var containerWidth = container.clientWidth;
        var svgWidth = svg.getBBox ? svg.getBBox().width : svg.clientWidth;
        if (svgWidth > 0 && containerWidth > 0) {
          var fitScale = containerWidth / svgWidth;
          if (fitScale < 1) {
            if (lib === 'panzoom') {
              instance.zoomAbs(0, 0, fitScale);
            } else if (lib === 'svg-pan-zoom') {
              instance.zoom(fitScale);
              instance.center();
            }
          }
        }
      }, 100);

      // 触摸手势冲突处理：水平拖拽图表，垂直允许页面滚动
      var touchStartX = 0, touchStartY = 0;
      container.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      container.addEventListener('touchmove', function (e) {
        if (e.touches.length === 1) {
          var dx = Math.abs(e.touches[0].clientX - touchStartX);
          var dy = Math.abs(e.touches[0].clientY - touchStartY);
          // 水平移动为主 → 拖拽图表，阻止页面滚动
          if (dx > dy && dx > 10) {
            e.preventDefault();
          }
          // 垂直移动为主 → 放行页面滚动（不 preventDefault）
        }
      }, { passive: false });

      // 检测图表宽度是否超过屏幕宽度 2 倍，显示滑动提示
      setTimeout(function () {
        var svgWidth = svg.getBBox ? svg.getBBox().width : svg.clientWidth;
        if (svgWidth > window.innerWidth * 2) {
          var hint = document.createElement('div');
          hint.className = 'mermaid-swipe-hint';
          hint.textContent = '← 左右滑动查看 →';
          container.parentNode.insertBefore(hint, container.nextSibling);
        }
      }, 200);
    }
  }

  /** 扫描页面中所有 Mermaid SVG 并初始化 */
  function initAllMermaidCharts() {
    // Material 主题渲染 Mermaid 后，SVG 会出现在 .mermaid 类的容器中
    var svgs = document.querySelectorAll('.mermaid svg, pre.mermaid svg');
    svgs.forEach(function (svg) {
      initSingleMermaid(svg);
    });
  }

  /** 使用 MutationObserver 监听 Mermaid 异步渲染完成 */
  function observeMermaidRendering() {
    var observer = new MutationObserver(function (mutations) {
      var hasMermaid = false;
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            // 检查是否是 SVG 或包含 SVG 的 mermaid 容器
            if (node.tagName === 'svg' && node.closest && node.closest('.mermaid')) {
              hasMermaid = true;
            }
            if (node.querySelector && node.querySelector('.mermaid svg')) {
              hasMermaid = true;
            }
          }
        });
      });
      if (hasMermaid) {
        // 延迟一点确保 SVG 完全渲染
        setTimeout(initAllMermaidCharts, 100);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // ─── 主初始化逻辑 ─────────────────────────────────────────

  var mermaidObserver = null;

  function initPage() {
    // 首页反馈隐藏
    hideFeedbackOnHomepage();

    // 清理上一页的实例（navigation.instant 模式下页面不会完全刷新）
    cleanupInstances();

    // 初始化已有的 Mermaid 图表
    initAllMermaidCharts();

    // 监听后续异步渲染的 Mermaid 图表
    if (mermaidObserver) mermaidObserver.disconnect();
    mermaidObserver = observeMermaidRendering();
  }

  // ── 兼容 navigation.instant 模式 ──
  // Material 主题在 instant 模式下通过 document$ 发出页面切换事件
  if (typeof document$ !== 'undefined') {
    // Material for MkDocs 的 RxJS observable
    document$.subscribe(function () {
      initPage();
    });
  } else {
    // 回退：普通 DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  }

  // 额外监听 location 变化（兜底）
  var lastPath = window.location.pathname;
  setInterval(function () {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      initPage();
    }
  }, 500);

})();