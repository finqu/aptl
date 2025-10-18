#!/usr/bin/env node

/**
 * APTL Demo - Real-world AI System Prompt Examples
 * 
 * This demo shows how to use APTL to create sophisticated AI agent system prompts
 * with template inheritance, snippet inclusion, and conditional logic.
 */

import { APTLEngine, TemplateRegistry } from '@finqu/aptl';
// LocalFileSystem is Node-specific and exported separately
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Utility function to print section headers
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('🚀 APTL Demo - AI System Prompt Generation');
  console.log('This demo generates production-ready system prompts for AI agents\n');

  // Initialize the file system pointing to the prompts directory
  const promptsDir = join(__dirname, 'prompts');
  const fileSystem = new LocalFileSystem(promptsDir);

  // Create APTL engine with the file system
  const engine = new APTLEngine('gpt-4', { fileSystem });

  // Create template registry for easier template management
  const registry = new TemplateRegistry(engine, { fileSystem });

  // Load all templates from the prompts directory structure
  printHeader('Loading Prompt Templates');
  console.log(`📁 Loading from: ${promptsDir}`);
  
  await registry.loadDirectory('base');
  await registry.loadDirectory('snippets');
  await registry.loadDirectory('templates');
  
  const templateList = registry.list();
  console.log(`✅ Loaded ${templateList.length} templates and snippets:`);
  console.log('   Base templates:', registry.list().filter(n => n.includes('agent-base')));
  console.log('   Snippets:', registry.list().filter(n => 
    n.includes('ethical') || n.includes('code-review') || 
    n.includes('thinking') || n.includes('output')));
  console.log('   Agent templates:', registry.list().filter(n => 
    n.includes('coding') || n.includes('data') || 
    n.includes('technical') || n.includes('customer') || n.includes('research')));

  // Demo 1: Coding Assistant
  printHeader('Demo 1: Coding Assistant System Prompt');
  // Demo 1: Coding Assistant
  printHeader('Demo 1: Coding Assistant System Prompt');
  
  const codingAssistantData = {
    agentName: 'CodeAssist Pro',
    primaryPurpose: 'assist developers with coding tasks',
    expertise: ['TypeScript', 'Python', 'Rust', 'System Design'],
    capabilities: [
      'Code generation and refactoring',
      'Bug detection and debugging',
      'Architecture design guidance',
      'Performance optimization',
      'Security vulnerability analysis'
    ],
    tone: 'technical',
    knowledgeCutoff: 'October 2024',
    languages: ['TypeScript', 'Python', 'Rust'],
    frameworks: 'React, FastAPI, Tokio',
    securityLevel: 'high',
    includeFrameworks: true,
    includeOptimization: true,
    includeContentPolicy: true,
    includeStyleGuide: true
  };

  const codingAssistant = registry.get('templates/coding-assistant');
  const codingResult = codingAssistant.render(codingAssistantData);
  console.log(codingResult);

  // Demo 2: Data Analysis Assistant
  printHeader('Demo 2: Data Analysis Assistant System Prompt');
  
  const dataAnalystData = {
    agentName: 'DataAnalyst AI',
    primaryPurpose: 'help users analyze data and extract insights',
    expertise: ['Statistical Analysis', 'Data Visualization', 'Predictive Modeling'],
    capabilities: [
      'Exploratory data analysis',
      'Statistical hypothesis testing',
      'Data cleaning and preprocessing',
      'Visualization recommendations',
      'A/B test analysis'
    ],
    tone: 'professional',
    knowledgeCutoff: 'October 2024',
    tools: 'Python, SQL, Pandas, Matplotlib, R',
    statisticalLevel: 'advanced',
    includeVisualization: true,
    includeEthics: true,
    includeContentPolicy: true
  };

  const dataAnalyst = registry.get('templates/data-analyst');
  const dataResult = dataAnalyst.render(dataAnalystData);
  console.log(dataResult);

  // Demo 3: Technical Writer Assistant
  printHeader('Demo 3: Technical Writer Assistant System Prompt');
  
  const technicalWriterData = {
    agentName: 'DocWriter',
    primaryPurpose: 'create clear and comprehensive technical documentation',
    expertise: ['API Documentation', 'User Guides', 'Technical Specifications'],
    capabilities: [
      'API reference generation',
      'Tutorial creation',
      'README authoring',
      'Architecture decision records',
      'Release notes'
    ],
    tone: 'professional',
    knowledgeCutoff: 'October 2024',
    audience: 'developers',
    style: 'Google',
    specialized: 'API and SDK documentation',
    includeContentPolicy: true,
    format: 'structured'
  };

  const technicalWriter = registry.get('templates/technical-writer');
  const writerResult = technicalWriter.render(technicalWriterData);
  console.log(writerResult);

  // Demo 4: Customer Support Assistant
  printHeader('Demo 4: Customer Support Assistant System Prompt');
  
  const customerSupportData = {
    agentName: 'SupportBot',
    primaryPurpose: 'provide excellent technical support',
    expertise: ['Troubleshooting', 'Product Knowledge', 'Customer Communication'],
    capabilities: [
      'Troubleshoot technical issues',
      'Guide users through features',
      'Provide workarounds',
      'Escalate complex problems',
      'Document feedback'
    ],
    tone: 'conversational',
    knowledgeCutoff: 'October 2024',
    product: 'CloudPlatform Pro',
    productAreas: 'Authentication, File Storage, API Integration',
    includeEscalation: true,
    includeContentPolicy: true,
    format: 'conversational',
    sla: '24 hours',
    commonIssues: [
      {
        title: 'Login Issues',
        description: 'Users cannot access their account',
        solution: 'Clear browser cookies and cache. If issue persists, initiate password reset.',
        preventionTip: 'Enable two-factor authentication for enhanced security'
      },
      {
        title: 'File Upload Failures',
        description: 'Files fail to upload or show error 500',
        solution: 'Check file size (max 100MB) and format. Try different browser. Clear cache.',
        preventionTip: 'Compress large files before uploading'
      },
      {
        title: 'API Rate Limiting',
        description: 'API requests return 429 Too Many Requests',
        solution: 'Current limit is 1000 requests/hour. Implement exponential backoff. Upgrade plan if needed.',
        preventionTip: 'Cache responses and batch requests when possible'
      }
    ]
  };

  const customerSupport = registry.get('templates/customer-support');
  const supportResult = customerSupport.render(customerSupportData);
  console.log(supportResult);

  // Demo 5: Research Assistant
  printHeader('Demo 5: Research Assistant System Prompt');
  
  const researchAssistantData = {
    agentName: 'ResearchAI',
    primaryPurpose: 'help users conduct thorough research and analysis',
    expertise: ['Information Synthesis', 'Critical Thinking', 'Source Evaluation'],
    capabilities: [
      'Literature review',
      'Fact-checking',
      'Argument analysis',
      'Hypothesis generation',
      'Citation management'
    ],
    tone: 'professional',
    knowledgeCutoff: 'October 2024',
    domain: 'Computer Science and AI',
    specialized: 'Machine Learning, AI Ethics, Software Engineering',
    includeCitations: true,
    synthesisStyle: 'analytical',
    includeContentPolicy: true,
    includeReflection: true
  };

  const researchAssistant = registry.get('templates/research-assistant');
  const researchResult = researchAssistant.render(researchAssistantData);
  console.log(researchResult);

  // Final summary
  printHeader('Demo Complete');
  console.log('✅ All AI system prompts generated successfully!\n');
  console.log('Key features demonstrated:');
  console.log('  • Template inheritance (@extends) - All agents extend agent-base.aptl');
  console.log('  • Snippet inclusion (@include) - Reusable components like ethical-guidelines');
  console.log('  • Conditional logic (@if/@elif/@else) - Context-aware prompt generation');
  console.log('  • Dynamic lists (@each) - Capabilities and features from data');
  console.log('  • Variable interpolation - @{variable|"default"} with fallbacks');
  console.log('  • Section overriding - Customize specific sections while keeping base structure\n');
  console.log('Next steps:');
  console.log('  1. Explore the templates in prompts/templates/');
  console.log('  2. Check out reusable snippets in prompts/snippets/');
  console.log('  3. Read prompts/README.md for detailed documentation');
  console.log('  4. Create your own custom agent templates');
  console.log('  5. Build a library of domain-specific snippets\n');
}

// Run the demo
main().catch((error) => {
  console.error('❌ Demo failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
