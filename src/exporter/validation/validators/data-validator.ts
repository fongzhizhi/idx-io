// ============= src/exporter/validation/validators/data-validator.ts =============

// # 数据验证器基类
// DESIGN: 提供验证器的基础接口和通用功能
// REF: Requirements 5.1, 5.2
// BUSINESS: 确保所有验证器遵循统一的接口和错误处理模式

import { ValidationResult } from '../validation-engine';

/**
 * 数据验证器抽象基类
 * 
 * @remarks
 * 定义所有数据验证器的通用接口和行为
 * DESIGN: 使用模板方法模式，子类实现具体验证逻辑
 * BUSINESS: 提供一致的验证体验和错误报告格式
 * 
 * @example
 * ```typescript
 * class MyValidator extends DataValidator {
 *   validate(data: MyData): ValidationResult<MyData> {
 *     const errors: string[] = [];
 *     const warnings: string[] = [];
 *     
 *     // 验证逻辑
 *     if (!data.requiredField) {
 *       errors.push('Required field is missing');
 *     }
 *     
 *     return {
 *       valid: errors.length === 0,
 *       data: errors.length === 0 ? data : undefined,
 *       errors,
 *       warnings
 *     };
 *   }
 * }
 * ```
 */
export abstract class DataValidator {
  /**
   * 验证数据
   * 
   * @param data - 要验证的数据
   * @returns 验证结果
   */
  abstract validate(data: any): ValidationResult<any>;
  
  /**
   * 验证必需字段
   * 
   * @param data - 数据对象
   * @param field - 字段名
   * @param fieldDisplayName - 字段显示名称
   * @returns 错误信息（如果有）
   */
  protected validateRequiredField(data: any, field: string, fieldDisplayName: string): string | null {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      return `${fieldDisplayName} 是必需的但缺失或为空。请提供有效的 ${fieldDisplayName.toLowerCase()}。`;
    }
    return null;
  }
  
  /**
   * 验证数值字段
   * 
   * @param value - 数值
   * @param fieldName - 字段名称
   * @param min - 最小值（可选）
   * @param max - 最大值（可选）
   * @returns 错误信息（如果有）
   */
  protected validateNumericField(
    value: any, 
    fieldName: string, 
    min?: number, 
    max?: number
  ): string | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} 必须是有效数字。当前值: ${value}`;
    }
    
    if (min !== undefined && value < min) {
      return `${fieldName} 必须至少为 ${min}。当前值: ${value}`;
    }
    
    if (max !== undefined && value > max) {
      return `${fieldName} 必须至多为 ${max}。当前值: ${value}`;
    }
    
    return null;
  }
  
  /**
   * 验证字符串字段
   * 
   * @param value - 字符串值
   * @param fieldName - 字段名称
   * @param minLength - 最小长度（可选）
   * @param maxLength - 最大长度（可选）
   * @param pattern - 正则表达式模式（可选）
   * @returns 错误信息（如果有）
   */
  protected validateStringField(
    value: any,
    fieldName: string,
    minLength?: number,
    maxLength?: number,
    pattern?: RegExp
  ): string | null {
    if (typeof value !== 'string') {
      return `${fieldName} 必须是字符串。当前类型: ${typeof value}`;
    }
    
    if (minLength !== undefined && value.length < minLength) {
      return `${fieldName} 必须至少 ${minLength} 个字符长。当前长度: ${value.length}`;
    }
    
    if (maxLength !== undefined && value.length > maxLength) {
      return `${fieldName} 必须至多 ${maxLength} 个字符长。当前长度: ${value.length}`;
    }
    
    if (pattern && !pattern.test(value)) {
      return `${fieldName} 格式无效。期望模式: ${pattern.source}`;
    }
    
    return null;
  }
  
  /**
   * 验证数组字段
   * 
   * @param value - 数组值
   * @param fieldName - 字段名称
   * @param minLength - 最小长度（可选）
   * @param maxLength - 最大长度（可选）
   * @returns 错误信息（如果有）
   */
  protected validateArrayField(
    value: any,
    fieldName: string,
    minLength?: number,
    maxLength?: number
  ): string | null {
    if (!Array.isArray(value)) {
      return `${fieldName} 必须是数组。当前类型: ${typeof value}`;
    }
    
    if (minLength !== undefined && value.length < minLength) {
      return `${fieldName} 必须至少包含 ${minLength} 个项目。当前数量: ${value.length}`;
    }
    
    if (maxLength !== undefined && value.length > maxLength) {
      return `${fieldName} 必须至多包含 ${maxLength} 个项目。当前数量: ${value.length}`;
    }
    
    return null;
  }
  
  /**
   * 验证枚举值
   * 
   * @param value - 值
   * @param fieldName - 字段名称
   * @param allowedValues - 允许的值列表
   * @returns 错误信息（如果有）
   */
  protected validateEnumField(
    value: any,
    fieldName: string,
    allowedValues: any[]
  ): string | null {
    if (!allowedValues.includes(value)) {
      return `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}。当前值: ${value}`;
    }
    return null;
  }
  
  /**
   * 验证对象字段
   * 
   * @param value - 对象值
   * @param fieldName - 字段名称
   * @param requiredProperties - 必需属性列表（可选）
   * @returns 错误信息（如果有）
   */
  protected validateObjectField(
    value: any,
    fieldName: string,
    requiredProperties?: string[]
  ): string | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${fieldName} 必须是有效对象。当前类型: ${typeof value}`;
    }
    
    if (requiredProperties) {
      for (const prop of requiredProperties) {
        if (!(prop in value)) {
          return `${fieldName}.${prop} 是必需的但缺失。请在 ${fieldName} 中提供 ${prop}。`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 创建建议信息
   * 
   * @param issue - 问题描述
   * @param suggestion - 建议解决方案
   * @returns 格式化的建议信息
   */
  protected createSuggestion(issue: string, suggestion: string): string {
    return `${issue} Suggestion: ${suggestion}`;
  }
  
  /**
   * 验证ID格式
   * 
   * @param id - ID值
   * @param fieldName - 字段名称
   * @returns 错误信息（如果有）
   */
  protected validateId(id: any, fieldName: string): string | null {
    const error = this.validateStringField(id, fieldName, 1, 100);
    if (error) return error;
    
    // ID应该只包含字母、数字、下划线和连字符
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    if (!idPattern.test(id)) {
      return `${fieldName} 应该只包含字母、数字、下划线和连字符。当前值: ${id}`;
    }
    
    return null;
  }
  
  /**
   * 验证坐标点
   * 
   * @param point - 坐标点
   * @param fieldName - 字段名称
   * @returns 错误信息（如果有）
   */
  protected validatePoint(point: any, fieldName: string): string | null {
    const objectError = this.validateObjectField(point, fieldName, ['x', 'y']);
    if (objectError) return objectError;
    
    const xError = this.validateNumericField(point.x, `${fieldName}.x`);
    if (xError) return xError;
    
    const yError = this.validateNumericField(point.y, `${fieldName}.y`);
    if (yError) return yError;
    
    return null;
  }
  
  /**
   * 验证尺寸对象
   * 
   * @param dimensions - 尺寸对象
   * @param fieldName - 字段名称
   * @returns 错误信息（如果有）
   */
  protected validateDimensions(dimensions: any, fieldName: string): string | null {
    const objectError = this.validateObjectField(dimensions, fieldName, ['width', 'height']);
    if (objectError) return objectError;
    
    const widthError = this.validateNumericField(dimensions.width, `${fieldName}.width`, 0.001);
    if (widthError) return widthError;
    
    const heightError = this.validateNumericField(dimensions.height, `${fieldName}.height`, 0.001);
    if (heightError) return heightError;
    
    if (dimensions.thickness !== undefined) {
      const thicknessError = this.validateNumericField(dimensions.thickness, `${fieldName}.thickness`, 0.001);
      if (thicknessError) return thicknessError;
    }
    
    return null;
  }
}