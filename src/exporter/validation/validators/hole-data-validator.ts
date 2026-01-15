// ============= src/exporter/validation/validators/hole-data-validator.ts =============

import { DataValidator } from './data-validator';
import { ValidationResult, HoleData } from '../validation-engine';

export class HoleDataValidator extends DataValidator {
  
  validate(data: HoleData): ValidationResult<HoleData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证ID
    const idError = this.validateId(data.id, 'Hole ID');
    if (idError) errors.push(idError);
    
    // 验证类型
    const typeError = this.validateEnumField(data.type, 'Hole type', ['plated', 'non-plated']);
    if (typeError) errors.push(typeError);
    
    // 验证位置
    if (!data.position) {
      errors.push('孔位置是必需的但缺失。');
    } else {
      const positionError = this.validatePoint(data.position, 'Hole position');
      if (positionError) errors.push(positionError);
    }
    
    // 验证直径
    const diameterError = this.validateNumericField(data.diameter, 'Hole diameter', 0.1, 20);
    if (diameterError) errors.push(diameterError);
    
    // 验证镀层厚度（镀孔）
    if (data.type === 'plated') {
      if (data.platingThickness === undefined) {
        warnings.push('镀孔应指定镀层厚度。建议添加 platingThickness 属性。');
      } else {
        const platingError = this.validateNumericField(data.platingThickness, 'Plating thickness', 0.01, 0.1);
        if (platingError) errors.push(platingError);
      }
    }
    
    // 验证钻孔深度
    if (data.drillDepth !== undefined) {
      const depthError = this.validateNumericField(data.drillDepth, 'Drill depth', 0.1, 10);
      if (depthError) errors.push(depthError);
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
}