import { APTLEngine } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';

const fs = new LocalFileSystem('templates');
const engine = new APTLEngine('gpt-4', { fileSystem: fs });

try {
  const content = await engine.renderFile('base.aptl', { domain: 'test', capabilities: ['one', 'two'] });
  console.log('base.aptl loaded successfully');
  console.log(content);
} catch (e) {
  console.error('Failed to load base.aptl:', e.message);
}
