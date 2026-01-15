// ============= src/exporter/validation/validators/layer-data-validator.ts =============

import { DataValidator } from './data-validator';
import { ValidationResult, LayerData } from '../validation-engine';

export class LayerDataValidator extends DataValidator {
  
  validate(data: LayerData): ValidationResult<LayerData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证ID
    const idError = this.validateId(data.id, 'Layer ID');
    if (idError) errors.push(idError);
    
    // 验证名称
    const nameError = this.validateRequiredField(data, 'name', 'Layer name');
    if (nameError) {
      errors.push(nameError);
    } else {
      const nameFormatError = this.validateStringField(data.name, 'Layer name', 1, 50);
      if (nameFormatError) errors.push(nameFormatError);
    }
    
    // 验证类型
    const typeError = this.validateEnumField(
      data.type, 
      'Layer type', 
      ['SIGNAL', 'PLANE', 'SOLDERMASK', 'SILKSCREEN', 'DIELECTRIC', 'OTHERSIGNAL']
    );
    if (typeError) errors.push(typeError);
    
    // 验证厚度
    const thicknessError = this.validateNumericField(data.thickness, 'Layer thickness', 0.001, 5);
    if (thicknessError) errors.push(thicknessError);
    
    // 验证可选字段
    if (data.material !== undefined) {
      const materialError = this.validateStringField(data.material, 'Layer material', 1, 100);
      if (materialError) errors.push(materialError);
    }
    
    if (data.copperWeight !== undefined) {
      const copperWeightError = this.validateNumericField(data.copperWeight, 'Copper weight', 0.5, 4);
      if (copperWeightError) errors.push(copperWeightError);
      
      // 检查常见铜重
      const commonWeights = [0.5, 1, 2, 3, 4];
      if (!commonWeights.includes(data.copperWeight)) {
        warnings.push(`铜重 ${data.copperWeight}oz 不是标准值。常见重量有: ${commonWeights.join(', ')}oz。`);
      }
    }
    
    if (data.dielectricConstant !== undefined) {
      const dielectricError = this.validateNumericField(data.dielectricConstant, 'Dielectric constant', 1, 20);
      if (dielectricError) errors.push(dielectricError);
    }
    
    // 类型特定验证
    if (data.type === 'SIGNAL' || data.type === 'PLANE' || data.type === 'OTHERSIGNAL') {
      if (data.copperWeight === undefined) {
        warnings.push('信号/平面层应指定铜重。建议添加 copperWeight 属性。');
      }
    }
    
    if (data.type === 'DIELECTRIC') {
      if (data.dielectricConstant === undefined) {
        warnings.push('介电层应指定介电常数。建议添加 dielectricConstant 属性。');
      }
      if (data.material === undefined) {
        warnings.push('介电层应指定材料。建议添加 material 属性。');
      }
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
}