#!/usr/bin/env node
/**
 * check_mermaid.mjs —— 扫描 docs/ 下所有 Markdown，对每个 ```mermaid 代码块
 * 调用 Mermaid 官方 parser 做语法校验，失败则非零退出，阻断 push/CI。
 *
 * 实现要点：
 * - mermaid 本体是前端库，在 Node 下 parse() 会用到 DOMPurify，需要 DOM 环境
 * - 用 jsdom 垫一层轻量 DOM，之后 mermaid.parse() 即可纯解析校验（不渲染）
 * - 覆盖全子图类型（flowchart / sequence / class / state / er / journey /
 *   gantt / pie / mindmap / timeline / gitGraph / c4 / ...）
 * - 无 Puppeteer / Chromium，秒级完成
 *
 * 使用：
 *   npm install
 *   npm run check:mermaid                    # 全量扰描 docs/
 *   node tools/check_mermaid.mjs --files a.md,b.md  # 仅校验指定文件（供 dev_serve.py 调用）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

// ---------- ① 准备最小 DOM 环境（给 DOMPurify 用） ----------
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
});

// Node 20+ 部分全局变量是只读 getter（如 navigator），需要安全赋值
function safeSetGlobal(key, value) {
    try {
        globalThis[key] = value;
    } catch {
        // 如果是只读属性，用 defineProperty 覆盖
        try {
            Object.defineProperty(globalThis, key, {
                value,
                writable: true,
                configurable: true,
            });
        } catch {
            // 仍然失败就跳过（保留原生实现）
        }
    }
}

safeSetGlobal('window', dom.window);
safeSetGlobal('document', dom.window.document);
safeSetGlobal('navigator', dom.window.navigator);
safeSetGlobal('Element', dom.window.Element);
safeSetGlobal('HTMLElement', dom.window.HTMLElement);
safeSetGlobal('DOMParser', dom.window.DOMParser);
safeSetGlobal('Node', dom.window.Node);
safeSetGlobal('NodeFilter', dom.window.NodeFilter);
safeSetGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));

// ---------- ② 加载 mermaid ----------
let mermaid;
try {
    mermaid = (await import('mermaid')).default;
    await mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
} catch (err) {
    console.error('❌ 加载 mermaid 失败：', err.message);
    console.error('   请先运行 `npm install`');
    process.exit(2);
}

// ---------- ②.5 解析 CLI 参数 ----------
// 支持：
//   --files a.md,b.md
//   --files a.md --files b.md
//   --files=a.md,b.md
function parseFilesArg(argv) {
    const out = [];
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        let raw = null;
        if (a === '--files' && i + 1 < argv.length) {
            raw = argv[++i];
        } else if (a.startsWith('--files=')) {
            raw = a.slice('--files='.length);
        }
        if (raw) {
            for (const p of raw.split(',')) {
                const t = p.trim();
                if (t) out.push(t);
            }
        }
    }
    return out;
}
const specifiedFiles = parseFilesArg(process.argv);

// ---------- ③ 扫描并校验 ----------
const DOCS_DIR = 'docs';
let failCount = 0;
let totalCount = 0;
const failures = [];

async function checkFile(path) {
    const content = readFileSync(path, 'utf8');
    // 匹配 ```mermaid ... ``` 代码块（非贪婪），同时捕获围栏前的**前导缩进**
    // 这样 mermaid 嵌套在 !!! / ??? Admonition 或列表缩进块里时，能正确去缩进后再校验
    //   组1：围栏前导缩进（只允许空格/制表符）
    //   组2：代码块正文
    const regex = /^([ \t]*)```mermaid[^\n]*\n([\s\S]*?)\n\1```/gm;
    let match;
    let blockIdx = 0;

    while ((match = regex.exec(content)) !== null) {
        blockIdx++;
        totalCount++;
        const indent = match[1] || '';
        const rawCode = match[2];
        // 按围栏缩进去掉每行相同的前导空白（MkDocs / CommonMark 嵌套块的标准行为）
        const code = indent
            ? rawCode
                  .split('\n')
                  .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
                  .join('\n')
            : rawCode;

        // 计算代码块起始行号，便于定位
        const beforeMatch = content.slice(0, match.index);
        const startLine = beforeMatch.split('\n').length;

        try {
            await mermaid.parse(code);
        } catch (err) {
            const raw = (err && err.message) ? err.message : String(err);
            const firstLine = raw.split('\n')[0].trim();
            failures.push({
                path,
                blockIdx,
                startLine,
                message: firstLine,
                detail: raw,
            });
            failCount++;
        }
    }
}

async function walkAsync(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) await walkAsync(full);
        else if (entry.endsWith('.md')) await checkFile(full);
    }
}

console.log(
    specifiedFiles.length > 0
        ? `🔍 增量校验 ${specifiedFiles.length} 个文件的 Mermaid 代码块...`
        : '🔍 扰描 docs/ 下所有 Mermaid 代码块...'
);
if (specifiedFiles.length > 0) {
    // 增量模式：仅校验指定文件（dev_serve 在保存时调用）
    // 不存在的文件静默跳过（md 删除事件会传一个不存在的路径）
    for (const p of specifiedFiles) {
        if (existsSync(p) && p.endsWith('.md')) {
            await checkFile(p);
        }
    }
} else {
    await walkAsync(DOCS_DIR);
}
if (failCount > 0) {
    console.error('');
    for (const f of failures) {
        console.error(`❌ ${f.path}:${f.startLine}  (第 ${f.blockIdx} 个 mermaid 块)`);
        console.error(`   ${f.message}`);
    }
    console.error('');
    console.error(`🚨 共扫描 ${totalCount} 个代码块，发现 ${failCount} 处语法错误`);
    process.exit(1);
}
console.log(`✅ 共扫描 ${totalCount} 个 Mermaid 代码块，语法全部正确`);
