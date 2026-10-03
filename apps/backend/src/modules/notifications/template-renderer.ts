/**
 * template-renderer.ts — Safe template string interpolation
 * Replaces {{variable}} or {{nested.path}} with stringified values.
 */

export class TemplateRenderer {
  /**
   * Renders a template string by replacing {{key}} tokens with values from the context object.
   */
  static render(template: string, context: Record<string, unknown> = {}): string {
    if (!template) {
      return '';
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, token: string) => {
      const value = this.resolvePath(context, token);
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  private static resolvePath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
