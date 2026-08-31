import StyleDictionary from "style-dictionary";

// ── 빌드 설정 ──
// tokens/primitive + tokens/semantic → Tailwind @theme 블록으로 출력.
// @theme 로 내보내면 Tailwind 유틸리티가 생성되고, :root 변수로도 노출되어
// var(--color-action-primary) 같은 직접 참조도 동작한다.
// 상세: docs/token-architecture.md
//
// 토큰 값은 아임웹 Clay 디자인 시스템(_reference/…/design-system/clay/vars.css)이 원천.

// ── 커스텀 name transform ──
// 기본 name/kebab 은 lodash kebabCase 를 쓰기 때문에 숫자·문자 경계를 쪼갠다.
//   "text.2xsmall" → --text-2-xsmall  (Clay 원본은 --clay-text-2xsmall)
// 토큰 키를 이미 kebab-case 로 작성하므로, path 를 그대로 이어 붙인다.
StyleDictionary.registerTransform({
  name: "name/clay",
  type: "name",
  transform: (token, config) =>
    [config.prefix, ...token.path].filter(Boolean).join("-"),
});

// ── 커스텀 transform group ──
// 기본 "css" 그룹의 size/rem 을 제외해 px 를 그대로 유지한다.
// Clay 는 관리자 대시보드용이라 모든 치수가 px 고정이다.
StyleDictionary.registerTransformGroup({
  name: "css/clay",
  transforms: ["attribute/cti", "name/clay", "time/seconds", "color/css"],
});

const sd = new StyleDictionary({
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css/clay",
      buildPath: "src/tokens/",
      files: [
        {
          destination: "_generated.css",
          format: "css/variables",
          options: {
            outputReferences: true,
            selector: "@theme",
          },
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
console.log("\n✅ Style Dictionary 빌드 완료");
console.log("   CSS → src/tokens/_generated.css");
