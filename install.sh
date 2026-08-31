#!/usr/bin/env bash
# =============================================================
# Figma → Code 하네스 설치/검증 스크립트
#
# 사용법:
#   bash install.sh              현재(템플릿) 디렉터리 검증
#   bash install.sh <대상경로>    다른 프로젝트에 하네스 복사 + 검증
#
# 이 폴더 자체가 템플릿이므로 새 프로젝트는 폴더를 통째로 복사해도
# 된다. 기존 프로젝트에 하네스만 이식할 때 이 스크립트를 쓴다.
# Windows에서는 Git Bash로 실행:  bash install.sh
# =============================================================
set -euo pipefail

info() { printf '\033[36m[info]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[ ok ]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$HARNESS_DIR}"
mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

# ---- 1. Node.js 확인 (훅·토큰 빌드에 필수) ----------------------
command -v node >/dev/null 2>&1 || fail "Node.js 가 필요합니다 (>= 18): https://nodejs.org"
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 18 이상이 필요합니다 (현재: $(node -v))"
ok "Node.js $(node -v)"

# ---- 2. 다른 프로젝트로 복사 (대상이 템플릿과 다를 때만) ----------
if [ "$TARGET_DIR" != "$HARNESS_DIR" ]; then
  info "하네스를 복사합니다: $HARNESS_DIR → $TARGET_DIR"

  # 루트 문서/설정
  cp "$HARNESS_DIR/CLAUDE.md"                   "$TARGET_DIR/CLAUDE.md"
  cp "$HARNESS_DIR/SETUP.md"                    "$TARGET_DIR/SETUP.md"
  cp "$HARNESS_DIR/figma-code-connect.json"     "$TARGET_DIR/figma-code-connect.json"
  cp "$HARNESS_DIR/style-dictionary.config.mjs" "$TARGET_DIR/style-dictionary.config.mjs"
  cp "$HARNESS_DIR/.prettierignore"             "$TARGET_DIR/.prettierignore"

  # .claude (settings.local.json 은 복사하지 않는다)
  mkdir -p "$TARGET_DIR/.claude"
  cp "$HARNESS_DIR/.claude/CLAUDE.md" "$TARGET_DIR/.claude/CLAUDE.md"
  for d in agents commands skills hooks; do
    mkdir -p "$TARGET_DIR/.claude/$d"
    cp -r "$HARNESS_DIR/.claude/$d/." "$TARGET_DIR/.claude/$d/"
  done
  if [ -f "$TARGET_DIR/.claude/settings.json" ]; then
    cp "$HARNESS_DIR/.claude/settings.json" "$TARGET_DIR/.claude/settings.harness.json"
    warn ".claude/settings.json 이 이미 있어 덮어쓰지 않았습니다."
    warn "→ .claude/settings.harness.json 을 참고해 hooks/permissions 를 수동 병합하세요."
  else
    cp "$HARNESS_DIR/.claude/settings.json" "$TARGET_DIR/.claude/settings.json"
  fi

  # 토큰 원본 + 문서
  # (`scripts/` 는 이 하네스에 없다. 예전엔 복사 대상이었는데 폴더가 사라지면서
  #  `set -euo pipefail` 아래에서 이 줄이 설치를 통째로 중단시켰다 — 그래서 뺐다.)
  mkdir -p "$TARGET_DIR/tokens" "$TARGET_DIR/docs"
  cp -r "$HARNESS_DIR/tokens/."  "$TARGET_DIR/tokens/"
  # 예전엔 docs 3개(DESIGN·design-tokens·style-dictionary-guide)만 복사했다.
  # 그 결과 이식본에는 Stage 5 가 필수로 읽는 `screen-templates.md` 와 상시 규칙
  # `design-core.md`, 단계 계약 `schemas/` 가 없어서 **파이프라인이 중간에 멈췄다.**
  # 진행 기록 2종(이 프로젝트의 히스토리라 새 프로젝트엔 의미 없다)만 빼고 전부 옮긴다.
  cp -r "$HARNESS_DIR/docs/." "$TARGET_DIR/docs/"
  rm -f "$TARGET_DIR/docs/PROGRESS.md" "$TARGET_DIR/docs/HANDOFF.md"

  # src 뼈대 (기존 파일은 덮어쓰지 않는다)
  mkdir -p "$TARGET_DIR/src/styles" "$TARGET_DIR/src/tokens" \
           "$TARGET_DIR/src/components/ui" "$TARGET_DIR/src/stories/tokens" "$TARGET_DIR/src/lib"
  if [ ! -f "$TARGET_DIR/src/styles/tokens.css" ]; then
    cp "$HARNESS_DIR/src/styles/tokens.css" "$TARGET_DIR/src/styles/tokens.css"
    ok "src/styles/tokens.css 시드 생성 (Tailwind @theme 매핑 계층)"
  else
    info "src/styles/tokens.css 이미 존재 — 건너뜀"
  fi

  # .gitignore 시드
  if [ ! -f "$TARGET_DIR/.gitignore" ]; then
    printf '%s\n' "node_modules/" "dist/" "storybook-static/" ".env" \
      ".claude/settings.local.json" > "$TARGET_DIR/.gitignore"
    ok ".gitignore 생성"
  fi

  ok "복사 완료"
fi

cd "$TARGET_DIR"

# ---- 3. 훅 구문 검사 --------------------------------------------
HOOKS=(check-design-tokens.mjs check-story-exists.mjs protect-files.mjs notify.mjs)
for h in "${HOOKS[@]}"; do
  f=".claude/hooks/$h"
  [ -f "$f" ] || fail "훅 파일이 없습니다: $f"
  node --check "$f" >/dev/null || fail "구문 오류: $f"
done
ok "훅 ${#HOOKS[@]}종 구문 검사 통과"

# ---- 4. settings / 에이전트 / 커맨드 / 토큰 검증 -----------------
[ -f .claude/settings.json ] || fail ".claude/settings.json 이 없습니다"
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))" \
  || fail ".claude/settings.json JSON 파싱 실패"
ok "settings.json 유효"

# 파이프라인 Stage 1~5 에이전트 6종 + 상시 도구 5종 = 11종.
# 하나라도 빠지면 `/run-pipeline` 이 중간에 멈추므로 전부 검사한다.
AGENTS=(
  service-analyzer brand-strategist brand-builder brand-applier
  figma-designer screen-builder
  figma-implementer token-checker design-qa design-reviewer qa-reporter
)
for a in "${AGENTS[@]}"; do
  [ -f ".claude/agents/$a.md" ] || fail "에이전트 파일이 없습니다: .claude/agents/$a.md"
done
ok "에이전트 ${#AGENTS[@]}종 확인"

[ -n "$(ls -A .claude/commands 2>/dev/null)" ] || warn ".claude/commands 가 비어 있습니다"
[ -n "$(ls -A .claude/skills   2>/dev/null)" ] || warn ".claude/skills 가 비어 있습니다"

# 토큰은 2층 구조라 `tokens/primitive/*.json`·`tokens/semantic/*.json` 에 있다.
# 예전 검사는 `tokens/*.json`(하위 폴더 미포함)이라 **매치가 0** 이었고,
# 그런데도 루프 밖에서 무조건 "유효"를 출력해 **검증이 한 번도 돌지 않았다.**
TOKEN_COUNT=0
TOKEN_BAD=""
# here-doc 으로 읽어야 서브셸이 아니라 **이 셸**에서 변수가 누적된다 (파이프면 값이 사라진다)
while IFS= read -r t; do
  [ -n "$t" ] || continue
  TOKEN_COUNT=$((TOKEN_COUNT + 1))
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$t" >/dev/null 2>&1 \
    || TOKEN_BAD="$TOKEN_BAD $t"
done <<EOF
$(find tokens -type f -name '*.json' 2>/dev/null)
EOF

if [ "$TOKEN_COUNT" -eq 0 ]; then
  warn "tokens/ 에 *.json 이 없습니다 — 토큰 원본을 추가하세요"
elif [ -n "$TOKEN_BAD" ]; then
  fail "JSON 파싱 실패:$TOKEN_BAD"
else
  ok "토큰 원본 ${TOKEN_COUNT}개 유효"
fi

[ -f style-dictionary.config.mjs ] || fail "style-dictionary.config.mjs 가 없습니다"

# ---- 5. 프로젝트 상태 안내 --------------------------------------
if [ ! -f package.json ]; then
  warn "package.json 이 없습니다. React 프로젝트를 먼저 생성하세요 (SETUP.md 1번 참조):"
  echo "        npm create vite@latest . -- --template react-ts"
  echo "        npm i tailwindcss @tailwindcss/vite"
  echo "        npx storybook@latest init"
  echo "        npm i -D style-dictionary prettier"
  echo "        # package.json scripts에 build:tokens 추가 후 npm run build:tokens"
fi

echo
ok "설치 완료"
echo "다음 단계: SETUP.md 체크리스트를 따라 프로젝트별 값을 갱신하세요."
echo "  1) CLAUDE.md 상단 [프로젝트명] 치환"
echo "  2) tokens/primitive/*.json 을 브랜드 팔레트 값으로 갱신 → npm run build:tokens"
echo "  3) Claude Code 재시작 후 /hooks 로 훅 활성화 확인"
