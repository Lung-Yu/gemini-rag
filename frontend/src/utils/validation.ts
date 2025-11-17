// Validation Utilities for Forms and Data

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Email format is invalid');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Required field validation
 */
export function validateRequired(value: any, fieldName: string = 'Field'): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || 
      (typeof value === 'string' && value.trim().length === 0)) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * String length validation
 */
export function validateLength(
  value: string, 
  min: number = 0, 
  max: number = Infinity, 
  fieldName: string = 'Field'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!value) {
    errors.push(`${fieldName} is required`);
  } else {
    const length = value.trim().length;
    
    if (length < min) {
      errors.push(`${fieldName} must be at least ${min} characters`);
    }
    
    if (length > max) {
      errors.push(`${fieldName} must not exceed ${max} characters`);
    }
    
    // Warnings for recommended lengths
    if (length > 0 && length < min * 0.8) {
      warnings.push(`${fieldName} might be too short for best results`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * File validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFile(
  file: File, 
  options: FileValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = ['.txt', '.pdf', '.doc', '.docx']
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${(maxSize / (1024 * 1024)).toFixed(1)}MB limit`);
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type '${file.type}' is not supported`);
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not supported`);
    }
  }
  
  // Warnings
  if (file.size > maxSize * 0.8) {
    warnings.push('File is quite large and may take longer to process');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Multiple files validation
 */
export function validateFiles(
  files: File[], 
  options: FileValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!files || files.length === 0) {
    errors.push('No files selected');
    return { isValid: false, errors };
  }
  
  // Validate each file
  files.forEach((file, index) => {
    const result = validateFile(file, options);
    
    if (!result.isValid) {
      errors.push(`File ${index + 1} (${file.name}): ${result.errors.join(', ')}`);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      warnings.push(`File ${index + 1} (${file.name}): ${result.warnings.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * URL validation
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  
  if (!url || url.trim().length === 0) {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('URL format is invalid');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * JSON validation
 */
export function validateJson(jsonString: string): ValidationResult {
  const errors: string[] = [];
  
  if (!jsonString || jsonString.trim().length === 0) {
    errors.push('JSON content is required');
  } else {
    try {
      JSON.parse(jsonString);
    } catch (error) {
      errors.push('Invalid JSON format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * System prompt validation
 */
export function validateSystemPrompt(prompt: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required check
  const requiredResult = validateRequired(prompt, 'System prompt');
  if (!requiredResult.isValid) {
    return requiredResult;
  }
  
  // Length check (reasonable limits for system prompts)
  const lengthResult = validateLength(prompt, 10, 2000, 'System prompt');
  errors.push(...lengthResult.errors);
  warnings.push(...(lengthResult.warnings || []));
  
  // Check for {query} placeholder
  if (!prompt.includes('{query}')) {
    warnings.push('System prompt should include {query} placeholder for best results');
  }
  
  // Check for common issues
  if (prompt.includes('{{') || prompt.includes('}}')) {
    warnings.push('Double braces detected - make sure placeholders are correct');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Search query validation
 */
export function validateSearchQuery(query: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required check
  const requiredResult = validateRequired(query, 'Search query');
  if (!requiredResult.isValid) {
    return requiredResult;
  }
  
  // Length check
  const lengthResult = validateLength(query, 1, 500, 'Search query');
  errors.push(...lengthResult.errors);
  
  // Warnings for very short queries
  if (query.trim().length < 3) {
    warnings.push('Very short queries may not return good results');
  }
  
  // Check for special characters that might cause issues
  const specialChars = /[<>\"'&]/g;
  if (specialChars.test(query)) {
    warnings.push('Special characters detected - results may be affected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Pagination parameters validation
 */
export function validatePagination(page: number, pageSize: number): ValidationResult {
  const errors: string[] = [];
  
  if (!Number.isInteger(page) || page < 1) {
    errors.push('Page number must be a positive integer');
  }
  
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    errors.push('Page size must be between 1 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Model selection validation
 */
export function validateModelId(modelId: string, availableModels: string[] = []): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required check
  const requiredResult = validateRequired(modelId, 'Model ID');
  if (!requiredResult.isValid) {
    return requiredResult;
  }
  
  // Check if model is in available list (if provided)
  if (availableModels.length > 0 && !availableModels.includes(modelId)) {
    errors.push('Selected model is not available');
  }
  
  // Warning for deprecated models (example patterns)
  if (modelId.includes('deprecated') || modelId.includes('old')) {
    warnings.push('This model may be deprecated');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Batch validation utility
 */
export function validateBatch(validations: (() => ValidationResult)[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  for (const validate of validations) {
    const result = validate();
    allErrors.push(...result.errors);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
}

/**
 * Sanitize string for safe display
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Debounced validation (for real-time validation)
 */
export function createDebouncedValidator<T extends any[]>(
  validator: (...args: T) => ValidationResult,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: T): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        resolve(validator(...args));
      }, delay);
    });
  };
}