'use client';

import { useState } from 'react';
import type { TenantTheme } from '@/lib/types/theme';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Merriweather',
];

const COLOR_FIELDS: { key: keyof TenantTheme['colors']; label: string }[] = [
  { key: 'primary', label: 'Primary color' },
  { key: 'secondary', label: 'Secondary color' },
  { key: 'accent', label: 'Accent color' },
  { key: 'background', label: 'Background color' },
  { key: 'text', label: 'Text color' },
];

const FONT_FIELDS: { key: keyof TenantTheme['fonts']; label: string }[] = [
  { key: 'heading', label: 'Heading font' },
  { key: 'body', label: 'Body font' },
];

interface ThemeEditorProps {
  theme: TenantTheme;
  onChange: (theme: TenantTheme) => void;
}

export default function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const [current, setCurrent] = useState<TenantTheme>(theme);

  function updateColor(key: keyof TenantTheme['colors'], value: string) {
    const next: TenantTheme = {
      ...current,
      colors: { ...current.colors, [key]: value },
    };
    setCurrent(next);
    onChange(next);
  }

  function updateFont(key: keyof TenantTheme['fonts'], value: string) {
    const next: TenantTheme = {
      ...current,
      fonts: { ...current.fonts, [key]: value },
    };
    setCurrent(next);
    onChange(next);
  }

  function updateField(patch: Partial<Pick<TenantTheme, 'logo' | 'favicon' | 'borderRadius'>>) {
    const next: TenantTheme = { ...current, ...patch };
    setCurrent(next);
    onChange(next);
  }

  const borderRadiusValue = parseInt((current.borderRadius ?? '0').replace(/px$/, ''), 10) || 0;

  return (
    <div className="space-y-8">
      {/* Colors */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Colors</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`color-${key}`} className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id={`color-${key}`}
                  type="color"
                  value={current.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
                />
                <span className="text-sm font-mono text-gray-600">{current.colors[key]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fonts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Fonts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FONT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`font-${key}`} className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <select
                id={`font-${key}`}
                value={current.fonts[key]}
                onChange={(e) => updateFont(key, e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Assets */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Assets</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="theme-logo" className="block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <input
              id="theme-logo"
              type="text"
              value={current.logo ?? ''}
              onChange={(e) => updateField({ logo: e.target.value })}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label htmlFor="theme-favicon" className="block text-sm font-medium text-gray-700">
              Favicon URL
            </label>
            <input
              id="theme-favicon"
              type="text"
              value={current.favicon ?? ''}
              onChange={(e) => updateField({ favicon: e.target.value })}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://example.com/favicon.ico"
            />
          </div>
        </div>
      </section>

      {/* Shape */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Shape</h2>
        <div className="max-w-lg">
          <label htmlFor="theme-border-radius" className="block text-sm font-medium text-gray-700">
            Border radius
          </label>
          <div className="mt-1 flex items-center gap-4">
            <input
              id="theme-border-radius"
              type="range"
              min={0}
              max={32}
              value={borderRadiusValue}
              onChange={(e) => updateField({ borderRadius: `${e.target.value}px` })}
              className="flex-1"
            />
            <span className="w-14 text-right text-sm font-mono text-gray-700">
              {borderRadiusValue}px
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
