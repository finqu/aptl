/**
 * APTL Core Type Definitions
 */

import type { FileSystem } from '@/filesystem';

// ============================================================================
// Token Types
// ============================================================================

export enum TokenType {
  TEXT = 'TEXT',
  VARIABLE = 'VARIABLE',
  END = 'END',
  COMMENT_LINE = 'COMMENT_LINE',
  COMMENT_BLOCK = 'COMMENT_BLOCK',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  NEWLINE = 'NEWLINE',
  ATTRIBUTE = 'ATTRIBUTE',
  STRING = 'STRING',
  OPERATOR = 'OPERATOR',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  ASSIGN = 'ASSIGN',
  PUNCTUATION = 'PUNCTUATION',
  IDENTIFIER = 'IDENTIFIER',
  EOF = 'EOF',
  DIRECTIVE = 'DIRECTIVE',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  indent?: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

export enum NodeType {
  TEMPLATE = 'TEMPLATE',
  VARIABLE = 'VARIABLE',
  TEXT = 'TEXT',
  COMMENT = 'COMMENT',
  DIRECTIVE = 'DIRECTIVE',
}

export interface ASTNode {
  type: NodeType;
  line?: number;
  column?: number;
}

export interface TemplateNode extends ASTNode {
  type: NodeType.TEMPLATE;
  children: ASTNode[];
}

export interface VariableNode extends ASTNode {
  type: NodeType.VARIABLE;
  path: string;
}

export interface TextNode extends ASTNode {
  type: NodeType.TEXT;
  value: string;
}

export interface CommentNode extends ASTNode {
  type: NodeType.COMMENT;
  value: string;
}

export interface DirectiveNode extends ASTNode {
  type: NodeType.DIRECTIVE;
  name: string;
  rawArgs: string;  // Raw unparsed arguments from the template
  parsedArgs?: any; // Parsed arguments (set by directive-specific parser)
  children: ASTNode[];
}

// ============================================================================
// Compiled Template Types
// ============================================================================

export interface CompiledTemplate {
  render(data: Record<string, any>): string;
  source?: string;
}

// ============================================================================
// Output Formatting
// ============================================================================

export interface Section {
  name: string;
  attributes: Record<string, string>;
  content: string;
  children?: Section[]; // For nested sections
}

export interface OutputFormatter {
  /**
   * Format multiple sections
   */
  format(sections: Section[]): string;

  /**
   * Format a single section
   */
  formatSection(section: Section): string;

  /**
   * Check if this formatter supports a given format name
   */
  supportsFormat(format: string): boolean;
}

export interface FormatterRegistry {
  /**
   * Register a formatter with a name
   */
  register(name: string, formatter: OutputFormatter): void;

  /**
   * Get a formatter by name
   */
  get(name: string): OutputFormatter | undefined;

  /**
   * Get the appropriate formatter based on section attributes
   */
  getForAttributes(attributes: Record<string, string>): OutputFormatter;

  /**
   * Set the default formatter
   */
  setDefaultFormatter(formatter: OutputFormatter): void;
}

// ============================================================================
// Helper Functions
// ============================================================================

export type HelperFunction = (...args: any[]) => any;

// ============================================================================
// Engine Options
// ============================================================================

export interface APTLOptions {
  strict?: boolean;
  cache?: boolean;
  formatter?: OutputFormatter;
  helpers?: Record<string, HelperFunction>;
  fileSystem?: FileSystem;
}

export interface TemplateRegistryOptions {
  cache?: boolean;
  extensions?: string[];
}

export interface LoadOptions {
  recursive?: boolean;
  pattern?: RegExp;
}

// ============================================================================
// Context & Data
// ============================================================================

export interface RenderContext {
  data: Record<string, any>;
  helpers: Record<string, HelperFunction>;
  scope: Record<string, any>[];
}

export interface VariableResolutionOptions {
  allowUndefined?: boolean;
  defaultValue?: any;
  strict?: boolean;
}

// Backward compatibility
export type TemplateData = Record<string, any>;
