#!/bin/bash
# tools/install-hooks.sh
# 将 Git hooks 安装到 .git/hooks/，克隆仓库后执行一次即可
#
# 用法：bash tools/install-hooks.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/tools"

echo "📦 安装 Git Hooks..."

# 安装 pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$REPO_ROOT/tools/gen_nav.py"
if [ ! -f "$SCRIPT" ]; then
    echo "⚠️  未找到 tools/gen_nav.py，跳过导航生成"
    exit 0
fi
echo "🔄 [pre-commit] 正在更新文章导航..."
python3 "$SCRIPT"
git add -u "*.md"
git add "$REPO_ROOT/README.md" 2>/dev/null || true
echo "✅ [pre-commit] 导航更新完成"
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "  ✅ pre-commit hook 已安装"

echo ""
echo "🎉 安装完成！以后每次 git commit 都会自动更新文章导航。"
echo ""
echo "手动运行导航生成："
echo "  python3 tools/gen_nav.py"
