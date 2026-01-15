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
import { 
  ErrorContext, 
  ErrorContextBuilder, 
  ErrorContextManager, 
  ErrorContextFactory,
  ErrorSeverity,
  ErrorCode 
} from './error-context';

// # 验证结果接口
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

// # 增强的验证结果接口
export interface EnhancedValidationResult<T> {
  valid: boolean;
  data?: T;
  errorContexts: ErrorContext[];
  recovered: boolean;
  statistics: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

// # 错误恢复结果接口
export interface RecoveryResult<T> {
  result: T;
  errors: ErrorContext[];
  recovered: boolean;
  recoveryActions: RecoveryAction[];
}

// # 恢复动作接口
export interface RecoveryAction {
  type: 'default_value' | 'data_correction' | 'structure_fix' | 'validation_skip';
  location: string;
  description: string;
  originalValue?: any;
  newValue?: any;
}

// # 验证配置接口
export interface ValidationConfig {
  strictMode: boolean;
  enableCrossValidation: boolean;
  enableRecovery?: boolean;
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
 * DESIGN: 使用验证器模式，支持可扩展的验证规则和错误恢复
 * BUSINESS: 确保100%验证通过率，提供清晰的错误恢复指导
 * 
 * @example
 * ```typescript
 * const engine = new ValidationEngine({
 *   strictMode: true,
 *   enableCrossValidation: true,
 *   enableRecovery: true
 * });
 * 
 * const result = engine.validateWithEnhancedRecovery(exportData);
 * if (!result.valid) {
 *   console.log('Error report:', result.errorContexts);
 *   console.log('Recovery applied:', result.recovered);
 * }
 * ```
 */
export class ValidationEngine {
  private validators: Map<string, DataValidator> = new Map();
  private errorManager: ErrorContextManager = new ErrorContextManager();
  
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
   * 带增强错误恢复的验证
   * 
   * @remarks
   * 使用新的错误上下文系统，提供更详细的错误信息和恢复策略
   * BUSINESS: 支持graceful degradation和智能默认值替换
   * 
   * @param data - 导出源数据
   * @returns 增强的验证结果
   */
  validateWithEnhancedRecovery(data: ExportSourceData): EnhancedValidationResult<ExportSourceData> {
    this.errorManager.clear();
    const recoveryActions: RecoveryAction[] = [];
    const result = this.deepClone(data);
    
    // # 板数据验证和恢复
    this.validateAndRecoverBoardData(result.board, recoveryActions);
    
    // # 组件数据验证和恢复
    if (result.components) {
      this.validateAndRecoverComponentsData(result.components, recoveryActions);
    }
    
    // # 孔数据验证和恢复
    if (result.holes) {
      this.validateAndRecoverHolesData(result.holes, recoveryActions);
    }
    
    // # 禁止区数据验证和恢复
    if (result.keepouts) {
      this.validateAndRecoverKeepoutsData(result.keepouts, recoveryActions);
    }
    
    // # 层数据验证和恢复
    if (result.layers) {
      this.validateAndRecoverLayersData(result.layers, recoveryActions);
    }
    
    // # 层叠结构验证和恢复
    if (result.layerStackup) {
      this.validateAndRecoverLayerStackupData(result.layerStackup, result.layers, recoveryActions);
    }
    
    // # 交叉验证和恢复
    if (this.config.enableCrossValidation) {
      this.performEnhancedCrossValidation(result, recoveryActions);
    }
    
    // # 应用自定义规则
    if (this.config.customRules) {
      this.applyCustomRulesWithRecovery(result, recoveryActions);
    }
    
    const errorContexts = this.errorManager.getAllErrors();
    const statistics = this.errorManager.getStatistics();
    
    return {
      valid: !this.errorManager.hasErrors(),
      data: result,
      errorContexts,
      recovered: recoveryActions.length > 0,
      statistics
    };
  }
  
  /**
   * 验证和恢复板数据
   * 
   * @param boardData - 板数据
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverBoardData(boardData: BoardData, recoveryActions: RecoveryAction[]): void {
    // 验证板ID
    if (!boardData.id || boardData.id.trim() === '') {
      const originalValue = boardData.id;
      boardData.id = this.generateDefaultBoardId();
      
      this.errorManager.addError(
        ErrorContextFactory.defaultValueApplied(
          'board.id',
          boardData.id,
          '板ID缺失或为空'
        )
      );
      
      recoveryActions.push({
        type: 'default_value',
        location: 'board.id',
        description: '应用默认板ID',
        originalValue,
        newValue: boardData.id
      });
    }
    
    // 验证板名称
    if (!boardData.name || boardData.name.trim() === '') {
      const originalValue = boardData.name;
      boardData.name = boardData.id;
      
      this.errorManager.addError(
        ErrorContextFactory.defaultValueApplied(
          'board.name',
          boardData.name,
          '板名称缺失，使用板ID作为名称'
        )
      );
      
      recoveryActions.push({
        type: 'default_value',
        location: 'board.name',
        description: '使用板ID作为板名称',
        originalValue,
        newValue: boardData.name
      });
    }
    
    // 验证板轮廓
    if (!boardData.outline || !boardData.outline.points || boardData.outline.points.length < 3) {
      this.errorManager.addError(
        ErrorContextBuilder
          .create()
          .location('board.outline')
          .severity(ErrorSeverity.ERROR)
          .code(ErrorCode.MISSING_REQUIRED_FIELD)
          .message('板轮廓缺失或点数不足')
          .suggestion('请提供至少3个点的板轮廓定义')
          .source('ValidationEngine')
          .build()
      );
    } else {
      // 验证轮廓点的有效性
      for (let i = 0; i < boardData.outline.points.length; i++) {
        const point = boardData.outline.points[i];
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
          this.errorManager.addError(
            ErrorContextFactory.invalidDataType(
              `board.outline.points[${i}]`,
              'number',
              typeof point.x === 'number' ? typeof point.y : typeof point.x
            )
          );
        }
        
        if (isNaN(point.x) || isNaN(point.y)) {
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location(`board.outline.points[${i}]`)
              .severity(ErrorSeverity.ERROR)
              .code(ErrorCode.INVALID_COORDINATE)
              .message('轮廓点坐标包含NaN值')
              .suggestion('请提供有效的数值坐标')
              .data({ point })
              .build()
          );
        }
      }
    }
    
    // 验证板厚度
    if (!boardData.outline.thickness || boardData.outline.thickness <= 0) {
      const originalValue = boardData.outline.thickness;
      boardData.outline.thickness = 1.6; // 标准PCB厚度
      
      this.errorManager.addError(
        ErrorContextFactory.defaultValueApplied(
          'board.outline.thickness',
          boardData.outline.thickness,
          '板厚度缺失或无效，使用标准厚度1.6mm'
        )
      );
      
      recoveryActions.push({
        type: 'default_value',
        location: 'board.outline.thickness',
        description: '应用标准板厚度',
        originalValue,
        newValue: boardData.outline.thickness
      });
    }
  }
  
  /**
   * 验证和恢复组件数据
   * 
   * @param components - 组件数据数组
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverComponentsData(components: ComponentData[], recoveryActions: RecoveryAction[]): void {
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const location = `components[${i}]`;
      
      // 验证位号
      if (!component.refDes || component.refDes.trim() === '') {
        this.errorManager.addError(
          ErrorContextFactory.missingRequiredField(
            `${location}.refDes`,
            'refDes',
            '组件位号是必需的，例如: "R1", "C2", "U1"'
          )
        );
      }
      
      // 验证和恢复料号
      if (!component.partNumber || component.partNumber.trim() === '') {
        const originalValue = component.partNumber;
        component.partNumber = component.refDes || `PART_${i + 1}`;
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.partNumber`,
            component.partNumber,
            '料号缺失，使用位号作为料号'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.partNumber`,
          description: '使用位号作为料号',
          originalValue,
          newValue: component.partNumber
        });
      }
      
      // 验证和恢复封装名称
      if (!component.packageName || component.packageName.trim() === '') {
        const originalValue = component.packageName;
        component.packageName = 'UNKNOWN_PACKAGE';
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.packageName`,
            component.packageName,
            '封装名称缺失，使用默认值'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.packageName`,
          description: '应用默认封装名称',
          originalValue,
          newValue: component.packageName
        });
      }
      
      // 验证位置信息
      if (!component.position) {
        this.errorManager.addError(
          ErrorContextFactory.missingRequiredField(
            `${location}.position`,
            'position',
            '组件位置信息是必需的，包括x, y坐标和旋转角度'
          )
        );
      } else {
        // 验证坐标
        if (typeof component.position.x !== 'number' || isNaN(component.position.x)) {
          this.errorManager.addError(
            ErrorContextFactory.invalidDataType(
              `${location}.position.x`,
              'number',
              typeof component.position.x
            )
          );
        }
        
        if (typeof component.position.y !== 'number' || isNaN(component.position.y)) {
          this.errorManager.addError(
            ErrorContextFactory.invalidDataType(
              `${location}.position.y`,
              'number',
              typeof component.position.y
            )
          );
        }
        
        // 验证和恢复Z位置
        if (component.position.z === undefined || component.position.z === null) {
          const originalValue = component.position.z;
          component.position.z = this.getDefaultZPosition(component);
          
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location(`${location}.position.z`)
              .severity(ErrorSeverity.INFO)
              .code(ErrorCode.DEFAULT_Z_POSITION)
              .message('Z位置未指定，已应用默认值')
              .suggestion(`根据组件层位置计算的默认Z值: ${component.position.z}`)
              .data({ componentId: component.refDes, zPosition: component.position.z })
              .build()
          );
          
          recoveryActions.push({
            type: 'default_value',
            location: `${location}.position.z`,
            description: '计算默认Z位置',
            originalValue,
            newValue: component.position.z
          });
        }
        
        // 验证旋转角度
        if (typeof component.position.rotation !== 'number') {
          const originalValue = component.position.rotation;
          component.position.rotation = 0;
          
          this.errorManager.addError(
            ErrorContextFactory.defaultValueApplied(
              `${location}.position.rotation`,
              component.position.rotation,
              '旋转角度无效，设置为0度'
            )
          );
          
          recoveryActions.push({
            type: 'default_value',
            location: `${location}.position.rotation`,
            description: '应用默认旋转角度',
            originalValue,
            newValue: component.position.rotation
          });
        } else if (component.position.rotation < 0 || component.position.rotation >= 360) {
          // 标准化旋转角度到0-360度范围
          const originalValue = component.position.rotation;
          component.position.rotation = ((component.position.rotation % 360) + 360) % 360;
          
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location(`${location}.position.rotation`)
              .severity(ErrorSeverity.INFO)
              .code(ErrorCode.DEFAULT_VALUE_APPLIED)
              .message('旋转角度已标准化到0-360度范围')
              .suggestion(`原值: ${originalValue}°, 标准化后: ${component.position.rotation}°`)
              .build()
          );
          
          recoveryActions.push({
            type: 'data_correction',
            location: `${location}.position.rotation`,
            description: '标准化旋转角度',
            originalValue,
            newValue: component.position.rotation
          });
        }
      }
      
      // 验证尺寸信息
      if (!component.dimensions) {
        this.errorManager.addError(
          ErrorContextFactory.missingRequiredField(
            `${location}.dimensions`,
            'dimensions',
            '组件尺寸信息是必需的，包括width, height, thickness'
          )
        );
      } else {
        // 验证各个尺寸值
        const dimensions = ['width', 'height', 'thickness'];
        for (const dim of dimensions) {
          const value = (component.dimensions as any)[dim];
          if (typeof value !== 'number' || value <= 0) {
            const originalValue = value;
            (component.dimensions as any)[dim] = 1.0; // 默认1mm
            
            this.errorManager.addError(
              ErrorContextFactory.defaultValueApplied(
                `${location}.dimensions.${dim}`,
                1.0,
                `${dim}值无效或缺失，使用默认值1.0mm`
              )
            );
            
            recoveryActions.push({
              type: 'default_value',
              location: `${location}.dimensions.${dim}`,
              description: `应用默认${dim}值`,
              originalValue,
              newValue: 1.0
            });
          }
        }
      }
    }
  }
  
  /**
   * 验证和恢复孔数据
   * 
   * @param holes - 孔数据数组
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverHolesData(holes: HoleData[], recoveryActions: RecoveryAction[]): void {
    for (let i = 0; i < holes.length; i++) {
      const hole = holes[i];
      const location = `holes[${i}]`;
      
      // 验证孔ID
      if (!hole.id || hole.id.trim() === '') {
        const originalValue = hole.id;
        hole.id = `HOLE_${i + 1}`;
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.id`,
            hole.id,
            '孔ID缺失，生成默认ID'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.id`,
          description: '生成默认孔ID',
          originalValue,
          newValue: hole.id
        });
      }
      
      // 验证孔类型
      if (!hole.type || !['plated', 'non-plated'].includes(hole.type)) {
        const originalValue = hole.type;
        hole.type = 'non-plated';
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.type`,
            hole.type,
            '孔类型无效，设置为非镀孔'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.type`,
          description: '应用默认孔类型',
          originalValue,
          newValue: hole.type
        });
      }
      
      // 验证孔径
      if (typeof hole.diameter !== 'number' || hole.diameter <= 0) {
        this.errorManager.addError(
          ErrorContextBuilder
            .create()
            .location(`${location}.diameter`)
            .severity(ErrorSeverity.ERROR)
            .code(ErrorCode.INVALID_DIMENSION)
            .message('孔径必须是大于0的数值')
            .suggestion('请提供有效的孔径值，单位为毫米')
            .data({ diameter: hole.diameter })
            .build()
        );
      }
      
      // 验证镀层厚度（仅对镀孔）
      if (hole.type === 'plated' && !hole.platingThickness) {
        const originalValue = hole.platingThickness;
        hole.platingThickness = 0.025; // 默认25微米
        
        this.errorManager.addError(
          ErrorContextBuilder
            .create()
            .location(`${location}.platingThickness`)
            .severity(ErrorSeverity.INFO)
            .code(ErrorCode.DEFAULT_PLATING_THICKNESS)
            .message('镀层厚度未指定，使用默认值')
            .suggestion('已应用标准镀层厚度25微米(0.025mm)')
            .build()
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.platingThickness`,
          description: '应用默认镀层厚度',
          originalValue,
          newValue: hole.platingThickness
        });
      }
    }
  }
  
  /**
   * 验证和恢复禁止区数据
   * 
   * @param keepouts - 禁止区数据数组
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverKeepoutsData(keepouts: KeepoutData[], recoveryActions: RecoveryAction[]): void {
    for (let i = 0; i < keepouts.length; i++) {
      const keepout = keepouts[i];
      const location = `keepouts[${i}]`;
      
      // 验证禁止区ID
      if (!keepout.id || keepout.id.trim() === '') {
        const originalValue = keepout.id;
        keepout.id = `KEEPOUT_${i + 1}`;
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.id`,
            keepout.id,
            '禁止区ID缺失，生成默认ID'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.id`,
          description: '生成默认禁止区ID',
          originalValue,
          newValue: keepout.id
        });
      }
      
      // 验证禁止区类型
      if (!keepout.type || !['component', 'via', 'trace'].includes(keepout.type)) {
        const originalValue = keepout.type;
        keepout.type = 'component';
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.type`,
            keepout.type,
            '禁止区类型无效，设置为组件禁止区'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.type`,
          description: '应用默认禁止区类型',
          originalValue,
          newValue: keepout.type
        });
      }
      
      // 验证几何形状
      if (!keepout.geometry || !keepout.geometry.type) {
        this.errorManager.addError(
          ErrorContextFactory.missingRequiredField(
            `${location}.geometry.type`,
            'geometry.type',
            '禁止区几何类型是必需的: rectangle, circle, 或 polygon'
          )
        );
      }
      
      // 验证层引用
      if (!keepout.layers || keepout.layers.length === 0) {
        const originalValue = keepout.layers;
        keepout.layers = ['ALL'];
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.layers`,
            keepout.layers,
            '禁止区层引用缺失，应用到所有层'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.layers`,
          description: '应用默认层引用',
          originalValue,
          newValue: keepout.layers
        });
      }
    }
  }
  
  /**
   * 验证和恢复层数据
   * 
   * @param layers - 层数据数组
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverLayersData(layers: LayerData[], recoveryActions: RecoveryAction[]): void {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const location = `layers[${i}]`;
      
      // 验证层ID
      if (!layer.id || layer.id.trim() === '') {
        const originalValue = layer.id;
        layer.id = `LAYER_${i + 1}`;
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.id`,
            layer.id,
            '层ID缺失，生成默认ID'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.id`,
          description: '生成默认层ID',
          originalValue,
          newValue: layer.id
        });
      }
      
      // 验证层名称
      if (!layer.name || layer.name.trim() === '') {
        const originalValue = layer.name;
        layer.name = layer.id;
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.name`,
            layer.name,
            '层名称缺失，使用层ID作为名称'
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.name`,
          description: '使用层ID作为层名称',
          originalValue,
          newValue: layer.name
        });
      }
      
      // 验证层厚度
      if (typeof layer.thickness !== 'number' || layer.thickness <= 0) {
        this.errorManager.addError(
          ErrorContextBuilder
            .create()
            .location(`${location}.thickness`)
            .severity(ErrorSeverity.ERROR)
            .code(ErrorCode.ZERO_THICKNESS)
            .message('层厚度必须是大于0的数值')
            .suggestion('请提供有效的层厚度值，单位为毫米')
            .data({ thickness: layer.thickness })
            .build()
        );
      }
      
      // 验证层类型
      const validTypes = ['SIGNAL', 'PLANE', 'SOLDERMASK', 'SILKSCREEN', 'DIELECTRIC', 'OTHERSIGNAL'];
      if (!layer.type || !validTypes.includes(layer.type)) {
        const originalValue = layer.type;
        layer.type = 'OTHERSIGNAL';
        
        this.errorManager.addError(
          ErrorContextFactory.defaultValueApplied(
            `${location}.type`,
            layer.type,
            `层类型无效，设置为默认类型。有效类型: ${validTypes.join(', ')}`
          )
        );
        
        recoveryActions.push({
          type: 'default_value',
          location: `${location}.type`,
          description: '应用默认层类型',
          originalValue,
          newValue: layer.type
        });
      }
    }
  }
  
  /**
   * 验证和恢复层叠结构数据
   * 
   * @param layerStackup - 层叠结构数据
   * @param layers - 层数据数组
   * @param recoveryActions - 恢复动作列表
   */
  private validateAndRecoverLayerStackupData(
    layerStackup: LayerStackupData, 
    layers: LayerData[] | undefined, 
    recoveryActions: RecoveryAction[]
  ): void {
    const location = 'layerStackup';
    
    // 验证层叠ID
    if (!layerStackup.id || layerStackup.id.trim() === '') {
      const originalValue = layerStackup.id;
      layerStackup.id = 'DEFAULT_STACKUP';
      
      this.errorManager.addError(
        ErrorContextFactory.defaultValueApplied(
          `${location}.id`,
          layerStackup.id,
          '层叠ID缺失，生成默认ID'
        )
      );
      
      recoveryActions.push({
        type: 'default_value',
        location: `${location}.id`,
        description: '生成默认层叠ID',
        originalValue,
        newValue: layerStackup.id
      });
    }
    
    // 验证层叠名称
    if (!layerStackup.name || layerStackup.name.trim() === '') {
      const originalValue = layerStackup.name;
      layerStackup.name = layerStackup.id;
      
      this.errorManager.addError(
        ErrorContextFactory.defaultValueApplied(
          `${location}.name`,
          layerStackup.name,
          '层叠名称缺失，使用层叠ID作为名称'
        )
      );
      
      recoveryActions.push({
        type: 'default_value',
        location: `${location}.name`,
        description: '使用层叠ID作为层叠名称',
        originalValue,
        newValue: layerStackup.name
      });
    }
    
    // 验证层叠层引用
    if (layers) {
      const layerIds = new Set(layers.map(l => l.id));
      for (let i = 0; i < layerStackup.layers.length; i++) {
        const stackupLayer = layerStackup.layers[i];
        if (!layerIds.has(stackupLayer.layerId)) {
          this.errorManager.addError(
            ErrorContextFactory.undefinedLayerReference(
              `${location}.layers[${i}].layerId`,
              stackupLayer.layerId,
              Array.from(layerIds)
            )
          );
        }
      }
    }
  }
  
  /**
   * 执行增强的交叉验证
   * 
   * @param data - 导出源数据
   * @param recoveryActions - 恢复动作列表
   */
  private performEnhancedCrossValidation(data: ExportSourceData, recoveryActions: RecoveryAction[]): void {
    // 验证组件是否在板边界内
    if (data.components && data.board.outline) {
      for (const component of data.components) {
        if (!this.isPointInBounds(component.position, data.board.outline)) {
          this.errorManager.addError(
            ErrorContextFactory.componentOutOfBounds(
              component.refDes,
              { x: component.position.x, y: component.position.y }
            )
          );
        }
      }
    }
    
    // 验证孔是否在板边界内
    if (data.holes && data.board.outline) {
      for (const hole of data.holes) {
        if (!this.isPointInBounds(hole.position, data.board.outline)) {
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location(`holes[${hole.id}].position`)
              .severity(ErrorSeverity.WARNING)
              .code(ErrorCode.HOLE_OUT_OF_BOUNDS)
              .message(`孔 ${hole.id} 位于板轮廓外`)
              .suggestion(`请将孔移动到板边界内，当前位置: (${hole.position.x}, ${hole.position.y})`)
              .data({ holeId: hole.id, position: hole.position })
              .build()
          );
        }
      }
    }
    
    // 验证层叠结构一致性
    if (data.layers && data.layerStackup) {
      const layerIds = new Set(data.layers.map(l => l.id));
      for (const stackupLayer of data.layerStackup.layers) {
        if (!layerIds.has(stackupLayer.layerId)) {
          this.errorManager.addError(
            ErrorContextFactory.undefinedLayerReference(
              'layerStackup.layers',
              stackupLayer.layerId,
              Array.from(layerIds)
            )
          );
        }
      }
      
      // 验证层叠厚度一致性
      const stackupThickness = data.layerStackup.layers.reduce((sum, layer) => sum + layer.thickness, 0);
      const layersThickness = data.layers.reduce((sum, layer) => sum + layer.thickness, 0);
      
      if (Math.abs(stackupThickness - layersThickness) > 0.001) {
        this.errorManager.addError(
          ErrorContextBuilder
            .create()
            .location('layerStackup')
            .severity(ErrorSeverity.WARNING)
            .code(ErrorCode.THICKNESS_INCONSISTENCY)
            .message('层叠总厚度与各层厚度之和不匹配')
            .suggestion(`层叠厚度: ${stackupThickness}mm, 各层厚度之和: ${layersThickness}mm`)
            .data({ stackupThickness, layersThickness })
            .build()
        );
      }
    }
    
    // 验证组件重叠
    if (data.components && data.components.length > 1) {
      for (let i = 0; i < data.components.length; i++) {
        for (let j = i + 1; j < data.components.length; j++) {
          const comp1 = data.components[i];
          const comp2 = data.components[j];
          
          if (this.componentsOverlap(comp1, comp2)) {
            this.errorManager.addError(
              ErrorContextBuilder
                .create()
                .location(`components[${comp1.refDes}]`)
                .severity(ErrorSeverity.WARNING)
                .code(ErrorCode.COMPONENT_OVERLAP)
                .message(`组件 ${comp1.refDes} 和 ${comp2.refDes} 可能重叠`)
                .suggestion('请调整组件位置以避免冲突')
                .data({ component1: comp1.refDes, component2: comp2.refDes })
                .build()
            );
          }
        }
      }
    }
  }
  
  /**
   * 应用自定义规则并进行恢复
   * 
   * @param data - 导出源数据
   * @param recoveryActions - 恢复动作列表
   */
  private applyCustomRulesWithRecovery(data: ExportSourceData, recoveryActions: RecoveryAction[]): void {
    if (!this.config.customRules) return;
    
    for (const rule of this.config.customRules) {
      try {
        const ruleResult = rule.validate(data);
        
        // 将规则验证结果转换为错误上下文
        for (const error of ruleResult.errors) {
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location('custom_rule')
              .severity(ErrorSeverity.ERROR)
              .code(ErrorCode.XML_STRUCTURE_ERROR)
              .message(`自定义规则 "${rule.name}": ${error}`)
              .source(rule.name)
              .build()
          );
        }
        
        for (const warning of ruleResult.warnings) {
          this.errorManager.addError(
            ErrorContextBuilder
              .create()
              .location('custom_rule')
              .severity(ErrorSeverity.WARNING)
              .code(ErrorCode.XML_STRUCTURE_ERROR)
              .message(`自定义规则 "${rule.name}": ${warning}`)
              .source(rule.name)
              .build()
          );
        }
      } catch (error) {
        this.errorManager.addError(
          ErrorContextBuilder
            .create()
            .location('custom_rule')
            .severity(ErrorSeverity.ERROR)
            .code(ErrorCode.XML_STRUCTURE_ERROR)
            .message(`自定义规则 "${rule.name}" 执行失败: ${error}`)
            .source(rule.name)
            .build()
        );
      }
    }
  }
  
  /**
   * 生成默认板ID
   * 
   * @returns 默认板ID
   */
  private generateDefaultBoardId(): string {
    const timestamp = Date.now().toString(36);
    return `BOARD_${timestamp}`;
  }
  
  /**
   * 深度克隆对象
   * 
   * @param obj - 要克隆的对象
   * @returns 克隆后的对象
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
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