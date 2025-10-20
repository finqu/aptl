import { APTLEngine } from './dist/esm/index.mjs';

const engine = new APTLEngine('test-model');

const template = `
@switch
  @case "test"
    Test
@end
`.trim();

try {
  const result = await engine.render(template);
  console.log('Success! Result:', JSON.stringify(result));
} catch (err) {
  console.log('Error:', err.message);
  console.log('Type:', err.constructor.name);
  console.log('Full error:', err);
}
