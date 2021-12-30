#!/usr/bin/env node
/**
 * sync-posts.js
 * 将 01-09 目录下的 Markdown 文章同步到 Hexo 的 source/_posts/ 目录
 * 自动注入 Front Matter（title、date、categories、tags）
 * 处理图片路径，将图片复制到 source/images/ 目录
 */

const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const ROOT_DIR = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'source', '_posts');
const IMAGES_DIR = path.join(ROOT_DIR, 'source', 'images');

// 需要同步的源目录（01-09）
const SOURCE_DIRS = [
  { dir: '01-java-basic',       category: 'Java基础与JVM',    tags: ['Java', 'JVM', '并发'] },
  { dir: '02-spring',           category: 'Spring生态',        tags: ['Spring', 'SpringBoot', 'SpringCloud'] },
  { dir: '03-mysql',            category: 'MySQL',             tags: ['MySQL', '数据库', '索引'] },
  { dir: '04-postgresql',       category: 'PostgreSQL',        tags: ['PostgreSQL', '数据库'] },
  { dir: '05-redis',            category: 'Redis',             tags: ['Redis', '缓存', '分布式'] },
  { dir: '06-kafka',            category: 'Kafka',             tags: ['Kafka', '消息队列'] },
  { dir: '07-elasticsearch',    category: 'Elasticsearch',     tags: ['Elasticsearch', '搜索引擎'] },
  { dir: '08-design-pattern',   category: '设计模式',          tags: ['设计模式', '架构'] },
  { dir: '09-software-engineering', category: '软件工程',      tags: ['软件工程', '架构', 'DDD'] },
];

// ===== 工具函数 =====

/**
 * 递归创建目录
 */
function mkdirpSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 从文件名提取标题（去掉序号前缀和扩展名）
 * 例：01-面向对象.md → 面向对象
 */
function extractTitle(filename) {
  const name = path.basename(filename, '.md');
  // 去掉 "00-"、"01-" 等数字前缀
  return name.replace(/^\d+-/, '').replace(/^\[.*?\]/, '').trim();
}

/**
 * 获取文件的 git 提交时间作为文章日期，若获取失败则用文件 mtime
 */
function getFileDate(filePath) {
  try {
    const { execSync } = require('child_process');
    const result = execSync(
      `git log -1 --format="%ai" -- "${filePath}"`,
      { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (result) return result.split(' ')[0]; // 只取日期部分 YYYY-MM-DD
  } catch (e) { /* 忽略错误 */ }
  // 回退到文件修改时间
  const stat = fs.statSync(filePath);
  return stat.mtime.toISOString().split('T')[0];
}

/**
 * 检测文件是否已有 Front Matter
 */
function hasFrontMatter(content) {
  return content.trimStart().startsWith('---');
}

/**
 * 构建 Front Matter 字符串
 */
function buildFrontMatter(title, date, category, tags) {
  const tagsStr = tags.map(t => `  - ${t}`).join('\n');
  return `---
title: "${title}"
date: ${date}
categories:
  - ${category}
tags:
${tagsStr}
---

`;
}

/**
 * 处理 Markdown 内容中的图片路径
 * 将相对路径图片引用替换为 /images/<dirName>/<imgFile> 的绝对路径
 * 同时将图片文件复制到 source/images/<dirName>/ 目录
 */
function processImagePaths(content, srcDir, dirName) {
  const imgDestDir = path.join(IMAGES_DIR, dirName);
  
  // 匹配 Markdown 图片语法：![alt](./path/to/img.png) 或 ![alt](path/to/img.png)
  const imgRegex = /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g;
  
  const processedContent = content.replace(imgRegex, (match, alt, imgPath) => {
    // 解析图片的绝对路径
    const absImgPath = path.resolve(srcDir, imgPath);
    
    if (fs.existsSync(absImgPath)) {
      const imgFilename = path.basename(absImgPath);
      mkdirpSync(imgDestDir);
      const destPath = path.join(imgDestDir, imgFilename);
      fs.copyFileSync(absImgPath, destPath);
      return `![${alt}](/images/${dirName}/${imgFilename})`;
    }
    // 图片文件不存在，保持原样
    return match;
  });
  
  return processedContent;
}

// ===== 主逻辑 =====

function syncPosts() {
  console.log('🚀 开始同步文章...\n');
  
  // 清空并重建 _posts 目录（保留目录本身）
  if (fs.existsSync(POSTS_DIR)) {
    fs.rmSync(POSTS_DIR, { recursive: true });
  }
  mkdirpSync(POSTS_DIR);
  mkdirpSync(IMAGES_DIR);
  
  let totalCount = 0;
  let skippedCount = 0;
  
  for (const { dir, category, tags } of SOURCE_DIRS) {
    const srcDir = path.join(ROOT_DIR, dir);
    
    if (!fs.existsSync(srcDir)) {
      console.warn(`⚠️  目录不存在，跳过：${dir}`);
      continue;
    }
    
    // 在 _posts 下创建对应子目录
    const destSubDir = path.join(POSTS_DIR, dir);
    mkdirpSync(destSubDir);
    
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
    console.log(`📁 ${dir} (${category}) — ${files.length} 篇文章`);
    
    for (const filename of files) {
      const srcFile = path.join(srcDir, filename);
      const destFile = path.join(destSubDir, filename);
      
      let content = fs.readFileSync(srcFile, 'utf8');
      
      // 处理图片路径（复制图片 + 替换路径）
      content = processImagePaths(content, srcDir, dir);
      
      // 注入 Front Matter（若已有则跳过）
      if (hasFrontMatter(content)) {
        skippedCount++;
        fs.writeFileSync(destFile, content, 'utf8');
        console.log(`  ✅ ${filename} (已有 Front Matter)`);
      } else {
        const title = extractTitle(filename);
        const date = getFileDate(srcFile);
        const frontMatter = buildFrontMatter(title, date, category, tags);
        fs.writeFileSync(destFile, frontMatter + content, 'utf8');
        console.log(`  ✨ ${filename} → 注入 Front Matter [${title}]`);
      }
      
      totalCount++;
    }
    console.log('');
  }
  
  console.log(`✅ 同步完成！共处理 ${totalCount} 篇文章（${skippedCount} 篇已有 Front Matter）`);
}

syncPosts();
