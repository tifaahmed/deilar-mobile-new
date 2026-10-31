// Old Android WebViews (Android 9 / Chrome < 111) cannot read what Tailwind v4 emits:
// `oklch()` colours, `@layer` (Chrome < 99 drops the WHOLE block) and `@property` defaults.
// These plugins rewrite the built CSS into plain syntax those WebViews understand.
import cascadeLayers from '@csstools/postcss-cascade-layers';
import oklab from '@csstools/postcss-oklab-function';

/** `@property --x { initial-value: v }` → `*,::before,::after,::backdrop { --x: v }` (browsers without @property). */
const propertyDefaults = () => ({
  postcssPlugin: 'property-defaults',
  OnceExit(root, {Rule, Declaration}) {
    const rule = new Rule({selector: '*, ::before, ::after, ::backdrop'});
    root.walkAtRules('property', (at) => {
      let initial;
      at.walkDecls('initial-value', (d) => {
        initial = d.value;
      });
      if (initial !== undefined) rule.append(new Declaration({prop: at.params, value: initial}));
    });
    if (rule.nodes?.length) root.prepend(rule);
  },
});
propertyDefaults.postcss = true;

/** `100dvh` (Chrome 108+) → keep it, but put a plain `vh` value just before it for older WebViews. */
const dvhFallback = () => ({
  postcssPlugin: 'dvh-fallback',
  Declaration(decl) {
    if (!decl.value.includes('dvh')) return;
    const plain = decl.value.replace(/dvh/g, 'vh');
    if (decl.prev()?.prop === decl.prop && decl.prev()?.value === plain) return;
    decl.before(decl.clone({value: plain}));
  },
});
dvhFallback.postcss = true;

export default {
  plugins: [cascadeLayers(), oklab({preserve: false}), propertyDefaults(), dvhFallback()],
};
