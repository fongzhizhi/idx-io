// ============= src/exporter/validation/validators/component-data-validator.ts =============

// # 组件数据验证器
// DESIGN: 验证PCB组件的完整性和正确性
// REF: Requirements 5.1, 5.2
// BUSINESS: 确保组件数据包含必需信息，位置和尺寸合理

import { DataValidator } from './data-validator';
import { ValidationResult, ComponentData } from '../validation-engine';

/**
 * 组件数据验证器
 * 
 * @remarks
 * 验证PCB组件的基本信息，包括位号、封装、位置、尺寸等
 * BUSINESS: 组件是PCB的核心元素，必须确保数据完整性和合理性
 * 
 * @example
 * ```typescript
 * const validator = new ComponentDataValidator();
 * const result = validator.validate(componentData);
 * if (!result.valid) {
 *   console.log('Component validation errors:', result.errors);
 * }
 * ```
 */
export class ComponentDataValidator extends DataValidator {
  
  /**
   * 验证组件数据
   * 
   * @param data - 组件数据
   * @returns 验证结果
   */
  validate(data: ComponentData): ValidationResult<ComponentData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // # 验证基本字段
    this.validateBasicFields(data, errors, warnings);
    
    // # 验证位置信息
    this.validatePosition(data, errors, warnings);
    
    // # 验证尺寸信息
    this.validateComponentDimensions(data, errors, warnings);
    
    // # 验证可选字段
    this.validateOptionalFields(data, errors, warnings);
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
  
  /**
   * 验证基本字段
   * 
   * @param data - 组件数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateBasicFields(data: ComponentData, errors: string[], warnings: string[]): void {
    // 验证位号
    const refDesError = this.validateRequiredField(data, 'refDes', 'Component reference designator');
    if (refDesError) {
      errors.push(refDesError);
    } else {
      // 验证位号格式
      const refDesFormatError = this.validateStringField(data.refDes, 'Reference designator', 1, 50);
      if (refDesFormatError) {
        errors.push(refDesFormatError);
      } else {
        // 检查位号格式是否符合标准（字母开头，后跟数字）
        const refDesPattern = /^[A-Z]+\d+$/i;
        if (!refDesPattern.test(data.refDes)) {
          warnings.push(`位号 "${data.refDes}" 不符合标准格式（字母后跟数字，如 R1、C10、U5）。建议使用标准命名约定。`);
        }
      }
    }
    
    // 验证料号
    const partNumberError = this.validateRequiredField(data, 'partNumber', 'Part number');
    if (partNumberError) {
      errors.push(partNumberError);
    } else {
      const partNumberFormatError = this.validateStringField(data.partNumber, 'Part number', 1, 100);
      if (partNumberFormatError) {
        errors.push(partNumberFormatError);
      }
    }
    
    // 验证封装名称
    const packageNameError = this.validateRequiredField(data, 'packageName', 'Package name');
    if (packageNameError) {
      errors.push(packageNameError);
    } else {
      const packageNameFormatError = this.validateStringField(data.packageName, 'Package name', 1, 50);
      if (packageNameFormatError) {
        errors.push(packageNameFormatError);
      } else {
        // 检查是否是常见封装
        this.validateCommonPackage(data.packageName, warnings);
      }
    }
  }
  
  /**
   * 验证位置信息
   * 
   * @param data - 组件数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validatePosition(data: ComponentData, errors: string[], warnings: string[]): void {
    if (!data.position) {
      errors.push('组件位置是必需的但缺失。请提供x、y坐标和旋转角度。');
      return;
    }
    
    // 验证位置对象结构
    const positionError = this.validateObjectField(data.position, 'Component position', ['x', 'y', 'rotation']);
    if (positionError) {
      errors.push(positionError);
      return;
    }
    
    // 验证X坐标
    const xError = this.validateNumericField(data.position.x, 'Position X coordinate');
    if (xError) {
      errors.push(xError);
    }
    
    // 验证Y坐标
    const yError = this.validateNumericField(data.position.y, 'Position Y coordinate');
    if (yError) {
      errors.push(yError);
    }
    
    // 验证旋转角度
    const rotationError = this.validateNumericField(data.position.rotation, 'Rotation angle', -360, 360);
    if (rotationError) {
      errors.push(rotationError);
    } else {
      // 检查旋转角度是否是常见值
      const commonRotations = [0, 45, 90, 135, 180, 225, 270, 315];
      if (!commonRotations.includes(data.position.rotation % 360)) {
        warnings.push(`组件旋转角度 ${data.position.rotation}° 不是常见值。标准旋转角度是45°的倍数。`);
      }
    }
    
    // 验证Z坐标（可选）
    if (data.position.z !== undefined) {
      const zError = this.validateNumericField(data.position.z, 'Position Z coordinate', 0);
      if (zError) {
        errors.push(zError);
      }
    }
    
    // 检查位置是否合理
    if (Math.abs(data.position.x) > 1000 || Math.abs(data.position.y) > 1000) {
      warnings.push(`组件位置 (${data.position.x}, ${data.position.y}) 距离原点很远。请验证坐标单位是否为毫米。`);
    }
  }
  
  /**
   * 验证尺寸信息
   * 
   * @param data - 组件数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateComponentDimensions(data: ComponentData, errors: string[], warnings: string[]): void {
    if (!data.dimensions) {
      errors.push('组件尺寸是必需的但缺失。请提供宽度、高度和厚度。');
      return;
    }
    
    // 验证尺寸对象结构
    const dimensionsError = this.validateObjectField(data.dimensions, 'Component dimensions', ['width', 'height', 'thickness']);
    if (dimensionsError) {
      errors.push(dimensionsError);
      return;
    }
    
    // 验证宽度
    const widthError = this.validateNumericField(data.dimensions.width, 'Component width', 0.1, 100);
    if (widthError) {
      errors.push(widthError);
    }
    
    // 验证高度
    const heightError = this.validateNumericField(data.dimensions.height, 'Component height', 0.1, 100);
    if (heightError) {
      errors.push(heightError);
    }
    
    // 验证厚度
    const thicknessError = this.validateNumericField(data.dimensions.thickness, 'Component thickness', 0.1, 20);
    if (thicknessError) {
      errors.push(thicknessError);
    }
    
    // 检查尺寸是否与封装匹配
    if (data.packageName && data.dimensions.width && data.dimensions.height) {
      this.validatePackageDimensions(data.packageName, data.dimensions, warnings);
    }
    
    // 检查长宽比是否合理
    if (data.dimensions.width && data.dimensions.height) {
      const aspectRatio = Math.max(data.dimensions.width, data.dimensions.height) / 
                         Math.min(data.dimensions.width, data.dimensions.height);
      if (aspectRatio > 10) {
        warnings.push(`组件长宽比很高 (${aspectRatio.toFixed(1)}:1)。请验证尺寸是否正确。`);
      }
    }
  }
  
  /**
   * 验证可选字段
   * 
   * @param data - 组件数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateOptionalFields(data: ComponentData, errors: string[], warnings: string[]): void {
    // 验证属性对象
    if (data.properties && typeof data.properties !== 'object') {
      errors.push('组件属性必须是对象（如果提供）。');
    }
    
    // 如果没有提供Z位置，给出建议
    if (data.position && data.position.z === undefined) {
      warnings.push('未指定组件Z位置。将根据层计算。建议提供明确的Z坐标以获得更好的精度。');
    }
  }
  
  /**
   * 验证常见封装
   * 
   * @param packageName - 封装名称
   * @param warnings - 警告列表
   */
  private validateCommonPackage(packageName: string, warnings: string[]): void {
    const commonPackages = [
      // SMD封装
      '0201', '0402', '0603', '0805', '1206', '1210', '1812', '2010', '2512',
      // BGA封装
      'BGA', 'FBGA', 'PBGA', 'CBGA',
      // QFP封装
      'QFP', 'LQFP', 'TQFP', 'PQFP',
      // QFN封装
      'QFN', 'DFN', 'MLF',
      // SOIC封装
      'SOIC', 'SOP', 'SSOP', 'TSSOP', 'MSOP',
      // 通孔封装
      'DIP', 'PDIP', 'CDIP', 'SIP',
      // 其他常见封装
      'SOT', 'SOD', 'TO', 'DO'
    ];
    
    const isCommonPackage = commonPackages.some(common => 
      packageName.toUpperCase().includes(common)
    );
    
    if (!isCommonPackage) {
      warnings.push(`封装 "${packageName}" 不是已识别的标准封装类型。请验证封装名称是否正确。`);
    }
  }
  
  /**
   * 验证封装尺寸匹配
   * 
   * @param packageName - 封装名称
   * @param dimensions - 组件尺寸
   * @param warnings - 警告列表
   */
  private validatePackageDimensions(
    packageName: string, 
    dimensions: { width: number; height: number; thickness: number }, 
    warnings: string[]
  ): void {
    // 检查常见SMD封装尺寸
    const smdPackages: Record<string, { width: number; height: number }> = {
      '0201': { width: 0.6, height: 0.3 },
      '0402': { width: 1.0, height: 0.5 },
      '0603': { width: 1.6, height: 0.8 },
      '0805': { width: 2.0, height: 1.25 },
      '1206': { width: 3.2, height: 1.6 },
      '1210': { width: 3.2, height: 2.5 },
      '1812': { width: 4.5, height: 3.2 },
      '2010': { width: 5.0, height: 2.5 },
      '2512': { width: 6.4, height: 3.2 }
    };
    
    const packageKey = packageName.toUpperCase();
    if (smdPackages[packageKey]) {
      const expected = smdPackages[packageKey];
      const tolerance = 0.2; // 20%容差
      
      const widthDiff = Math.abs(dimensions.width - expected.width) / expected.width;
      const heightDiff = Math.abs(dimensions.height - expected.height) / expected.height;
      
      if (widthDiff > tolerance || heightDiff > tolerance) {
        warnings.push(`组件尺寸 (${dimensions.width}×${dimensions.height}mm) 与期望的 ${packageKey} 封装尺寸 (${expected.width}×${expected.height}mm) 不匹配。请验证尺寸。`);
      }
    }
  }
}