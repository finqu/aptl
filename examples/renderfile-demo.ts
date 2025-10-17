/**
 * Example: Using renderFile with different FileSystem implementations
 */

import { APTLEngine } from '../src/core/engine';
import { ObjectFileSystem } from '../src/filesystem/object-filesystem';

// Example 1: Using ObjectFileSystem (in-memory)
async function exampleWithObjectFileSystem() {
  console.log('=== Example 1: ObjectFileSystem ===\n');

  // Create an in-memory file system with template files
  const fs = new ObjectFileSystem({
    '/templates/greeting.aptl': 'Hello {{ name }}!',
    '/templates/email.aptl': `Dear {{ recipient }},

Thank you for your interest.

Best regards,
{{ sender }}`,
  });

  // Create engine with file system
  const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });

  // Render templates from files
  const greeting = await engine.renderFile('/templates/greeting.aptl', {
    name: 'World',
  });
  console.log('Greeting:', greeting);

  const email = await engine.renderFile('/templates/email.aptl', {
    recipient: 'Alice',
    sender: 'Bob',
  });
  console.log('\nEmail:\n', email);
}

// Example 2: Using LocalFileSystem (Node.js only)
async function exampleWithLocalFileSystem() {
  console.log('\n=== Example 2: LocalFileSystem (Node.js) ===\n');

  try {
    // Import LocalFileSystem (Node.js specific)
    const { LocalFileSystem } = await import(
      '../src/filesystem/local-filesystem'
    );

    const fs = new LocalFileSystem();
    const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });

    // Note: This would read actual files from disk
    // const result = await engine.renderFile('./templates/mytemplate.aptl', data);
    console.log(
      'LocalFileSystem is available for reading actual files from disk',
    );
  } catch (error) {
    console.log('LocalFileSystem requires Node.js environment');
  }
}

// Example 3: Error handling
async function exampleErrorHandling() {
  console.log('\n=== Example 3: Error Handling ===\n');

  const fs = new ObjectFileSystem({
    '/templates/example.aptl': 'Hello',
  });

  const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });

  try {
    // Try to render non-existent file
    await engine.renderFile('/templates/missing.aptl');
  } catch (error) {
    console.log('Caught error:', (error as Error).message);
  }

  // Engine without fileSystem
  const engineNoFS = new APTLEngine('gpt-5.1');
  try {
    await engineNoFS.renderFile('any.aptl');
  } catch (error) {
    console.log('Caught error:', (error as Error).message);
  }
}

// Example 4: Template caching
async function exampleCaching() {
  console.log('\n=== Example 4: Template Caching ===\n');

  const fs = new ObjectFileSystem({
    '/templates/counter.aptl': 'Count: {{ count }}',
  });

  const engine = new APTLEngine('gpt-5.1', { fileSystem: fs, cache: true });

  // First render - template gets compiled and cached
  const result1 = await engine.renderFile('/templates/counter.aptl', {
    count: 1,
  });
  console.log('First render:', result1);

  // Second render - uses cached compiled template
  const result2 = await engine.renderFile('/templates/counter.aptl', {
    count: 2,
  });
  console.log('Second render (from cache):', result2);

  // Clear cache
  engine.clearCache();
  console.log('Cache cleared');

  const result3 = await engine.renderFile('/templates/counter.aptl', {
    count: 3,
  });
  console.log('Third render (recompiled):', result3);
}

// Run all examples
async function main() {
  await exampleWithObjectFileSystem();
  await exampleWithLocalFileSystem();
  await exampleErrorHandling();
  await exampleCaching();
}

main().catch(console.error);
