// ============= src/exporter/builders/base-builder.ts =============

// DESIGN: 基础构建器提供所有构建器共用的功能和模板方法
// REF: IDXv4.5规范第4-6章，特别是2.5D几何表示法
// BUSINESS: 遵循IDXv4.5简化表示法（geometryType属性）
// NOTE: 所有具体构建器应继承此类并实现抽象方法

import { 
  EDMDObject, EDMDLengthProperty, CartesianPoint, 
  StandardGeometryType, ItemType, GlobalUnit, EDMDItem,
  EDMDIdentifier, EDMDCurveSet2D, EDMDPolyLine,
  EDMDCircleCenter
} from '../../types/core';

// # 基础构建器接口定义
/**
 * 构建器配置接口
 * 
 * @remarks
 * 控制构建器的行为，如使用简化表示法、单位转换等
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 使用简化表示法配置
 * const config: BuilderConfig = {
 *   useSimplified: true,
 *   defaultUnit: GlobalUnit.UNIT_MM,
 *   creatorSystem: 'MyECADSystem'
 * };
 * ```
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
 * 
 * @remarks
 * 在构建过程中传递状态信息，如序列号、错误收集等
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 在构建过程中收集警告
 * const context = new ExportContext();
 * context.addWarning('COMP-001', '组件缺少3D模型信息');
 * ```
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
  
  /** 当前正在构建的项目（用于临时存储几何元素） */
  currentBuildingItem?: any;
}

/**
 * 构建器输入验证结果
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 验证通过的组件数据
 * const result: ValidationResult<ComponentData> = {
 *   valid: true,
 *   data: componentData,
 *   warnings: []
 * };
 * ```
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
 * 
 * @remarks
 * 使用模板方法模式确保所有构建器遵循相同的构建流程
 * DESIGN: 抽象类确保子类必须实现核心构建逻辑
 * PERFORMANCE: 提供缓存机制优化重复构建
 * 
 * @typeParam TInput - 输入数据类型
 * @typeParam TOutput - 输出数据类型
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 继承BaseBuilder创建自定义构建器
 * class CustomBuilder extends BaseBuilder<CustomData, EDMDItem> {
 *   // 实现抽象方法...
 * }
 * ```
 */
export abstract class BaseBuilder<TInput, TOutput> {
  // # 保护属性
  protected config: BuilderConfig;
  protected context: BuilderContext;
  protected geometryUtils: GeometryUtils;
  
  // ## 缓存机制
  protected shapeCache: Map<string, any> = new Map();
  protected itemCache: Map<string, any> = new Map();
  
  // # 构造函数
  /**
   * 创建基础构建器实例
   * 
   * @param config - 构建器配置
   * @param context - 构建器上下文
   * 
   * @example
   * ```typescript
   * // TEST_CASE: 创建组件构建器
   * const config: BuilderConfig = { useSimplified: true, defaultUnit: GlobalUnit.UNIT_MM };
   * const context = new ExportContext();
   * const builder = new ComponentBuilder(config, context);
   * ```
   */
  constructor(config: BuilderConfig, context: BuilderContext) {
    // ============= 参数验证 =============
    // BUSINESS: 必须提供配置和上下文
    // TEST_CASE: 缺少必需参数
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
  
  // ============= 模板方法：标准构建流程 =============
  /**
   * 执行标准构建流程
   * 
   * @remarks
   * 模板方法模式：验证 → 预处理 → 构建 → 后处理
   * DESIGN: 确保所有构建器遵循相同的质量控制流程
   * 
   * @param input - 输入数据
   * @returns 构建结果
   * 
   * @throws {ValidationError} 输入数据验证失败
   * @throws {BuildError} 构建过程中发生错误
   * 
   * @testScenario 正常构建流程
   * @testScenario 输入验证失败流程
   * @testScenario 构建过程错误处理
   */
  async build(input: TInput): Promise<TOutput> {
    try {
      // # 阶段1: 输入验证
      // BUSINESS: 确保输入数据符合IDX规范要求
      // TEST_CASE: 验证失败应抛出ValidationError
      const validation = this.validateInput(input);
      if (!validation.valid) {
        const errorMsg = `输入验证失败: ${validation.errors.join(', ')}`;
        this.context.addError('VALIDATION_FAILED', errorMsg);
        throw new ValidationError(errorMsg);
      }
      
      // --- 输出验证警告 ---
      // NOTE: 验证警告不影响构建，但需要记录
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          this.context.addWarning('VALIDATION_WARNING', warning);
        });
      }
      
      // # 阶段2: 预处理
      // PERFORMANCE: 预处理可以减少构建时的重复计算
      const processedData = await this.preProcess(validation.data!);
      
      // # 阶段3: 核心构建
      const result = await this.construct(processedData);
      
      // # 阶段4: 后处理和验证
      const finalResult = await this.postProcess(result);
      
      // TODO(构建器负责人): 2024-03-20 添加构建结果缓存 [P1-IMPORTANT]
      return finalResult;
      
    } catch (error: unknown) {
      // # 错误处理
      // BUSINESS: 构建错误必须包含足够信息用于调试
      if (error instanceof ValidationError || error instanceof BuildError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const buildError = new BuildError(
        `构建过程中发生未预期错误: ${errorMessage}`,
        { originalError: error instanceof Error ? error : undefined, input }
      );
      this.context.addError('UNEXPECTED_ERROR', buildError.message);
      throw buildError;
    }
  }
  
  // ============= 抽象方法（子类必须实现） =============
  /**
   * 验证输入数据
   * 
   * @remarks
   * 子类必须实现此方法以验证特定类型的输入数据
   * 
   * @param input - 输入数据
   * @returns 验证结果
   * 
   * @testCase 有效输入数据
   * @testExpect 返回valid=true且无错误
   * @testCase 无效输入数据
   * @testExpect 返回valid=false且包含错误信息
   */
  protected abstract validateInput(input: TInput): ValidationResult<TInput>;
  
  /**
   * 预处理输入数据
   * 
   * @remarks
   * 将输入数据转换为构建器内部使用的格式
   * PERFORMANCE: 可以在此阶段进行数据缓存
   * 
   * @param input - 验证后的输入数据
   * @returns 预处理后的数据
   */
  protected abstract preProcess(input: TInput): Promise<any>;
  
  /**
   * 核心构建逻辑
   * 
   * @remarks
   * 子类必须实现此方法以执行实际的构建工作
   * 
   * @param processedData - 预处理后的数据
   * @returns 构建结果
   */
  protected abstract construct(processedData: any): Promise<TOutput>;
  
  /**
   * 后处理和验证
   * 
   * @remarks
   * 对构建结果进行最终验证和优化
   * 
   * @param output - 构建结果
   * @returns 最终结果
   */
  protected abstract postProcess(output: TOutput): Promise<TOutput>;
  
  // ============= 通用工具方法 =============
  /**
   * 生成IDX项目ID
   * 
   * @remarks
   * IDX要求ID在文档中唯一，使用类型前缀确保唯一性
   * 
   * @param type - 项目类型（如'COMPONENT', 'HOLE'等）
   * @param identifier - 可选标识符（如元件位号）
   * @returns 唯一ID字符串
   * 
   * @example
   * ```typescript
   * // TEST_CASE: 生成组件ID
   * const componentId = this.generateItemId('COMPONENT', 'C1');
   * // 返回: "COMPONENT_C1_001"
   * ```
   */
  protected generateItemId(type: string, identifier?: string): string {
    const prefix = this.config.idPrefix ? `${this.config.idPrefix}_${type}` : type;
    const seq = this.context.getNextSequence(type);
    
    if (identifier) {
      return `${prefix}_${identifier}_${seq.toString().padStart(3, '0')}`;
    }
    
    return `${prefix}_${Date.now()}_${seq.toString().padStart(3, '0')}`;
  }
  
  /**
   * 创建长度属性
   * 
   * @remarks
   * IDX中所有长度值都应使用EDMDLengthProperty包装
   * 
   * @param value - 长度值
   * @param unit - 单位（可选，默认使用配置中的单位）
   * @returns 长度属性对象
   */
  protected createLengthProperty(value: number, unit?: string): EDMDLengthProperty {
    // SECURITY: 确保数值有效
    if (isNaN(value) || !isFinite(value)) {
      throw new ValidationError(`无效的长度值: ${value}`);
    }
    
    return {
      Value: this.geometryUtils.roundValue(value),
      Unit: unit || this.config.defaultUnit
    };
  }
  
  /**
   * 创建EDMDItem基础结构
   * 
   * @remarks
   * 为所有EDMDItem项目提供统一的基础结构
   * 
   * @param itemType - 项目类型（单个/装配体）
   * @param geometryType - 几何类型（简化表示法）
   * @param name - 项目名称
   * @param description - 项目描述
   * @returns 基础项目结构
   */
  protected createBaseItem(
    itemType: ItemType,
    geometryType?: StandardGeometryType,
    name?: string,
    description?: string
  ): Partial<EDMDItem> {
    const baseItem: Partial<EDMDItem> = {
      ItemType: itemType,
      IsAttributeChanged: false,
      BaseLine: true
    };
    
    // ## 可选属性
    if (name) baseItem.Name = name;
    if (description) baseItem.Description = description;
    
    // ## 简化表示法
    // DESIGN: 当配置启用简化表示法时，添加geometryType属性
    if (this.config.useSimplified && geometryType) {
      baseItem.geometryType = geometryType;
    }
    
    return baseItem;
  }
  
  /**
   * 创建EDMD标识符
   * 
   * @remarks
   * IDX使用五元组标识符确保唯一性和版本控制
   * REF: Section 5.2.1
   * 
   * @param type - 项目类型
   * @param identifier - 项目标识符
   * @returns EDMDIdentifier对象
   */
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
  
  /**
   * 创建2.5D曲线集
   * 
   * @remarks
   * 2.5D几何表示的核心：2D曲线 + Z轴范围
   * REF: Section 7.1
   * 
   * @param lowerBound - Z轴下界
   * @param upperBound - Z轴上界
   * @param curves - 2D曲线数组
   * @returns EDMDCurveSet2D对象
   */
  protected createCurveSet2D(
    lowerBound: number,
    upperBound: number,
    curves: any[]
  ): EDMDCurveSet2D {
    // BUSINESS: 确保下界不大于上界
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
  
  // TODO(构建器负责人): 2024-03-20 添加形状缓存机制 [P1-IMPORTANT]
  // FIXME(构建器负责人): 2024-03-15 处理大型曲线集时的内存问题 [P0-URGENT]
}

// ============= 自定义错误类型 =============
/**
 * 构建器验证错误
 * 
 * @remarks
 * 用于表示输入数据验证失败
 */
export class ValidationError extends Error {
  constructor(message: string, public validationErrors?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 构建器构建错误
 * 
 * @remarks
 * 用于表示构建过程中发生的错误
 */
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
/**
 * 几何处理工具类
 * 
 * @remarks
 * 提供2.5D几何相关的计算和转换功能
 * PERFORMANCE: 几何计算可能复杂，注意性能优化
 */
class GeometryUtils {
  constructor(private config: { defaultUnit: GlobalUnit; precision: number }) {}
  
  /**
   * 四舍五入数值到指定精度
   * 
   * @param value - 原始数值
   * @returns 四舍五入后的数值
   */
  roundValue(value: number): number {
    const factor = Math.pow(10, this.config.precision);
    return Math.round(value * factor) / factor;
  }
  
  /**
   * 创建矩形边界框曲线集
   * 
   * @remarks
   * 用于快速创建组件的2.5D几何表示
   * 
   * @param width - 宽度
   * @param height - 高度
   * @param thickness - 厚度
   * @param zPosition - Z轴位置
   * @returns 矩形边界框曲线集
   */
  createBoundingBoxCurveSet(
    width: number,
    height: number,
    thickness: number,
    zPosition: number = 0
  ): EDMDCurveSet2D {
    // # 计算Z轴范围
    const lowerBound = zPosition;
    const upperBound = zPosition + thickness;
    
    // # 创建矩形轮廓点
    const points: CartesianPoint[] = [
      { id: 'PT1', X: 0, Y: 0 },
      { id: 'PT2', X: width, Y: 0 },
      { id: 'PT3', X: width, Y: height },
      { id: 'PT4', X: 0, Y: height }
    ];
    
    // # 创建多边形曲线
    const polyLine: EDMDPolyLine = {
      id: this.generateId('POLYLINE'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    // # 创建曲线集
    return {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: { Value: this.roundValue(lowerBound) },
      UpperBound: { Value: this.roundValue(upperBound) },
      DetailedGeometricModelElement: [polyLine]
    };
  }
  
  /**
   * 创建圆形曲线集
   * 
   * @param centerX - 圆心X坐标
   * @param centerY - 圆心Y坐标
   * @param diameter - 直径
   * @param lowerBound - Z轴下界
   * @param upperBound - Z轴上界
   * @returns 圆形曲线集
   */
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
    
    const circle: EDMDCircleCenter = {
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