// ============= src/exporter/validation/validators/keepout-data-validator.ts =============

import { DataValidator } from './data-validator';
import { ValidationResult, KeepoutData } from '../validation-engine';

export class KeepoutDataValidator extends DataValidator {
  
  validate(data: KeepoutData): ValidationResult<KeepoutData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证ID
    const idError = this.validateId(data.id, 'Keepout ID');
    if (idError) errors.push(idError);
    
    // 验证类型
    const typeError = this.validateEnumField(data.type, 'Keepout type', ['component', 'via', 'trace']);
    if (typeError) errors.push(typeError);
    
    // 验证几何形状
    if (!data.geometry) {
      errors.push('禁止区几何形状是必需的但缺失。');
    } else {
      this.validateGeometry(data.geometry, errors, warnings);
    }
    
    // 验证层列表
    const layersError = this.validateArrayField(data.layers, 'Keepout layers', 1);
    if (layersError) {
      errors.push(layersError);
    } else {
      for (const layer of data.layers) {
        const layerError = this.validateStringField(layer, 'Layer name', 1, 50);
        if (layerError) errors.push(`Layer in keepout: ${layerError}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
  
  private validateGeometry(geometry: any, errors: string[], warnings: string[]): void {
    const typeError = this.validateEnumField(geometry.type, 'Geometry type', ['rectangle', 'circle', 'polygon']);
    if (typeError) {
      errors.push(typeError);
      return;
    }
    
    switch (geometry.type) {
      case 'rectangle':
        if (!geometry.center) errors.push('Rectangle geometry requires center point.');
        else {
          const centerError = this.validatePoint(geometry.center, 'Rectangle center');
          if (centerError) errors.push(centerError);
        }
        
        const widthError = this.validateNumericField(geometry.width, 'Rectangle width', 0.1);
        if (widthError) errors.push(widthError);
        
        const heightError = this.validateNumericField(geometry.height, 'Rectangle height', 0.1);
        if (heightError) errors.push(heightError);
        break;
        
      case 'circle':
        if (!geometry.center) errors.push('Circle geometry requires center point.');
        else {
          const centerError = this.validatePoint(geometry.center, 'Circle center');
          if (centerError) errors.push(centerError);
        }
        
        const radiusError = this.validateNumericField(geometry.radius, 'Circle radius', 0.1);
        if (radiusError) errors.push(radiusError);
        break;
        
      case 'polygon':
        const pointsError = this.validateArrayField(geometry.points, 'Polygon points', 3);
        if (pointsError) {
          errors.push(pointsError);
        } else {
          for (let i = 0; i < geometry.points.length; i++) {
            const pointError = this.validatePoint(geometry.points[i], `Polygon point[${i}]`);
            if (pointError) errors.push(pointError);
          }
        }
        break;
    }
  }
}