/**
 * The Stack - 自定义 JavaScript
 * 功能：
 * 首页反馈组件隐藏（兼容 navigation.instant）
 * 移动端打开侧边栏时自动展开目录（TOC）
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

  /* ── 页面就绪 ── */
  function onPageReady() {
    hideFeedbackOnHomepage();
    bindDrawerToc();
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
