import en from './en.json' with { type: 'json' };

export type TranslationKey = keyof typeof en | (string & {});

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dictionary = en as Record<string, string>;
  const template = dictionary[key] ?? key;

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, match: string) => {
    return params[match] !== undefined ? String(params[match]) : `{${match}}`;
  });
}
