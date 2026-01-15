// ============= src/exporter/validation/validation-engine.ts =============

// # 验证引擎
// DESIGN: 提供全面的数据验证和交叉验证逻辑
// REF: Requirements 3.2, 5.1, 5.2, 5.4
// BUSINESS: 确保导出数据符合IDX规范，提供具体错误信息和修复建议

import { DataValidator } from './validators/data-validator';
import { BoardDataValidator } from './validators/board-data-validator';
import { ComponentDataValidator } from './validators/component-data-validator';
import { HoleDataValidator } from './validators/hole-data-validator';
import { KeepoutDataValidator } from './validators/keepout-data-validator';
import { LayerDataValidator } from './validators/layer-data-validator';

// # 验证结果接口
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

// # 错误上下文接口
export interface ErrorContext {
  location: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
  data?: any;
}

// # 验证配置接口
export interface ValidationConfig {
  strictMode: boolean;
  enableCrossValidation: boolean;
  customRules?: ValidationRule[];
}

// # 验证规则接口
export interface ValidationRule {
  name: string;
  validate: (data: any) => ValidationResult<any>;
}

// # 导出源数据接口（从设计文档）
export interface ExportSourceData {
  board: BoardData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
}

// # 板数据接口
export interface BoardData {
  id: string;
  name: string;
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
  };
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  properties?: Record<string, any>;
}

// # 组件数据接口
export interface ComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: {
    x: number;
    y: number;
    z?: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  layer?: string;
  properties?: Record<string, any>;
}

// # 孔数据接口
export interface HoleData {
  id: string;
  type: 'plated' | 'non-plated';
  position: { x: number; y: number };
  diameter: number;
  platingThickness?: number;
  drillDepth?: number;
  properties?: Record<string, any>;
}

// # 禁止区数据接口
export interface KeepoutData {
  id: string;
  type: 'component' | 'via' | 'trace';
  geometry: {
    type: 'rectangle' | 'circle' | 'polygon';
    points?: Array<{ x: number; y: number }>;
    center?: { x: number; y: number };
    width?: number;
    height?: number;
    radius?: number;
  };
  layers: string[];
  properties?: Record<string, any>;
}

// # 层数据接口
export interface LayerData {
  id: string;
  name: string;
  type: 'SIGNAL' | 'PLANE' | 'SOLDERMASK' | 'SILKSCREEN' | 'DIELECTRIC' | 'OTHERSIGNAL';
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
}

// # 层叠结构数据接口
export interface LayerStackupData {
  id: string;
  name: string;
  layers: Array<{
    layerId: string;
    position: number;
    thickness: number;
  }>;
}

/**
 * 验证引擎类
 * 
 * @remarks
 * 提供全面的数据验证和交叉验证逻辑，支持具体错误信息和修复建议
 * DESIGN: 使用验证器模式，支持可扩展的验证规则
 * BUSINESS: 确保100%验证通过率，提供清晰的错误恢复指导
 * 
 * @example
 * ```typescript
 * const engine = new ValidationEngine({
 *   strictMode: true,
 *   enableCrossValidation: true
 * });
 * 
 * const result = engine.validateExportData(exportData);
 * if (!result.valid) {
 *   console.log('Validation errors:', result.errors);
 *   console.log('Suggestions:', result.warnings);
 * }
 * ```
 */
export class ValidationEngine {
  private validators: Map<string, DataValidator> = new Map();
  
  constructor(private config: ValidationConfig) {
    this.initializeValidators();
  }
  
  /**
   * 初始化验证器
   * 
   * @remarks
   * 注册所有数据类型的验证器
   */
  private initializeValidators(): void {
    this.validators.set('board', new BoardDataValidator());
    this.validators.set('component', new ComponentDataValidator());
    this.validators.set('hole', new HoleDataValidator());
    this.validators.set('keepout', new KeepoutDataValidator());
    this.validators.set('layer', new LayerDataValidator());
  }
  
  /**
   * 验证导出数据
   * 
   * @remarks
   * 执行全面的数据验证，包括单项验证和交叉验证
   * BUSINESS: 必须检查所有必需字段和数据一致性
   * 
   * @param data - 导出源数据
   * @returns 验证结果
   */
  validateExportData(data: ExportSourceData): ValidationResult<ExportSourceData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // # 验证板数据
    const boardValidation = this.validators.get('board')!.validate(data.board);
    errors.push(...boardValidation.errors);
    warnings.push(...boardValidation.warnings);
    
    // # 验证组件数据
    if (data.components) {
      for (const component of data.components) {
        const componentValidation = this.validators.get('component')!.validate(component);
        errors.push(...componentValidation.errors.map(e => `Component ${component.refDes}: ${e}`));
        warnings.push(...componentValidation.warnings.map(w => `Component ${component.refDes}: ${w}`));
      }
    }
    
    // # 验证孔数据
    if (data.holes) {
      for (const hole of data.holes) {
        const holeValidation = this.validators.get('hole')!.validate(hole);
        errors.push(...holeValidation.errors.map(e => `Hole ${hole.id}: ${e}`));
        warnings.push(...holeValidation.warnings.map(w => `Hole ${hole.id}: ${w}`));
      }
    }
    
    // # 验证禁止区数据
    if (data.keepouts) {
      for (const keepout of data.keepouts) {
        const keepoutValidation = this.validators.get('keepout')!.validate(keepout);
        errors.push(...keepoutValidation.errors.map(e => `Keepout ${keepout.id}: ${e}`));
        warnings.push(...keepoutValidation.warnings.map(w => `Keepout ${keepout.id}: ${w}`));
      }
    }
    
    // # 验证层数据
    if (data.layers) {
      for (const layer of data.layers) {
        const layerValidation = this.validators.get('layer')!.validate(layer);
        errors.push(...layerValidation.errors.map(e => `Layer ${layer.id}: ${e}`));
        warnings.push(...layerValidation.warnings.map(w => `Layer ${layer.id}: ${w}`));
      }
    }
    
    // # 交叉验证
    if (this.config.enableCrossValidation) {
      this.performCrossValidation(data, errors, warnings);
    }
    
    // # 应用自定义规则
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        const ruleResult = rule.validate(data);
        errors.push(...ruleResult.errors.map(e => `${rule.name}: ${e}`));
        warnings.push(...ruleResult.warnings.map(w => `${rule.name}: ${w}`));
      }
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
  
  /**
   * 带错误恢复的验证
   * 
   * @remarks
   * 尝试修复可恢复的错误，提供详细的恢复建议
   * BUSINESS: 支持graceful degradation和默认值替换
   * 
   * @param data - 导出源数据
   * @returns 验证结果和恢复信息
   */
  validateWithRecovery(data: ExportSourceData): {
    result: ExportSourceData;
    errors: ErrorContext[];
    recovered: boolean;
  } {
    const errors: ErrorContext[] = [];
    let recovered = false;
    const result = { ...data };
    
    // # 板数据恢复
    if (!data.board.id || data.board.id.trim() === '') {
      result.board.id = 'BOARD_DEFAULT';
      errors.push({
        location: 'board.id',
        severity: 'warning',
        code: 'MISSING_BOARD_ID',
        message: '板ID缺失',
        suggestion: '已使用默认值 "BOARD_DEFAULT"'
      });
      recovered = true;
    }
    
    if (!data.board.name || data.board.name.trim() === '') {
      result.board.name = result.board.id;
      errors.push({
        location: 'board.name',
        severity: 'warning',
        code: 'MISSING_BOARD_NAME',
        message: '板名称缺失',
        suggestion: `已使用板ID "${result.board.id}" 作为名称`
      });
      recovered = true;
    }
    
    // # 组件数据恢复
    if (result.components) {
      for (let i = 0; i < result.components.length; i++) {
        const component = result.components[i];
        
        if (!component.partNumber || component.partNumber.trim() === '') {
          result.components[i].partNumber = component.refDes;
          errors.push({
            location: `components[${i}].partNumber`,
            severity: 'warning',
            code: 'MISSING_PART_NUMBER',
            message: `组件 ${component.refDes} 缺少料号`,
            suggestion: `已使用位号 "${component.refDes}" 作为料号`
          });
          recovered = true;
        }
        
        if (component.position.z === undefined) {
          // 根据层确定Z位置
          const zPosition = this.getDefaultZPosition(component);
          result.components[i].position.z = zPosition;
          errors.push({
            location: `components[${i}].position.z`,
            severity: 'info',
            code: 'DEFAULT_Z_POSITION',
            message: `组件 ${component.refDes} Z位置未指定`,
            suggestion: `已根据层 "${component.layer || 'TOP'}" 设置默认Z位置: ${zPosition}`
          });
          recovered = true;
        }
      }
    }
    
    // # 孔数据恢复
    if (result.holes) {
      for (let i = 0; i < result.holes.length; i++) {
        const hole = result.holes[i];
        
        if (hole.type === 'plated' && !hole.platingThickness) {
          result.holes[i].platingThickness = 0.025; // 默认25微米镀层
          errors.push({
            location: `holes[${i}].platingThickness`,
            severity: 'info',
            code: 'DEFAULT_PLATING_THICKNESS',
            message: `镀孔 ${hole.id} 缺少镀层厚度`,
            suggestion: '已使用默认值 0.025mm'
          });
          recovered = true;
        }
      }
    }
    
    return {
      result,
      errors,
      recovered
    };
  }
  
  /**
   * 执行交叉验证
   * 
   * @remarks
   * 验证不同数据类型之间的一致性和关联性
   * BUSINESS: 确保组件在板边界内，层叠结构一致等
   * 
   * @param data - 导出源数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private performCrossValidation(data: ExportSourceData, errors: string[], warnings: string[]): void {
    // # 验证组件是否在板边界内
    if (data.components && data.board.outline) {
      for (const component of data.components) {
        if (!this.isPointInBounds(component.position, data.board.outline)) {
          warnings.push(`组件 ${component.refDes} 在板轮廓外 位置 (${component.position.x}, ${component.position.y})。建议将组件移动到板边界内。`);
        }
      }
    }
    
    // # 验证孔是否在板边界内
    if (data.holes && data.board.outline) {
      for (const hole of data.holes) {
        if (!this.isPointInBounds(hole.position, data.board.outline)) {
          warnings.push(`孔 ${hole.id} 在板轮廓外 位置 (${hole.position.x}, ${hole.position.y})。建议将孔移动到板边界内。`);
        }
      }
    }
    
    // # 验证层叠结构一致性
    if (data.layers && data.layerStackup) {
      const layerIds = new Set(data.layers.map(l => l.id));
      for (const stackupLayer of data.layerStackup.layers) {
        if (!layerIds.has(stackupLayer.layerId)) {
          errors.push(`层叠引用未定义的层: ${stackupLayer.layerId}。请定义此层或从层叠中移除。`);
        }
      }
      
      // 验证层叠厚度一致性
      const stackupThickness = data.layerStackup.layers.reduce((sum, layer) => sum + layer.thickness, 0);
      const layersThickness = data.layers.reduce((sum, layer) => sum + layer.thickness, 0);
      
      if (Math.abs(stackupThickness - layersThickness) > 0.001) {
        warnings.push(`层叠总厚度 (${stackupThickness}mm) 与各层厚度之和 (${layersThickness}mm) 不匹配。建议检查层厚度值。`);
      }
    }
    
    // # 验证组件引用的层是否存在
    if (data.components && data.layers) {
      const layerNames = new Set(data.layers.map(l => l.name));
      for (const component of data.components) {
        const componentLayer = (component as any).layer;
        if (componentLayer && !layerNames.has(componentLayer)) {
          warnings.push(`组件 ${component.refDes} 引用未定义的层: ${componentLayer}。建议定义此层或使用现有层名称。`);
        }
      }
    }
    
    // # 验证禁止区引用的层是否存在
    if (data.keepouts && data.layers) {
      const layerNames = new Set(data.layers.map(l => l.name));
      for (const keepout of data.keepouts) {
        for (const layerName of keepout.layers) {
          if (!layerNames.has(layerName)) {
            warnings.push(`禁止区 ${keepout.id} 引用未定义的层: ${layerName}。建议定义此层或从禁止区中移除。`);
          }
        }
      }
    }
    
    // # 验证组件重叠
    if (data.components && data.components.length > 1) {
      for (let i = 0; i < data.components.length; i++) {
        for (let j = i + 1; j < data.components.length; j++) {
          const comp1 = data.components[i];
          const comp2 = data.components[j];
          
          if (this.componentsOverlap(comp1, comp2)) {
            warnings.push(`组件 ${comp1.refDes} 和 ${comp2.refDes} 可能重叠。建议调整组件位置以避免冲突。`);
          }
        }
      }
    }
  }
  
  /**
   * 检查点是否在边界内
   * 
   * @param point - 点坐标
   * @param outline - 板轮廓
   * @returns 是否在边界内
   */
  private isPointInBounds(point: { x: number; y: number }, outline: any): boolean {
    if (!outline.points || outline.points.length < 3) return true;
    
    const minX = Math.min(...outline.points.map((p: any) => p.x));
    const maxX = Math.max(...outline.points.map((p: any) => p.x));
    const minY = Math.min(...outline.points.map((p: any) => p.y));
    const maxY = Math.max(...outline.points.map((p: any) => p.y));
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }
  
  /**
   * 获取默认Z位置
   * 
   * @param component - 组件数据
   * @returns 默认Z位置
   */
  private getDefaultZPosition(component: ComponentData): number {
    const layer = (component as any).layer?.toUpperCase() || 'TOP';
    const boardThickness = 1.6; // 默认板厚
    
    switch (layer) {
      case 'TOP':
        return boardThickness;
      case 'BOTTOM':
        return 0;
      default:
        return boardThickness / 2; // 内层默认在中间
    }
  }
  
  /**
   * 检查组件是否重叠
   * 
   * @param comp1 - 组件1
   * @param comp2 - 组件2
   * @returns 是否重叠
   */
  private componentsOverlap(comp1: ComponentData, comp2: ComponentData): boolean {
    // 简化的重叠检测：检查边界框是否重叠
    const comp1Left = comp1.position.x - comp1.dimensions.width / 2;
    const comp1Right = comp1.position.x + comp1.dimensions.width / 2;
    const comp1Bottom = comp1.position.y - comp1.dimensions.height / 2;
    const comp1Top = comp1.position.y + comp1.dimensions.height / 2;
    
    const comp2Left = comp2.position.x - comp2.dimensions.width / 2;
    const comp2Right = comp2.position.x + comp2.dimensions.width / 2;
    const comp2Bottom = comp2.position.y - comp2.dimensions.height / 2;
    const comp2Top = comp2.position.y + comp2.dimensions.height / 2;
    
    // 检查是否有重叠
    return !(comp1Right < comp2Left || comp2Right < comp1Left || 
             comp1Top < comp2Bottom || comp2Top < comp1Bottom);
  }
}