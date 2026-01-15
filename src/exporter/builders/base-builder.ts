// ============= 基础构建器 =============
// DESIGN: 基础构建器提供所有构建器共用的功能和模板方法
// REF: IDXv4.5规范第4-6章

import { 
  EDMDObject, EDMDLengthProperty, CartesianPoint, 
  GeometryType, ItemType, GlobalUnit, EDMDIdentifier, EDMName,
  EDMDUserSimpleProperty, EDMDCurveSet2D, EDMDItem
} from '../../types/core';

// # 基础构建器接口定义
/**
 * 构建器配置接口
 */
export interface BuilderConfig {
  /** 是否使用IDXv4.5简化表示法（geometryType属性） */
  useSimplified: boolean;
  
  /** 默认长度单位 */
  defaultUnit: GlobalUnit;
  
  /** 创建者系统标识 */
  creatorSystem: string;
  
  /** ID生成前缀 */
  idPrefix?: string;
  
  /** 几何精度（小数位数） */
  precision?: number;
}

/**
 * 构建器上下文接口
 */
export interface BuilderContext {
  /** 获取下一个序列号 */
  getNextSequence(type: string): number;
  
  /** 添加构建警告 */
  addWarning(code: string, message: string, itemId?: string): void;
  
  /** 添加构建错误 */
  addError(code: string, message: string, itemId?: string): void;
  
  /** 生成唯一ID */
  generateId(type: string, identifier?: string): string;
}

/**
 * 构建器输入验证结果
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  warnings: string[];
  errors: string[];
}

// ============= 基础构建器抽象类 =============
/**
 * 所有具体构建器的基类
 */
export abstract class BaseBuilder<TInput, TOutput> {
  protected config: BuilderConfig;
  protected context: BuilderContext;
  protected geometryUtils: GeometryUtils;
  
  protected shapeCache: Map<string, any> = new Map();
  protected itemCache: Map<string, any> = new Map();
  
  constructor(config: BuilderConfig, context: BuilderContext) {
    if (!config) {
      throw new Error('Builder配置不能为空');
    }
    if (!context) {
      throw new Error('Builder上下文不能为空');
    }
    
    this.config = config;
    this.context = context;
    this.geometryUtils = new GeometryUtils({
      defaultUnit: config.defaultUnit,
      precision: config.precision || 6
    });
  }
  
  /**
   * 执行标准构建流程
   */
  async build(input: TInput): Promise<TOutput> {
    try {
      const validation = this.validateInput(input);
      if (!validation.valid) {
        const errorMsg = `输入验证失败: ${validation.errors.join(', ')}`;
        this.context.addError('VALIDATION_FAILED', errorMsg);
        throw new ValidationError(errorMsg);
      }
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          this.context.addWarning('VALIDATION_WARNING', warning);
        });
      }
      
      const processedData = await this.preProcess(validation.data!);
      const result = await this.construct(processedData);
      const finalResult = await this.postProcess(result);
      
      return finalResult;
      
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof BuildError) {
        throw error;
      }
      
      const buildError = new BuildError(
        `构建过程中发生未预期错误: ${error.message}`,
        { originalError: error, input }
      );
      this.context.addError('UNEXPECTED_ERROR', buildError.message);
      throw buildError;
    }
  }
  
  // 抽象方法
  protected abstract validateInput(input: TInput): ValidationResult<TInput>;
  protected abstract preProcess(input: TInput): Promise<any>;
  protected abstract construct(processedData: any): Promise<TOutput>;
  protected abstract postProcess(output: TOutput): Promise<TOutput>;
  
  // 通用工具方法
  protected generateItemId(type: string, identifier?: string): string {
    const prefix = this.config.idPrefix ? `${this.config.idPrefix}_${type}` : type;
    const seq = this.context.getNextSequence(type);
    
    if (identifier) {
      return `${prefix}_${identifier}_${seq.toString().padStart(3, '0')}`;
    }
    
    return `${prefix}_${Date.now()}_${seq.toString().padStart(3, '0')}`;
  }
  
  protected createLengthProperty(value: number, unit?: string): EDMDLengthProperty {
    if (isNaN(value) || !isFinite(value)) {
      throw new ValidationError(`无效的长度值: ${value}`);
    }
    
    return {
      Value: this.geometryUtils.roundValue(value),
      Unit: unit || this.config.defaultUnit
    };
  }
  
  protected createBaseItem(
    itemType: ItemType,
    geometryType?: GeometryType,
    name?: string,
    description?: string
  ): Partial<EDMDItem> {
    const baseItem: Partial<EDMDItem> = {
      ItemType: itemType,
      IsAttributeChanged: false,
      BaseLine: true
    };
    
    if (name) baseItem.Name = name;
    if (description) baseItem.Description = description;
    
    if (this.config.useSimplified && geometryType) {
      baseItem.geometryType = geometryType;
    }
    
    return baseItem;
  }
  
  protected createIdentifier(type: string, identifier: string): EDMDIdentifier {
    const seq = this.context.getNextSequence(`${type}_ID`);
    
    return {
      SystemScope: this.config.creatorSystem,
      Number: `${type}_${identifier}`,
      Version: 1,
      Revision: 0,
      Sequence: seq
    };
  }
  
  protected createCurveSet2D(
    lowerBound: number,
    upperBound: number,
    curves: any[]
  ): EDMDCurveSet2D {
    if (lowerBound > upperBound) {
      throw new ValidationError(`曲线集Z轴范围无效：下界(${lowerBound})大于上界(${upperBound})`);
    }
    
    return {
      id: this.context.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: this.createLengthProperty(lowerBound),
      UpperBound: this.createLengthProperty(upperBound),
      DetailedGeometricModelElement: curves
    };
  }
}

// ============= 自定义错误类型 =============
export class ValidationError extends Error {
  constructor(message: string, public validationErrors?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BuildError extends Error {
  constructor(
    message: string, 
    public context?: { originalError?: Error; input?: any }
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

// ============= 几何工具类 =============
export class GeometryUtils {
  constructor(private config: { defaultUnit: GlobalUnit; precision: number }) {}
  
  roundValue(value: number): number {
    const factor = Math.pow(10, this.config.precision);
    return Math.round(value * factor) / factor;
  }
  
  createBoundingBoxCurveSet(
    width: number,
    height: number,
    thickness: number,
    zPosition: number = 0
  ): EDMDCurveSet2D {
    const lowerBound = zPosition;
    const upperBound = zPosition + thickness;
    
    const points: CartesianPoint[] = [
      { id: this.generateId('PT'), X: 0, Y: 0 },
      { id: this.generateId('PT'), X: this.roundValue(width), Y: 0 },
      { id: this.generateId('PT'), X: this.roundValue(width), Y: this.roundValue(height) },
      { id: this.generateId('PT'), X: 0, Y: this.roundValue(height) }
    ];
    
    const polyLine: any = {
      id: this.generateId('POLYLINE'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    return {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: { Value: this.roundValue(lowerBound) },
      UpperBound: { Value: this.roundValue(upperBound) },
      DetailedGeometricModelElement: [polyLine]
    };
  }
  
  createCircleCurveSet(
    centerX: number,
    centerY: number,
    diameter: number,
    lowerBound: number,
    upperBound: number
  ): EDMDCurveSet2D {
    const centerPoint: CartesianPoint = {
      id: this.generateId('POINT'),
      X: this.roundValue(centerX),
      Y: this.roundValue(centerY)
    };
    
    const circle: any = {
      id: this.generateId('CIRCLE'),
      curveType: 'EDMDCircleCenter',
      CenterPoint: centerPoint,
      Diameter: { Value: this.roundValue(diameter) }
    };
    
    return {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: { Value: this.roundValue(lowerBound) },
      UpperBound: { Value: this.roundValue(upperBound) },
      DetailedGeometricModelElement: [circle]
    };
  }
  
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
