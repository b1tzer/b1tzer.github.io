/**
 * The Stack - 自定义 JavaScript
 * 功能：
 * 1. 首页反馈组件隐藏（兼容 navigation.instant）
 * 2. 导航栏标题点击跳转首页
 * 3. 默认启用宽屏模式
 */

(function () {
  'use strict';

  function isHomePage() {
    var path = window.location.pathname;
    return path === '/' || path === '/index.html' ||
      (path.endsWith('/') && path.split('/').filter(Boolean).length === 0);
  }

  function hideFeedbackOnHomepage() {
    if (isHomePage()) {
      var el = document.querySelector('.md-feedback');
      if (el) el.style.display = 'none';
    }
  }

  function makeHeaderTitleClickable() {
    var topics = document.querySelectorAll('.md-header__topic');
    topics.forEach(function (topic) {
      if (topic.dataset.clickBound) return;
      topic.dataset.clickBound = 'true';
      topic.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = '/';
      });
    });
  }

  function onPageReady() {
    hideFeedbackOnHomepage();
    makeHeaderTitleClickable();
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

})();
