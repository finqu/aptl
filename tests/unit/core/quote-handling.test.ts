import { APTLEngine } from '@/core/engine';

describe('Quote handling', () => {
  it('should handle quotes in directive arguments', async () => {
    const template = `
@section test(format="plain")
Content here
@end
    `.trim();

    const engine = new APTLEngine('gpt-4');
    const result = await engine.render(template);
    expect(result).toContain('Content here');
  });

  it('should handle quotes with commas in directive arguments', async () => {
    const template = `
@section test(title="Hello, World")
Content here
@end
    `.trim();

    const engine = new APTLEngine('gpt-4');
    const result = await engine.render(template);
    expect(result).toContain('Content here');
  });

  it('should handle quotes in template body text', async () => {
    const template = `
@section test
User: "How do I do this?"
Assistant: "Let me help"
@end
    `.trim();

    const engine = new APTLEngine('gpt-4');
    const result = await engine.render(template);
    expect(result).toContain('User: "How do I do this?"');
    expect(result).toContain('Assistant: "Let me help"');
  });
});
