#!/usr/bin/env node

/**
 * APTL Demo - Real-world examples using LocalFileSystem
 * 
 * This demo shows how to use APTL in a real Node.js application
 * with templates stored in actual files on the file system.
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
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 APTL Demo - Real-world Template Rendering');
  console.log('This demo uses actual .aptl files from the templates/ directory\n');

  // Initialize the file system pointing to the templates directory
  const templatesDir = join(__dirname, 'templates');
  const fileSystem = new LocalFileSystem(templatesDir);

  // Create APTL engine with the file system
  const engine = new APTLEngine('gpt-4', { fileSystem });

  // Create template registry for easier template management
  const registry = new TemplateRegistry(engine, { fileSystem });

  // Load all templates from the templates directory
  printHeader('Loading Templates');
  console.log(`📁 Loading templates from: ${templatesDir}`);
  await registry.loadDirectory('.');
  
  const templateList = registry.list();
  console.log(`✅ Loaded ${templateList.length} templates:`);
  templateList.forEach(name => console.log(`   - ${name}`));

  // Demo 1: Simple Email Template
  printHeader('Demo 1: Welcome Email Template');
  
  const welcomeEmailData = {
    emailType: 'welcome',
    appName: 'APTL Platform',
    appUrl: 'https://aptl.dev',
    user: {
      name: 'Alice Johnson',
      isPremium: true,
      premiumUntil: '2025-12-31'
    },
    premiumFeatures: [
      'Advanced template inheritance',
      'Custom formatters',
      'Priority support',
      'Template analytics'
    ],
    unsubscribeLink: 'https://aptl.dev/unsubscribe/abc123'
  };

  const welcomeEmail = registry.get('email');
  const welcomeResult = welcomeEmail.render(welcomeEmailData);
  console.log(welcomeResult);

  // Demo 2: Notification Email
  printHeader('Demo 2: Notification Email Template');
  
  const notificationEmailData = {
    emailType: 'notification',
    appName: 'APTL Platform',
    appUrl: 'https://aptl.dev',
    user: {
      name: 'Bob Smith',
      isPremium: false
    },
    notifications: [
      { message: 'New template shared with you', time: '2 hours ago' },
      { message: 'Comment on your template', time: '5 hours ago' },
      { message: 'System maintenance scheduled', time: '1 day ago' }
    ],
    premiumFeatures: [
      'Advanced template inheritance',
      'Custom formatters',
      'Priority support'
    ]
  };

  const notificationResult = welcomeEmail.render(notificationEmailData);
  console.log(notificationResult);

  // Demo 3: Analytics Report
  printHeader('Demo 3: Analytics Report Template');
  
  const reportData = {
    reportTitle: 'Q4 2024 User Analytics Report',
    period: 'October 1 - December 31, 2024',
    generatedDate: new Date().toLocaleDateString(),
    appName: 'APTL Analytics',
    contactEmail: 'analytics@aptl.dev',
    summary: {
      totalUsers: 15420,
      activeUsers: 12336,
      activePercentage: 80,
      growth: 23.5,
      revenue: 145600
    },
    metrics: [
      {
        name: 'Template Compilations',
        value: 234500,
        previousValue: 189200,
        change: 23.9,
        target: 200000
      },
      {
        name: 'Average Response Time',
        value: 45,
        previousValue: 52,
        change: -13.5,
        target: 50
      },
      {
        name: 'Error Rate',
        value: 0.3,
        previousValue: 0.8,
        change: -62.5,
        target: 1.0
      }
    ],
    insights: [
      {
        title: 'Strong User Growth',
        description: 'The platform experienced 23.5% growth in Q4, exceeding our target of 20%.',
        recommendations: [
          'Continue current marketing strategies',
          'Expand to new markets in Q1 2025',
          'Invest in customer success team'
        ]
      },
      {
        title: 'Performance Improvements',
        description: 'Average response time decreased by 13.5% due to infrastructure optimizations.',
        recommendations: [
          'Monitor performance metrics closely',
          'Plan for scaling infrastructure',
          'Document optimization techniques'
        ]
      }
    ]
  };

  const report = registry.get('report');
  const reportResult = report.render(reportData);
  console.log(reportResult);

  // Demo 4: Template Inheritance - Coding Assistant
  printHeader('Demo 4: Template Inheritance - Coding Assistant');
  
  const codingAssistantData = {
    agentName: 'CodeMaster',
    domain: 'software development',
    languages: 'Python, JavaScript, TypeScript, and Go',
    primaryLanguage: 'TypeScript',
    verbosity: 'detailed',
    securityMode: 'strict',
    includeCodeSnippets: true,
    capabilities: [
      'Code generation and completion',
      'Bug detection and fixing',
      'Code refactoring suggestions',
      'Documentation generation',
      'Unit test creation'
    ]
  };

  const codingAssistant = registry.get('coding-assistant');
  const codingResult = codingAssistant.render(codingAssistantData);
  console.log(codingResult);

  // Demo 5: Direct file rendering (without registry)
  printHeader('Demo 5: Direct File Rendering');
  
  console.log('Rendering base.aptl directly using engine.renderFile():\n');
  
  const baseData = {
    domain: 'data science',
    verbosity: 'concise',
    capabilities: [
      'Data analysis and visualization',
      'Statistical modeling',
      'Machine learning algorithms',
      'Data preprocessing'
    ]
  };

  const baseResult = await engine.renderFile('base.aptl', baseData);
  console.log(baseResult);

  // Final summary
  printHeader('Demo Complete');
  console.log('✅ All demos executed successfully!');
  console.log('\nKey takeaways:');
  console.log('• APTL works seamlessly with real file systems');
  console.log('• Templates can use inheritance (@extends directive)');
  console.log('• Conditionals and loops make templates flexible');
  console.log('• TemplateRegistry simplifies template management');
  console.log('• Different formatters (markdown, plain) can be used');
  console.log('\nTry modifying the templates in the templates/ directory');
  console.log('and run this demo again to see the changes!\n');
}

// Run the demo
main().catch((error) => {
  console.error('❌ Demo failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
