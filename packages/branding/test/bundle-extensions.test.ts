import { describe, expect, it } from 'vitest';
import {
  FIRST_PARTY_EXTENSIONS,
  THEME_EXTENSION_DIR,
  buildThemeManifest,
} from '../scripts/bundle-extensions.mjs';

// Shape of the synced osiris-theme-<ver>.vsix's own `extension/package.json` —
// buildThemeManifest() re-wraps this verbatim, it doesn't invent contributions.
const fixtureVsixPkg = {
  name: 'osiris-theme',
  version: '0.1.3',
  license: 'MIT',
  engines: { vscode: '^1.70.0' },
  contributes: {
    themes: [
      { label: 'Osiris Dark', uiTheme: 'vs-dark', path: './themes/osiris-dark-color-theme.json' },
      { label: 'Osiris Light', uiTheme: 'vs', path: './themes/osiris-light-color-theme.json' },
    ],
    iconThemes: [
      {
        id: 'osiris-file-icons',
        label: 'Osiris File Icons',
        path: './fileicons/osiris-file-icons.json',
      },
    ],
    configurationDefaults: { 'workbench.colorTheme': 'Osiris Dark' },
  },
};

describe('bundle-extensions', () => {
  it('ships osiris-workspace as first-party', () => {
    expect(FIRST_PARTY_EXTENSIONS).toEqual(['osiris-workspace']);
  });

  it('buildThemeManifest re-wraps the synced vsix manifest verbatim', () => {
    const manifest = buildThemeManifest(fixtureVsixPkg);

    expect(manifest.name).toBe(THEME_EXTENSION_DIR);
    expect(manifest.publisher).toBe('osiris-studio');
    expect(manifest.version).toBe(fixtureVsixPkg.version);
    expect(manifest.contributes.themes.map((t: { label: string }) => t.label)).toEqual([
      'Osiris Dark',
      'Osiris Light',
    ]);
    expect(manifest.contributes.iconThemes[0].id).toBe('osiris-file-icons');
    expect(manifest.contributes.configurationDefaults['workbench.colorTheme']).toBe('Osiris Dark');
    // no `main` — a pure theme extension
    expect((manifest as { main?: string }).main).toBeUndefined();
  });
});
