import { describe, expect, it, afterEach } from 'vitest';
import {
  ASSET_PATTERNS,
  matchAssetPaths,
  readThemeConfig,
  resolveThemeRelease,
  listThemeTree,
} from '../scripts/sync-theme.mjs';

describe('readThemeConfig', () => {
  afterEach(() => {
    delete process.env.OSIRIS_THEME_VERSION;
  });

  it('loads the pinned repository + release', async () => {
    const config = await readThemeConfig();
    expect(config.repository).toBe('richardblaha/osiris-theme');
    expect(config.release).toBe('latest');
  });

  it('OSIRIS_THEME_VERSION overrides the pinned release', async () => {
    process.env.OSIRIS_THEME_VERSION = 'v0.1.2';
    const config = await readThemeConfig();
    expect(config.release).toBe('v0.1.2');
  });
});

describe('matchAssetPaths', () => {
  it('matches exact paths and everything under a directory prefix', () => {
    const paths = [
      'assets/icons/osiris-logo.svg',
      'assets/icons/app/osiris.icns',
      'assets/icons/app/png/osiris-16.png',
      'assets/icons/app/hicolor/16x16/apps/osiris.png',
      'assets/icons/app/README.md',
      'docs/DESIGN_SYSTEM.md',
    ];
    expect(matchAssetPaths(paths)).toEqual([
      'assets/icons/osiris-logo.svg',
      'assets/icons/app/osiris.icns',
      'assets/icons/app/png/osiris-16.png',
      'assets/icons/app/hicolor/16x16/apps/osiris.png',
    ]);
  });

  it('returns nothing for an empty tree', () => {
    expect(matchAssetPaths([])).toEqual([]);
  });
});

describe('ASSET_PATTERNS', () => {
  it('covers the logo, app icons, watermarks, font and tokens', () => {
    expect(ASSET_PATTERNS).toContain('assets/icons/osiris-logo.svg');
    expect(ASSET_PATTERNS).toContain('assets/icons/app/png/');
    expect(ASSET_PATTERNS).toContain('assets/icons/app/hicolor/');
    expect(ASSET_PATTERNS).toContain('assets/fonts/fira-code/FiraCode-VF.woff2');
    expect(ASSET_PATTERNS).toContain('assets/tokens.json');
  });
});

describe('resolveThemeRelease', () => {
  it('picks the osiris-theme-*.vsix asset off an injected fetch', async () => {
    const fakeFetch = async (url: string) => {
      expect(url).toMatch(/releases\/latest$/);
      return {
        ok: true,
        json: async () => ({
          tag_name: 'v0.1.3',
          assets: [
            {
              name: 'osiris-desktop-theme_0.1.3-1_all.deb',
              browser_download_url: 'https://example.test/deb',
            },
            { name: 'osiris-theme-0.1.3.vsix', browser_download_url: 'https://example.test/vsix' },
          ],
        }),
      };
    };
    const release = await resolveThemeRelease(
      { repository: 'richardblaha/osiris-theme', release: 'latest' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(release).toEqual({
      tag: 'v0.1.3',
      version: '0.1.3',
      vsixUrl: 'https://example.test/vsix',
      vsixName: 'osiris-theme-0.1.3.vsix',
    });
  });

  it('hits /releases/tags/<tag> for a pinned release', async () => {
    const fakeFetch = async (url: string) => {
      expect(url).toMatch(/releases\/tags\/v0\.1\.2$/);
      return {
        ok: true,
        json: async () => ({
          tag_name: 'v0.1.2',
          assets: [{ name: 'osiris-theme-0.1.2.vsix', browser_download_url: 'x' }],
        }),
      };
    };
    const release = await resolveThemeRelease(
      { repository: 'richardblaha/osiris-theme', release: 'v0.1.2' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(release.tag).toBe('v0.1.2');
  });

  it('throws when no vsix asset is present', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v0.1.3', assets: [] }),
    });
    await expect(
      resolveThemeRelease(
        { repository: 'richardblaha/osiris-theme', release: 'latest' },
        fakeFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/no osiris-theme-\*\.vsix/);
  });

  it('throws on a non-ok response', async () => {
    const fakeFetch = async () => ({ ok: false, status: 404 });
    await expect(
      resolveThemeRelease(
        { repository: 'r/x', release: 'latest' },
        fakeFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/404/);
  });
});

describe('listThemeTree', () => {
  it('throws when GitHub reports a truncated tree', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ truncated: true, tree: [] }) });
    await expect(listThemeTree('r/x', 'v1', fakeFetch as unknown as typeof fetch)).rejects.toThrow(
      /truncated/,
    );
  });

  it('filters to blobs and returns their paths', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        truncated: false,
        tree: [
          { type: 'blob', path: 'assets/tokens.json' },
          { type: 'tree', path: 'assets' },
        ],
      }),
    });
    const paths = await listThemeTree('r/x', 'v1', fakeFetch as unknown as typeof fetch);
    expect(paths).toEqual(['assets/tokens.json']);
  });
});
