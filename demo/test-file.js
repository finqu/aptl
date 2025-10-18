import { APTLEngine } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';

const fs = new LocalFileSystem('.');
const engine = new APTLEngine('test', { fileSystem: fs });

const result = await engine.renderFile('test.aptl', {});
console.log('Success:', result);
