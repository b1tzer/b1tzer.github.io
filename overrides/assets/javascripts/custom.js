/**
 * The Stack - 自定义 JavaScript
 * 功能：
 * 首页反馈组件隐藏（兼容 navigation.instant）
 * 移动端打开侧边栏时自动展开目录（TOC）
 * 首页卡片滚动进入动画（Intersection Observer）
 * 页面切换时重置内容区动画
 */

(function () {
  'use strict';

  /* ── 首页判断 ── */
  function isHomePage() {
    var path = window.location.pathname;
    return path === '/' || path === '/index.html' ||
      (path.endsWith('/') && path.split('/').filter(Boolean).length === 0);
  }

  /* ── 首页隐藏反馈组件 ── */
  function hideFeedbackOnHomepage() {
    if (isHomePage()) {
      var el = document.querySelector('.md-feedback');
      if (el) el.style.display = 'none';
    }
  }

  /* ── 移动端打开侧边栏时自动展开 TOC ── */
  var MOBILE_BREAKPOINT = 960;
  var RETRY_LIMIT = 20;
  var RETRY_DELAY = 75;

  function openDrawerToc() {
    if (isHomePage()) return;
    var drawer = document.querySelector('#__drawer');
    if (!drawer || window.innerWidth >= MOBILE_BREAKPOINT || !drawer.checked) return;

    var attempts = 0;
    function tryOpen() {
      var tocToggle = document.querySelector('#__toc');
      if (tocToggle) {
        tocToggle.checked = true;
        return;
      }
      if (attempts++ < RETRY_LIMIT) setTimeout(tryOpen, RETRY_DELAY);
    }
    tryOpen();
  }

  function bindDrawerToc() {
    var drawer = document.querySelector('#__drawer');
    if (drawer) drawer.addEventListener('change', openDrawerToc);
    openDrawerToc();
  }

  /* ── 页面切换时重置内容区动画 ── */
  function resetContentAnimation() {
    var inner = document.querySelector('.md-content__inner');
    if (!inner) return;
    // 移除再重新添加，触发 CSS animation 重播
    inner.style.animation = 'none';
    // 强制回流
    void inner.offsetHeight;
    inner.style.animation = '';
  }

  /* ── 页面就绪 ── */
  function onPageReady() {
    hideFeedbackOnHomepage();
    bindDrawerToc();
    resetContentAnimation();
  }

  function bootstrap() {
    if (typeof window.document$ !== 'undefined') {
      window.document$.subscribe(function () {
        onPageReady();
      });
    } else {
      onPageReady();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(bootstrap, 0);
    });
  } else {
    setTimeout(bootstrap, 0);
  }

  window.addEventListener('resize', openDrawerToc);

})();
