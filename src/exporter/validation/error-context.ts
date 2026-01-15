// ============= src/exporter/validation/error-context.ts =============

// # 错误上下文管理
// DESIGN: 提供详细的错误定位和建议机制
// REF: Requirements 5.4
// BUSINESS: 帮助用户快速定位和解决数据问题

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 数据缺失错误
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  MISSING_BOARD_ID = 'MISSING_BOARD_ID',
  MISSING_BOARD_NAME = 'MISSING_BOARD_NAME',
  MISSING_PART_NUMBER = 'MISSING_PART_NUMBER',
  MISSING_COMPONENT_POSITION = 'MISSING_COMPONENT_POSITION',
  MISSING_HOLE_DIAMETER = 'MISSING_HOLE_DIAMETER',
  MISSING_LAYER_THICKNESS = 'MISSING_LAYER_THICKNESS',
  
  // 数据格式错误
  INVALID_DATA_TYPE = 'INVALID_DATA_TYPE',
  INVALID_COORDINATE = 'INVALID_COORDINATE',
  INVALID_DIMENSION = 'INVALID_DIMENSION',
  INVALID_LAYER_TYPE = 'INVALID_LAYER_TYPE',
  INVALID_HOLE_TYPE = 'INVALID_HOLE_TYPE',
  INVALID_GEOMETRY_TYPE = 'INVALID_GEOMETRY_TYPE',
  
  // 数据范围错误
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  NEGATIVE_DIMENSION = 'NEGATIVE_DIMENSION',
  ZERO_THICKNESS = 'ZERO_THICKNESS',
  INVALID_ROTATION = 'INVALID_ROTATION',
  
  // 交叉验证错误
  COMPONENT_OUT_OF_BOUNDS = 'COMPONENT_OUT_OF_BOUNDS',
  HOLE_OUT_OF_BOUNDS = 'HOLE_OUT_OF_BOUNDS',
  UNDEFINED_LAYER_REFERENCE = 'UNDEFINED_LAYER_REFERENCE',
  LAYER_STACKUP_MISMATCH = 'LAYER_STACKUP_MISMATCH',
  COMPONENT_OVERLAP = 'COMPONENT_OVERLAP',
  THICKNESS_INCONSISTENCY = 'THICKNESS_INCONSISTENCY',
  
  // 默认值应用
  DEFAULT_VALUE_APPLIED = 'DEFAULT_VALUE_APPLIED',
  DEFAULT_Z_POSITION = 'DEFAULT_Z_POSITION',
  DEFAULT_PLATING_THICKNESS = 'DEFAULT_PLATING_THICKNESS',
  
  // XML结构错误
  XML_STRUCTURE_ERROR = 'XML_STRUCTURE_ERROR',
  INVALID_ITEM_TYPE = 'INVALID_ITEM_TYPE',
  MISSING_XML_ATTRIBUTE = 'MISSING_XML_ATTRIBUTE'
}

/**
 * 错误上下文接口
 * 
 * @remarks
 * 提供详细的错误信息，包括位置、严重程度、错误代码、消息和修复建议
 */
export interface ErrorContext {
  /** 错误发生的位置（如字段路径） */
  location: string;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 错误代码 */
  code: ErrorCode;
  /** 错误消息 */
  message: string;
  /** 修复建议 */
  suggestion?: string;
  /** 相关数据 */
  data?: any;
  /** 错误发生时间 */
  timestamp?: Date;
  /** 错误来源（验证器名称） */
  source?: string;
}

/**
 * 错误上下文构建器
 * 
 * @remarks
 * 提供便捷的方法来创建标准化的错误上下文
 * 
 * @example
 * ```typescript
 * const error = ErrorContextBuilder
 *   .create()
 *   .location('board.id')
 *   .severity(ErrorSeverity.ERROR)
 *   .code(ErrorCode.MISSING_BOARD_ID)
 *   .message('板ID不能为空')
 *   .suggestion('请提供有效的板ID，例如: "PCB_001"')
 *   .build();
 * ```
 */
export class ErrorContextBuilder {
  private context: Partial<ErrorContext> = {};
  
  static create(): ErrorContextBuilder {
    return new ErrorContextBuilder();
  }
  
  location(location: string): ErrorContextBuilder {
    this.context.location = location;
    return this;
  }
  
  severity(severity: ErrorSeverity): ErrorContextBuilder {
    this.context.severity = severity;
    return this;
  }
  
  code(code: ErrorCode): ErrorContextBuilder {
    this.context.code = code;
    return this;
  }
  
  message(message: string): ErrorContextBuilder {
    this.context.message = message;
    return this;
  }
  
  suggestion(suggestion: string): ErrorContextBuilder {
    this.context.suggestion = suggestion;
    return this;
  }
  
  data(data: any): ErrorContextBuilder {
    this.context.data = data;
    return this;
  }
  
  source(source: string): ErrorContextBuilder {
    this.context.source = source;
    return this;
  }
  
  build(): ErrorContext {
    if (!this.context.location || !this.context.severity || !this.context.code || !this.context.message) {
      throw new Error('ErrorContext requires location, severity, code, and message');
    }
    
    return {
      ...this.context,
      timestamp: new Date()
    } as ErrorContext;
  }
}

/**
 * 错误上下文管理器
 * 
 * @remarks
 * 管理错误上下文的收集、分类和报告
 * BUSINESS: 提供统一的错误处理和报告机制
 */
export class ErrorContextManager {
  private errors: ErrorContext[] = [];
  
  /**
   * 添加错误上下文
   * 
   * @param context - 错误上下文
   */
  addError(context: ErrorContext): void {
    this.errors.push(context);
  }
  
  /**
   * 添加多个错误上下文
   * 
   * @param contexts - 错误上下文数组
   */
  addErrors(contexts: ErrorContext[]): void {
    this.errors.push(...contexts);
  }
  
  /**
   * 获取所有错误
   * 
   * @returns 错误上下文数组
   */
  getAllErrors(): ErrorContext[] {
    return [...this.errors];
  }
  
  /**
   * 按严重程度获取错误
   * 
   * @param severity - 错误严重程度
   * @returns 指定严重程度的错误数组
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorContext[] {
    return this.errors.filter(error => error.severity === severity);
  }
  
  /**
   * 按错误代码获取错误
   * 
   * @param code - 错误代码
   * @returns 指定错误代码的错误数组
   */
  getErrorsByCode(code: ErrorCode): ErrorContext[] {
    return this.errors.filter(error => error.code === code);
  }
  
  /**
   * 按位置获取错误
   * 
   * @param location - 错误位置
   * @returns 指定位置的错误数组
   */
  getErrorsByLocation(location: string): ErrorContext[] {
    return this.errors.filter(error => error.location.includes(location));
  }
  
  /**
   * 检查是否有错误
   * 
   * @returns 是否有错误
   */
  hasErrors(): boolean {
    return this.getErrorsBySeverity(ErrorSeverity.ERROR).length > 0;
  }
  
  /**
   * 检查是否有警告
   * 
   * @returns 是否有警告
   */
  hasWarnings(): boolean {
    return this.getErrorsBySeverity(ErrorSeverity.WARNING).length > 0;
  }
  
  /**
   * 获取错误统计
   * 
   * @returns 错误统计信息
   */
  getStatistics(): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  } {
    return {
      total: this.errors.length,
      errors: this.getErrorsBySeverity(ErrorSeverity.ERROR).length,
      warnings: this.getErrorsBySeverity(ErrorSeverity.WARNING).length,
      info: this.getErrorsBySeverity(ErrorSeverity.INFO).length
    };
  }
  
  /**
   * 清除所有错误
   */
  clear(): void {
    this.errors = [];
  }
  
  /**
   * 生成错误报告
   * 
   * @returns 格式化的错误报告
   */
  generateReport(): string {
    if (this.errors.length === 0) {
      return '没有发现错误或警告。';
    }
    
    const stats = this.getStatistics();
    const lines: string[] = [];
    
    lines.push('=== 验证报告 ===');
    lines.push(`总计: ${stats.total} 项问题`);
    lines.push(`错误: ${stats.errors} 项`);
    lines.push(`警告: ${stats.warnings} 项`);
    lines.push(`信息: ${stats.info} 项`);
    lines.push('');
    
    // 按严重程度分组显示
    const errorsBySeverity = {
      [ErrorSeverity.ERROR]: this.getErrorsBySeverity(ErrorSeverity.ERROR),
      [ErrorSeverity.WARNING]: this.getErrorsBySeverity(ErrorSeverity.WARNING),
      [ErrorSeverity.INFO]: this.getErrorsBySeverity(ErrorSeverity.INFO)
    };
    
    for (const [severity, errors] of Object.entries(errorsBySeverity)) {
      if (errors.length === 0) continue;
      
      lines.push(`=== ${severity.toUpperCase()} ===`);
      
      for (const error of errors) {
        lines.push(`位置: ${error.location}`);
        lines.push(`代码: ${error.code}`);
        lines.push(`消息: ${error.message}`);
        
        if (error.suggestion) {
          lines.push(`建议: ${error.suggestion}`);
        }
        
        if (error.source) {
          lines.push(`来源: ${error.source}`);
        }
        
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
}

/**
 * 预定义的错误上下文工厂
 * 
 * @remarks
 * 提供常用错误场景的快速创建方法
 */
export class ErrorContextFactory {
  /**
   * 创建缺失必需字段错误
   * 
   * @param location - 字段位置
   * @param fieldName - 字段名称
   * @param suggestion - 修复建议
   * @returns 错误上下文
   */
  static missingRequiredField(location: string, fieldName: string, suggestion?: string): ErrorContext {
    return ErrorContextBuilder
      .create()
      .location(location)
      .severity(ErrorSeverity.ERROR)
      .code(ErrorCode.MISSING_REQUIRED_FIELD)
      .message(`必需字段 "${fieldName}" 缺失`)
      .suggestion(suggestion || `请提供 "${fieldName}" 字段的值`)
      .build();
  }
  
  /**
   * 创建数据类型错误
   * 
   * @param location - 字段位置
   * @param expectedType - 期望类型
   * @param actualType - 实际类型
   * @returns 错误上下文
   */
  static invalidDataType(location: string, expectedType: string, actualType: string): ErrorContext {
    return ErrorContextBuilder
      .create()
      .location(location)
      .severity(ErrorSeverity.ERROR)
      .code(ErrorCode.INVALID_DATA_TYPE)
      .message(`数据类型错误: 期望 ${expectedType}，实际 ${actualType}`)
      .suggestion(`请将 "${location}" 的值转换为 ${expectedType} 类型`)
      .build();
  }
  
  /**
   * 创建数值范围错误
   * 
   * @param location - 字段位置
   * @param value - 实际值
   * @param min - 最小值
   * @param max - 最大值
   * @returns 错误上下文
   */
  static valueOutOfRange(location: string, value: number, min?: number, max?: number): ErrorContext {
    let message = `值 ${value} 超出有效范围`;
    let suggestion = `请提供有效范围内的值`;
    
    if (min !== undefined && max !== undefined) {
      message += ` [${min}, ${max}]`;
      suggestion = `请提供 ${min} 到 ${max} 之间的值`;
    } else if (min !== undefined) {
      message += ` (>= ${min})`;
      suggestion = `请提供大于等于 ${min} 的值`;
    } else if (max !== undefined) {
      message += ` (<= ${max})`;
      suggestion = `请提供小于等于 ${max} 的值`;
    }
    
    return ErrorContextBuilder
      .create()
      .location(location)
      .severity(ErrorSeverity.ERROR)
      .code(ErrorCode.VALUE_OUT_OF_RANGE)
      .message(message)
      .suggestion(suggestion)
      .data({ value, min, max })
      .build();
  }
  
  /**
   * 创建组件超出边界警告
   * 
   * @param componentId - 组件ID
   * @param position - 组件位置
   * @returns 错误上下文
   */
  static componentOutOfBounds(componentId: string, position: { x: number; y: number }): ErrorContext {
    return ErrorContextBuilder
      .create()
      .location(`components[${componentId}].position`)
      .severity(ErrorSeverity.WARNING)
      .code(ErrorCode.COMPONENT_OUT_OF_BOUNDS)
      .message(`组件 ${componentId} 位于板轮廓外`)
      .suggestion(`请将组件移动到板边界内，当前位置: (${position.x}, ${position.y})`)
      .data({ componentId, position })
      .build();
  }
  
  /**
   * 创建默认值应用信息
   * 
   * @param location - 字段位置
   * @param defaultValue - 默认值
   * @param reason - 应用原因
   * @returns 错误上下文
   */
  static defaultValueApplied(location: string, defaultValue: any, reason: string): ErrorContext {
    return ErrorContextBuilder
      .create()
      .location(location)
      .severity(ErrorSeverity.INFO)
      .code(ErrorCode.DEFAULT_VALUE_APPLIED)
      .message(`已应用默认值: ${defaultValue}`)
      .suggestion(`原因: ${reason}。如需自定义值，请明确指定`)
      .data({ defaultValue, reason })
      .build();
  }
  
  /**
   * 创建层引用错误
   * 
   * @param location - 引用位置
   * @param layerId - 层ID
   * @param availableLayers - 可用层列表
   * @returns 错误上下文
   */
  static undefinedLayerReference(location: string, layerId: string, availableLayers: string[]): ErrorContext {
    return ErrorContextBuilder
      .create()
      .location(location)
      .severity(ErrorSeverity.ERROR)
      .code(ErrorCode.UNDEFINED_LAYER_REFERENCE)
      .message(`引用了未定义的层: ${layerId}`)
      .suggestion(`请使用以下可用层之一: ${availableLayers.join(', ')}，或定义新层`)
      .data({ layerId, availableLayers })
      .build();
  }
}