// 自定义JavaScript来控制反馈组件的显示
// 只在非首页页面显示反馈组件

document.addEventListener('DOMContentLoaded', function() {
  // 检查当前页面是否是首页
  function isHomePage() {
    // 首页的URL通常是根路径或index.html
    const path = window.location.pathname;
    return path === '/' || path === '/index.html' || path.endsWith('/');
  }

  // 隐藏反馈组件的函数
  function hideFeedbackOnHomepage() {
    if (isHomePage()) {
      const feedbackElement = document.querySelector('.md-feedback');
      if (feedbackElement) {
        feedbackElement.style.display = 'none';
      }
    }
  }

  // 初始隐藏
  hideFeedbackOnHomepage();

  // 监听页面变化（对于SPA应用）
  if (typeof window.MathJax !== 'undefined') {
    window.MathJax.Hub.Register.StartupHook('End', function() {
      hideFeedbackOnHomepage();
    });
  }

  // 监听路由变化（如果mkdocs-material支持）
  if (typeof window.$ !== 'undefined') {
    $(document).on('ready', hideFeedbackOnHomepage);
  }
});