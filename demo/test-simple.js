import { APTLEngine } from '@finqu/aptl';

const engine = new APTLEngine('test');
const template = `You are an AI assistant designed to help users with @{domain|"general tasks"}.`;

const result = await engine.render(template, {domain: "testing"});
console.log('Success:', result);
