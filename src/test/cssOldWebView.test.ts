import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
// @ts-ignore — the PostCSS config is plain JS
import config from '../../postcss.config.mjs';

/** What an old Android WebView (Oppo A31, Chrome < 111) gets after the build's PostCSS step. */
const build = async (css: string) => (await postcss(config.plugins).process(css, { from: undefined })).css;

describe('CSS for old Android WebViews', () => {
  it('drops the "in oklab" of a gradient (Chrome < 111 would discard the whole background otherwise)', async () => {
    const out = await build('.g{--tw-gradient-position:to bottom right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}');
    expect(out).toContain('--tw-gradient-position:to bottom right');
    expect(out).not.toMatch(/in\s+oklab/);
    expect(out).toContain('linear-gradient(var(--tw-gradient-stops))');
  });

  it('also handles other colour spaces and hue directions', async () => {
    const out = await build('.g{--tw-gradient-position:to right in oklch longer hue}.h{--tw-gradient-position:90deg in srgb}');
    expect(out).toContain('--tw-gradient-position:to right}');
    expect(out).toContain('--tw-gradient-position:90deg}');
  });

  it('leaves a gradient position without a colour space alone', async () => {
    expect(await build('.g{--tw-gradient-position:to left}')).toContain('--tw-gradient-position:to left');
  });

  it('still turns oklch colours into plain rgb and keeps a vh fallback before dvh', async () => {
    const out = await build('.c{color:oklch(0.7 0.1 200);min-height:100dvh}');
    expect(out).not.toMatch(/oklch\(/);
    expect(out.indexOf('100vh')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('100vh')).toBeLessThan(out.indexOf('100dvh'));
  });
});
