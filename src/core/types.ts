/**
 * APTL Core Type Definitions
 */

// ============================================================================
// Token Types
// ============================================================================

export enum TokenType {
  TEXT = 'TEXT',
  VARIABLE = 'VARIABLE',
  SECTION_START = 'SECTION_START',
  SECTION_END = 'SECTION_END',
  IF = 'IF',
  ELIF = 'ELIF',
  ELSE = 'ELSE',
  END = 'END',
  EACH = 'EACH',
  IN = 'IN',
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
  SECTION = 'SECTION',
  CONDITIONAL = 'CONDITIONAL',
  ITERATION = 'ITERATION',
  VARIABLE = 'VARIABLE',
  TEXT = 'TEXT',
  COMMENT = 'COMMENT',
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

export interface SectionNode extends ASTNode {
  type: NodeType.SECTION;
  name: string;
  attributes: Record<string, string>;
  children: ASTNode[];
}

export interface ConditionalNode extends ASTNode {
  type: NodeType.CONDITIONAL;
  condition: string;
  consequent: ASTNode[];
  alternate?: ConditionalNode | ASTNode[];
}

export interface IterationNode extends ASTNode {
  type: NodeType.ITERATION;
  itemName: string;
  arrayPath: string;
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
}

export interface TemplateRegistryOptions {
  watch?: boolean;
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
