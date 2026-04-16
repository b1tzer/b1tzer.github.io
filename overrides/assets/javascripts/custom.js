/**
 * The Stack - 自定义 JavaScript
 * 功能：
 * 首页反馈组件隐藏（兼容 navigation.instant）
 * 移动端打开侧边栏时自动展开目录（TOC）
 * 首页卡片滚动进入动画（Intersection Observer）
 * 页面切换时重置内容区动画
 * 文章朗读功能（Web Speech API）
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

  /* ── 文章朗读功能（Web Speech API） ── */
  var ttsState = {
    synth: window.speechSynthesis || null,
    utterances: [],       // 分段的 SpeechSynthesisUtterance 列表
    paragraphs: [],       // 对应的 DOM 段落元素
    currentIndex: -1,     // 当前朗读的段落索引
    status: 'stopped',    // stopped | playing | paused
    rate: 1.0,            // 语速
    voice: null,          // 选中的语音
    btnEl: null,          // 朗读按钮
    panelEl: null,        // 控制面板
    keepAliveTimer: null  // Chrome 长文本保活定时器
  };

  /** 检测浏览器是否支持 Speech API */
  function isTTSSupported() {
    return !!(window.speechSynthesis);
  }

  /**
   * 语音质量优先级关键词（按优先级从高到低）
   * 匹配到靠前的关键词 → 优先级更高
   */
  var VOICE_PRIORITY_KEYWORDS = [
    // 最高优先级：各平台已知的高质量在线/神经网络语音
    'Microsoft Xiaoxiao Online',  // Edge 在线神经语音
    'Microsoft Yunxi Online',
    'Microsoft Xiaoyi Online',
    'Google 普通话',               // Chrome 在线高质量语音
    'Google Mandarin',
    // 高优先级：Microsoft 本地高质量语音
    'Microsoft Xiaoxiao',
    'Microsoft Yunxi',
    'Microsoft Xiaoyi',
    'Microsoft Huihui',
    'Microsoft Kangkang',
    'Microsoft Yaoyao',
    // 中优先级：Apple / Siri 语音
    'Tingting',                    // macOS/iOS 中文语音
    'Meijia',
    'Sinji',
    // 通用中文语音
    'zh-CN',
    'zh-TW',
    'zh'
  ];

  /** 获取所有可用的中文语音，按质量排序 */
  function getChineseVoices() {
    var voices = ttsState.synth.getVoices();
    var zhVoices = voices.filter(function (v) {
      return v.lang.indexOf('zh') === 0 ||
             v.lang.indexOf('cmn') === 0;
    });

    // 按优先级排序
    zhVoices.sort(function (a, b) {
      var scoreA = getVoicePriorityScore(a);
      var scoreB = getVoicePriorityScore(b);
      return scoreA - scoreB; // 分数越小优先级越高
    });

    return zhVoices;
  }

  /** 计算语音的优先级分数（越小越好） */
  function getVoicePriorityScore(voice) {
    var name = voice.name;
    for (var i = 0; i < VOICE_PRIORITY_KEYWORDS.length; i++) {
      if (name.indexOf(VOICE_PRIORITY_KEYWORDS[i]) !== -1) {
        return i;
      }
    }
    // 未匹配到任何关键词，给一个较低的优先级
    // 但如果是远程语音（!localService），仍然优先于本地语音
    return VOICE_PRIORITY_KEYWORDS.length + (voice.localService ? 10 : 0);
  }

  /** 获取最佳中文语音 */
  function getPreferredVoice() {
    var zhVoices = getChineseVoices();
    if (zhVoices.length > 0) return zhVoices[0];
    // 没有中文语音时，回退到默认语音
    var voices = ttsState.synth.getVoices();
    var defaultVoice = voices.find(function (v) { return v.default; });
    return defaultVoice || voices[0] || null;
  }

  /**
   * 文本预处理：优化朗读节奏和自然度（方案 C）
   * @param {string} text - 原始文本
   * @param {string} tagName - 元素标签名（用于判断标题等）
   * @returns {string} 处理后的文本
   */
  function preprocessText(text, tagName) {
    var s = text;

    // 1. 清理不可读字符
    s = s.replace(/¶/g, '');           // 锚点符号
    s = s.replace(/[\u200b\u200c\u200d\ufeff]/g, ''); // 零宽字符
    s = s.replace(/\s+/g, ' ');        // 合并多余空白

    // 2. 技术符号朗读优化
    s = s.replace(/=>/g, ' 箭头 ');
    s = s.replace(/->/g, ' 指向 ');
    s = s.replace(/!=/g, ' 不等于 ');
    s = s.replace(/==/g, ' 等于 ');
    s = s.replace(/>=/g, ' 大于等于 ');
    s = s.replace(/<=/g, ' 小于等于 ');
    s = s.replace(/&&/g, ' 并且 ');
    s = s.replace(/\|\|/g, ' 或者 ');
    s = s.replace(/\bnull\b/gi, '空值');
    s = s.replace(/\btrue\b/gi, '真');
    s = s.replace(/\bfalse\b/gi, '假');

    // 3. 常见英文缩写和术语展开（Java 技术栈相关）
    s = s.replace(/\bJVM\b/g, 'J V M');
    s = s.replace(/\bGC\b/g, 'G C');
    s = s.replace(/\bOOP\b/g, 'O O P');
    s = s.replace(/\bAOP\b/g, 'A O P');
    s = s.replace(/\bIoC\b/g, 'I o C');
    s = s.replace(/\bDI\b/g, 'D I');
    s = s.replace(/\bSQL\b/g, 'S Q L');
    s = s.replace(/\bAPI\b/g, 'A P I');
    s = s.replace(/\bHTTP\b/g, 'H T T P');
    s = s.replace(/\bHTTPS\b/g, 'H T T P S');
    s = s.replace(/\bJSON\b/g, 'J SON');
    s = s.replace(/\bREST\b/g, 'REST');
    s = s.replace(/\bCPU\b/g, 'C P U');
    s = s.replace(/\bI\/O\b/g, 'I O');
    s = s.replace(/\bDDL\b/g, 'D D L');
    s = s.replace(/\bDML\b/g, 'D M L');
    s = s.replace(/\bMVCC\b/g, 'M V C C');
    s = s.replace(/\bRDB\b/g, 'R D B');
    s = s.replace(/\bAOF\b/g, 'A O F');
    s = s.replace(/\bTCP\b/g, 'T C P');
    s = s.replace(/\bUDP\b/g, 'U D P');
    s = s.replace(/\bRPC\b/g, 'R P C');
    s = s.replace(/\bgRPC\b/g, 'g R P C');
    s = s.replace(/\bCI\/CD\b/g, 'C I C D');
    s = s.replace(/\bDDD\b/g, 'D D D');
    s = s.replace(/\bCAP\b/g, 'C A P');
    s = s.replace(/\bBASE\b(?=\s|理论|$)/g, 'B A S E');
    s = s.replace(/\bSOLID\b/g, 'S O L I D');
    s = s.replace(/\bCAS\b/g, 'C A S');
    s = s.replace(/\bAQS\b/g, 'A Q S');
    s = s.replace(/\bTOC\b/g, 'T O C');
    s = s.replace(/\bDSL\b/g, 'D S L');
    s = s.replace(/\bES\b/g, 'E S');

    // 4. 标点符号节奏优化：在中文句号、问号、感叹号后添加短停顿
    s = s.replace(/([。！？])/g, '$1 ... ');
    // 中文逗号、分号后添加微停顿
    s = s.replace(/([，；：])/g, '$1 .. ');

    // 5. 标题元素添加前后停顿，让朗读更有层次
    if (/^H[1-6]$/.test(tagName)) {
      s = s + ' ...... ';  // 标题后加长停顿
    }

    // 6. 括号内容优化
    s = s.replace(/（/g, ' ... ');
    s = s.replace(/）/g, ' ... ');
    s = s.replace(/\(/g, ' ... ');
    s = s.replace(/\)/g, ' ... ');

    return s.trim();
  }

  /** 提取文章正文的段落元素和文本 */
  function extractArticleParagraphs() {
    var content = document.querySelector('.md-content__inner');
    if (!content) return [];

    // 选取正文中的可读元素，排除代码块、脚本、样式等
    var selectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, .admonition-title, .admonition > p, td, th';
    var elements = content.querySelectorAll(selectors);
    var result = [];

    elements.forEach(function (el) {
      // 跳过隐藏元素、代码块内容、空文本
      if (el.offsetParent === null) return;
      if (el.closest('pre') || el.closest('code') || el.closest('.mermaid')) return;
      if (el.closest('.md-source') || el.closest('.md-feedback')) return;

      var rawText = (el.textContent || '').trim();
      // 过滤掉过短的文本（如单个符号）
      if (rawText.length < 2) return;
      // 过滤掉纯锚点文本
      var cleaned = rawText.replace(/¶/g, '').trim();
      if (cleaned.length < 2) return;

      // 使用文本预处理优化朗读质量
      var processedText = preprocessText(rawText, el.tagName);

      result.push({ el: el, text: processedText });
    });

    return result;
  }

  /** 高亮当前朗读的段落 */
  function highlightParagraph(index) {
    // 清除之前的高亮
    ttsState.paragraphs.forEach(function (item) {
      item.el.classList.remove('tts-reading');
    });
    // 添加当前高亮
    if (index >= 0 && index < ttsState.paragraphs.length) {
      var el = ttsState.paragraphs[index].el;
      el.classList.add('tts-reading');
      // 滚动到可视区域
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /** Chrome 长文本保活：防止朗读超过 15 秒后被暂停 */
  function startKeepAlive() {
    stopKeepAlive();
    ttsState.keepAliveTimer = setInterval(function () {
      if (ttsState.synth.speaking && !ttsState.synth.paused) {
        ttsState.synth.pause();
        ttsState.synth.resume();
      }
    }, 10000);
  }

  function stopKeepAlive() {
    if (ttsState.keepAliveTimer) {
      clearInterval(ttsState.keepAliveTimer);
      ttsState.keepAliveTimer = null;
    }
  }

  /** 朗读指定索引的段落 */
  function speakParagraph(index) {
    if (index >= ttsState.paragraphs.length) {
      // 全部朗读完毕
      stopTTS();
      return;
    }

    ttsState.currentIndex = index;
    highlightParagraph(index);

    var item = ttsState.paragraphs[index];
    var utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = ttsState.rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (ttsState.voice) utterance.voice = ttsState.voice;

    utterance.onend = function () {
      // 朗读下一段
      if (ttsState.status === 'playing') {
        speakParagraph(index + 1);
      }
    };

    utterance.onerror = function (e) {
      // 跳过出错的段落，继续下一段
      if (e.error !== 'canceled' && ttsState.status === 'playing') {
        speakParagraph(index + 1);
      }
    };

    ttsState.synth.speak(utterance);
  }

  /** 开始朗读 */
  function startTTS() {
    if (!isTTSSupported()) return;

    // 停止之前的朗读
    ttsState.synth.cancel();
    stopKeepAlive();

    // 提取段落
    ttsState.paragraphs = extractArticleParagraphs();
    if (ttsState.paragraphs.length === 0) return;

    // 如果用户未手动选择语音，使用最佳语音
    if (!ttsState.voice) {
      ttsState.voice = getPreferredVoice();
    }
    ttsState.status = 'playing';
    updateTTSButton();
    showTTSPanel();
    updateVoiceSelector();
    startKeepAlive();

    speakParagraph(0);
  }

  /** 暂停朗读 */
  function pauseTTS() {
    if (ttsState.synth.speaking) {
      ttsState.synth.pause();
      ttsState.status = 'paused';
      stopKeepAlive();
      updateTTSButton();
    }
  }

  /** 恢复朗读 */
  function resumeTTS() {
    if (ttsState.synth.paused) {
      ttsState.synth.resume();
      ttsState.status = 'playing';
      startKeepAlive();
      updateTTSButton();
    }
  }

  /** 停止朗读 */
  function stopTTS() {
    ttsState.synth.cancel();
    stopKeepAlive();
    ttsState.status = 'stopped';
    ttsState.currentIndex = -1;
    // 清除所有高亮
    ttsState.paragraphs.forEach(function (item) {
      item.el.classList.remove('tts-reading');
    });
    ttsState.paragraphs = [];
    updateTTSButton();
    hideTTSPanel();
  }

  /** 更新朗读按钮状态 */
  function updateTTSButton() {
    if (!ttsState.btnEl) return;
    var icon = ttsState.btnEl.querySelector('.tts-icon');
    if (!icon) return;

    switch (ttsState.status) {
      case 'playing':
        icon.textContent = '⏸';
        ttsState.btnEl.title = '暂停朗读';
        ttsState.btnEl.classList.add('tts-active');
        break;
      case 'paused':
        icon.textContent = '▶';
        ttsState.btnEl.title = '继续朗读';
        ttsState.btnEl.classList.add('tts-active');
        break;
      default:
        icon.textContent = '🔊';
        ttsState.btnEl.title = '朗读文章';
        ttsState.btnEl.classList.remove('tts-active');
    }
  }

  /** 显示控制面板 */
  function showTTSPanel() {
    if (ttsState.panelEl) {
      ttsState.panelEl.classList.add('tts-panel-visible');
    }
  }

  /** 隐藏控制面板 */
  function hideTTSPanel() {
    if (ttsState.panelEl) {
      ttsState.panelEl.classList.remove('tts-panel-visible');
    }
  }

  /** 创建朗读按钮和控制面板 */
  function createTTSControls() {
    // 移除旧的控件（页面切换时）
    var oldBtn = document.querySelector('.tts-btn');
    if (oldBtn) oldBtn.remove();
    var oldPanel = document.querySelector('.tts-panel');
    if (oldPanel) oldPanel.remove();

    // 首页不显示
    if (isHomePage()) {
      ttsState.btnEl = null;
      ttsState.panelEl = null;
      return;
    }

    // 不支持 TTS 则不显示
    if (!isTTSSupported()) return;

    // 创建朗读按钮（插入到文章标题旁）
    var h1 = document.querySelector('.md-content__inner h1');
    if (!h1) return;

    var btn = document.createElement('button');
    btn.className = 'tts-btn';
    btn.title = '朗读文章';
    btn.innerHTML = '<span class="tts-icon">🔊</span>';
    btn.addEventListener('click', function () {
      switch (ttsState.status) {
        case 'stopped':
          startTTS();
          break;
        case 'playing':
          pauseTTS();
          break;
        case 'paused':
          resumeTTS();
          break;
      }
    });
    h1.appendChild(btn);
    ttsState.btnEl = btn;

    // 创建底部控制面板
    var panel = document.createElement('div');
    panel.className = 'tts-panel';
    panel.innerHTML =
      '<div class="tts-panel-inner">' +
        '<button class="tts-panel-btn tts-panel-stop" title="停止">⏹</button>' +
        '<div class="tts-panel-voice">' +
          '<label>语音</label>' +
          '<select class="tts-voice-select"></select>' +
        '</div>' +
        '<div class="tts-panel-speed">' +
          '<label>语速</label>' +
          '<input type="range" class="tts-speed-slider" min="0.5" max="2.5" step="0.1" value="1.0">' +
          '<span class="tts-speed-value">1.0x</span>' +
        '</div>' +
        '<span class="tts-panel-progress"></span>' +
      '</div>';

    document.body.appendChild(panel);
    ttsState.panelEl = panel;

    // 停止按钮
    panel.querySelector('.tts-panel-stop').addEventListener('click', stopTTS);

    // 语音选择器
    var voiceSelect = panel.querySelector('.tts-voice-select');
    populateVoiceSelector(voiceSelect);
    voiceSelect.addEventListener('change', function () {
      var voices = ttsState.synth.getVoices();
      var selected = voices.find(function (v) { return v.name === voiceSelect.value; });
      if (selected) {
        ttsState.voice = selected;
        // 如果正在朗读，重新开始当前段落以应用新语音
        if (ttsState.status === 'playing') {
          ttsState.synth.cancel();
          speakParagraph(ttsState.currentIndex);
        }
      }
    });

    // 语速滑块
    var slider = panel.querySelector('.tts-speed-slider');
    var speedLabel = panel.querySelector('.tts-speed-value');
    slider.addEventListener('input', function () {
      var newRate = parseFloat(this.value);
      ttsState.rate = newRate;
      speedLabel.textContent = newRate.toFixed(1) + 'x';

      // 如果正在朗读，重新开始当前段落以应用新语速
      if (ttsState.status === 'playing') {
        ttsState.synth.cancel();
        speakParagraph(ttsState.currentIndex);
      }
    });

    // 定时更新进度
    setInterval(function () {
      var progress = panel.querySelector('.tts-panel-progress');
      if (progress && ttsState.status !== 'stopped' && ttsState.paragraphs.length > 0) {
        progress.textContent = (ttsState.currentIndex + 1) + ' / ' + ttsState.paragraphs.length;
      } else if (progress) {
        progress.textContent = '';
      }
    }, 500);
  }

  /** 填充语音选择器下拉框 */
  function populateVoiceSelector(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    var zhVoices = getChineseVoices();
    var otherVoices = ttsState.synth.getVoices().filter(function (v) {
      return v.lang.indexOf('zh') === -1 && v.lang.indexOf('cmn') === -1;
    });

    // 中文语音分组
    if (zhVoices.length > 0) {
      var zhGroup = document.createElement('optgroup');
      zhGroup.label = '中文语音（推荐）';
      zhVoices.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = v.name + (v.localService ? '' : ' ☁️');
        if (ttsState.voice && ttsState.voice.name === v.name) {
          opt.selected = true;
        }
        zhGroup.appendChild(opt);
      });
      selectEl.appendChild(zhGroup);
    }

    // 其他语音分组（只显示前 10 个，避免列表过长）
    if (otherVoices.length > 0) {
      var otherGroup = document.createElement('optgroup');
      otherGroup.label = '其他语音';
      otherVoices.slice(0, 10).forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = v.name + ' (' + v.lang + ')' + (v.localService ? '' : ' ☁️');
        otherGroup.appendChild(opt);
      });
      selectEl.appendChild(otherGroup);
    }
  }

  /** 更新语音选择器的选中状态 */
  function updateVoiceSelector() {
    if (!ttsState.panelEl) return;
    var selectEl = ttsState.panelEl.querySelector('.tts-voice-select');
    if (!selectEl || !ttsState.voice) return;
    selectEl.value = ttsState.voice.name;
  }

  /** 初始化朗读功能 */
  function initTTS() {
    // 页面切换时先停止之前的朗读
    if (ttsState.synth && ttsState.synth.speaking) {
      ttsState.synth.cancel();
      stopKeepAlive();
    }
    ttsState.status = 'stopped';
    ttsState.currentIndex = -1;
    ttsState.paragraphs = [];

    // 确保语音列表已加载
    if (isTTSSupported()) {
      if (ttsState.synth.getVoices().length === 0) {
        ttsState.synth.addEventListener('voiceschanged', function () {
          createTTSControls();
        }, { once: true });
      } else {
        createTTSControls();
      }
    }
  }

  /* ── 页面就绪 ── */
  function onPageReady() {
    hideFeedbackOnHomepage();
    bindDrawerToc();
    resetContentAnimation();
    initTTS();
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
