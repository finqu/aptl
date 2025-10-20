const { APTLEngine } = require('./dist/cjs/index.cjs');

const engine = new APTLEngine('test-model');

const template = `
@switch
  @case "test"
    Test
@end
`.trim();

engine.render(template).then(result => {
  console.log('Result:', JSON.stringify(result));
}).catch(err => {
  console.log('Error:', err.message);
  console.log('Type:', err.constructor.name);
});
