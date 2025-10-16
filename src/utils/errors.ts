/**
 * APTL Custom Error Classes
 */

export class APTLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APTLError';
    Object.setPrototypeOf(this, APTLError.prototype);
  }
}

export class APTLSyntaxError extends APTLError {
  line?: number;
  column?: number;

  constructor(message: string, line?: number, column?: number) {
    super(message);
    this.name = 'APTLSyntaxError';
    this.line = line;
    this.column = column;
    Object.setPrototypeOf(this, APTLSyntaxError.prototype);
  }

  toString(): string {
    const location =
      this.line !== undefined && this.column !== undefined
        ? ` at line ${this.line}, column ${this.column}`
        : '';
    return `${this.name}: ${this.message}${location}`;
  }
}

export class APTLRuntimeError extends APTLError {
  context?: Record<string, any>;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'APTLRuntimeError';
    this.context = context;
    Object.setPrototypeOf(this, APTLRuntimeError.prototype);
  }
}

export class APTLValidationError extends APTLError {
  errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'APTLValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, APTLValidationError.prototype);
  }

  toString(): string {
    if (this.errors.length === 0) {
      return `${this.name}: ${this.message}`;
    }
    return `${this.name}: ${this.message}\n  - ${this.errors.join('\n  - ')}`;
  }
}

export class APTLVariableError extends APTLError {
  path?: string;

  constructor(message: string, path?: string) {
    super(message);
    this.name = 'APTLVariableError';
    this.path = path;
    Object.setPrototypeOf(this, APTLVariableError.prototype);
  }
}
