// ============= src/exporter/builders/base-builder.ts =============

// DESIGN: 基础构建器提供所有构建器共用的功能和模板方法
// REF: IDXv4.5规范第4-6章，特别是2.5D几何表示法
// BUSINESS: 遵循IDXv4.5简化表示法（geometryType属性）
// NOTE: 所有具体构建器应继承此类并实现抽象方法

import { 
  EDMDObject, EDMDLengthProperty, CartesianPoint, 
   ItemType, GlobalUnit, EDMDItem,
  EDMDIdentifier, EDMDCurveSet2D, EDMDPolyLine,
  EDMDCircleCenter, EDMDStratumTechnology, TechnologyType, LayerPurpose,
  EDMDCurve,
  GeometryType
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

// ============= 类型定义增强 =============

/**
 * 详细几何模型元素类型
 * 
 * @remarks
 * 根据IDXv4.5规范第47-48页，支持引用ID或直接定义
 */
export type EDMDDetailedGeometricModelElement = 
  | { 'd2:DetailedGeometricModelElement': string }  // 引用ID
  | { 'd2:Line'?: any }                            // 直接定义线
  | { 'd2:PolyLine'?: any }                        // 直接定义多边形
  | { 'd2:Circle'?: any }                          // 直接定义圆
  | string;                                        // 简单ID引用

/**
 * 验证结果接口增强
 * 
 * @remarks
 * 增加更详细的验证信息和上下文
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  warnings: string[];
  errors: string[];
  /** 验证阶段信息 */
  stage?: 'input' | 'geometry' | 'constraints';
  /** 验证时间戳 */
  timestamp?: string;
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
  
  // ## ID生成计数器
  private idCounters: Map<string, number> = new Map();
  
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
    }, this);
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
        throw new ValidationError(errorMsg, validation.errors, {
          stage: 'input',
          timestamp: new Date().toISOString()
        });
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
        { 
          originalError: error instanceof Error ? error : undefined, 
          input,
          stage: 'construct',
          timestamp: new Date().toISOString()
        }
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
   * 生成确定性ID
   * 
   * @remarks
   * 使用计数器生成可预测的ID，便于测试和调试
   * DESIGN: 避免使用随机数，确保ID的可重现性
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
    
    // 使用计数器而不是随机数
    const counterKey = identifier ? `${type}_${identifier}` : type;
    const currentCount = this.idCounters.get(counterKey) || 0;
    const nextCount = currentCount + 1;
    this.idCounters.set(counterKey, nextCount);
    
    if (identifier) {
      return `${prefix}_${identifier}_${nextCount.toString().padStart(3, '0')}`;
    }
    
    return `${prefix}_${nextCount.toString().padStart(3, '0')}`;
  }
  
  /**
   * 生成确定性几何ID
   * 
   * @remarks
   * 为几何元素生成可预测的ID
   * 
   * @param prefix - ID前缀
   * @param seed - 可选种子值
   * @returns 几何元素ID
   */
  protected generateGeometryId(prefix: string, seed?: string): string {
    const counterKey = seed ? `${prefix}_${seed}` : prefix;
    const currentCount = this.idCounters.get(counterKey) || 0;
    const nextCount = currentCount + 1;
    this.idCounters.set(counterKey, nextCount);
    
    return seed ? `${prefix}_${seed}_${nextCount}` : `${prefix}_${nextCount}`;
  }
  
  /**
   * 获取缓存的形状
   * 
   * @remarks
   * 实现形状缓存机制，避免重复创建相同的几何
   * PERFORMANCE: 大幅提升包含重复几何的PCB构建性能
   * 
   * @param cacheKey - 缓存键
   * @param factory - 形状创建工厂函数
   * @returns 缓存或新创建的形状
   */
  protected getCachedShape<T>(cacheKey: string, factory: () => T): T {
    if (this.shapeCache.has(cacheKey)) {
      this.context.addWarning('CACHE_HIT', `使用缓存的形状: ${cacheKey}`);
      return this.shapeCache.get(cacheKey);
    }
    
    const shape = factory();
    this.shapeCache.set(cacheKey, shape);
    return shape;
  }
  
  /**
   * 生成缓存键
   * 
   * @remarks
   * 根据类型和参数生成唯一的缓存键
   * 
   * @param type - 形状类型
   * @param params - 参数对象
   * @returns 缓存键字符串
   */
  protected generateCacheKey(type: string, params: Record<string, any>): string {
    // 对参数键进行排序，确保缓存键的一致性
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('|');
    return `${type}:${sortedParams}`;
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
    geometryType?: GeometryType,
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
   * REF: IDXv4.5规范第47-48页，曲线集结构
   * DESIGN: 修正协议符合性问题，使用正确的元素结构
   * 
   * @param lowerBound - Z轴下界
   * @param upperBound - Z轴上界
   * @param curves - 2D曲线数组或ID引用
   * @returns EDMDCurveSet2D对象
   */
  protected createCurveSet2D(
    lowerBound: number,
    upperBound: number,
    curves: Array<EDMDCurve | string>
  ): EDMDCurveSet2D {
    // # 验证Z轴范围
    const zValidation = GeometryValidator.validateZRange(lowerBound, upperBound);
    if (!zValidation.valid) {
      throw new ValidationError(`曲线集Z轴范围验证失败: ${zValidation.errors.join(', ')}`, zValidation.errors, {
        stage: 'geometry'
      });
    }
    
    return {
      id: this.generateGeometryId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel' as const, // 使用字面量类型
      LowerBound: this.createLengthProperty(lowerBound),
      UpperBound: this.createLengthProperty(upperBound),
      DetailedGeometricModelElement: curves
    };
  }
  
  /**
   * 创建地层技术对象
   * 
   * @remarks
   * 根据IDXv4.5规范第51页表4，为复杂板子创建StratumTechnology
   * DESIGN: 修正协议符合性问题，添加缺失的StratumTechnology对象
   * 
   * @param technologyType - 技术类型
   * @param layerPurpose - 层目的
   * @returns EDMDStratumTechnology对象
   */
  protected createStratumTechnology(
    technologyType: TechnologyType = TechnologyType.DESIGN,
    layerPurpose: LayerPurpose = LayerPurpose.OTHERSIGNAL
  ): EDMDStratumTechnology {
    return {
      id: this.generateGeometryId('STRATUM_TECH'),
      TechnologyType: technologyType,
      LayerPurpose: layerPurpose
    };
  }
  
  // TODO(构建器负责人): 2024-03-20 添加形状缓存机制 [P1-IMPORTANT]
  // FIXME(构建器负责人): 2024-03-15 处理大型曲线集时的内存问题 [P0-URGENT]
  
  // ============= 测试支持方法 =============
  
  /**
   * 清除缓存（测试用）
   * 
   * @remarks
   * 用于测试时清理缓存状态
   */
  protected clearCaches(): void {
    this.shapeCache.clear();
    this.itemCache.clear();
    this.idCounters.clear();
  }
  
  /**
   * 获取缓存统计信息（测试用）
   * 
   * @returns 缓存统计信息
   */
  protected getCacheStats(): {
    shapeCache: number;
    itemCache: number;
    idCounters: number;
  } {
    return {
      shapeCache: this.shapeCache.size,
      itemCache: this.itemCache.size,
      idCounters: this.idCounters.size
    };
  }
  
  /**
   * 设置ID计数器（测试用）
   * 
   * @param type - 类型
   * @param count - 计数值
   */
  protected setIdCounter(type: string, count: number): void {
    this.idCounters.set(type, count);
  }
}

// ============= 增强的错误类型 =============

/**
 * 构建器验证错误
 * 
 * @remarks
 * 用于表示输入数据验证失败，包含详细的上下文信息
 */
export class ValidationError extends Error {
  constructor(
    message: string, 
    public validationErrors?: string[],
    public context?: {
      stage?: 'input' | 'geometry' | 'constraints';
      itemId?: string;
      timestamp?: string;
    }
  ) {
    super(message);
    this.name = 'ValidationError';
    
    // 添加时间戳
    if (this.context) {
      this.context.timestamp = new Date().toISOString();
    }
  }
  
  /** 转换为JSON格式，便于日志记录 */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      validationErrors: this.validationErrors,
      context: this.context,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 构建器构建错误
 * 
 * @remarks
 * 用于表示构建过程中发生的错误，包含丰富的上下文信息
 */
export class BuildError extends Error {
  constructor(
    message: string, 
    public context?: { 
      originalError?: Error; 
      input?: any;
      stage?: 'validation' | 'preprocess' | 'construct' | 'postprocess';
      itemId?: string;
      geometryType?: string;
      timestamp?: string;
    }
  ) {
    super(message);
    this.name = 'BuildError';
    
    // 添加时间戳
    if (this.context) {
      this.context.timestamp = new Date().toISOString();
    }
    
    // 保留堆栈跟踪
    if (this.context?.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${this.context.originalError.stack}`;
    }
  }
  
  /** 转换为JSON格式，便于日志记录 */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stage: this.context?.stage,
      itemId: this.context?.itemId,
      geometryType: this.context?.geometryType,
      timestamp: this.context?.timestamp || new Date().toISOString()
    };
  }
}

// ============= 单位转换工具类 =============

/**
 * 单位转换工具类
 * 
 * @remarks
 * 支持IDX协议中的所有标准单位转换
 * REF: IDXv4.5规范第40页，全局单位定义
 */
export class UnitConverter {
  /** 单位转换因子（以毫米为基准） */
  private static readonly CONVERSION_FACTORS: Record<GlobalUnit, number> = {
    [GlobalUnit.UNIT_MM]: 1,
    [GlobalUnit.UNIT_CM]: 10,
    [GlobalUnit.UNIT_INCH]: 25.4,
    [GlobalUnit.UNIT_MIL]: 0.0254
  };
  
  /** 单位符号映射 */
  private static readonly UNIT_SYMBOLS: Record<GlobalUnit, string> = {
    [GlobalUnit.UNIT_MM]: 'mm',
    [GlobalUnit.UNIT_CM]: 'cm',
    [GlobalUnit.UNIT_INCH]: 'in',
    [GlobalUnit.UNIT_MIL]: 'mil'
  };
  
  /**
   * 单位转换
   * 
   * @param value - 原始值
   * @param fromUnit - 源单位
   * @param toUnit - 目标单位
   * @returns 转换后的值
   * 
   * @throws {Error} 不支持的单位转换
   */
  static convert(value: number, fromUnit: GlobalUnit, toUnit: GlobalUnit): number {
    if (!this.CONVERSION_FACTORS[fromUnit] || !this.CONVERSION_FACTORS[toUnit]) {
      throw new Error(`不支持的单位转换: ${fromUnit} -> ${toUnit}`);
    }
    
    // 先转换为毫米，再转换为目标单位
    const valueInMM = value * this.CONVERSION_FACTORS[fromUnit];
    return valueInMM / this.CONVERSION_FACTORS[toUnit];
  }
  
  /**
   * 标准化为毫米
   * 
   * @param value - 原始值
   * @param unit - 原始单位
   * @returns 毫米值
   */
  static normalizeToMM(value: number, unit: GlobalUnit): number {
    return this.convert(value, unit, GlobalUnit.UNIT_MM);
  }
  
  /**
   * 格式化带单位的字符串
   * 
   * @param value - 数值
   * @param unit - 单位
   * @returns 格式化字符串
   */
  static formatWithUnit(value: number, unit: GlobalUnit): string {
    return `${value}${this.UNIT_SYMBOLS[unit]}`;
  }
}

// ============= 几何验证工具类 =============

/**
 * 几何验证工具类
 * 
 * @remarks
 * 提供几何有效性验证功能，确保生成的几何符合IDX规范
 * DESIGN: 静态方法设计，便于测试和复用
 */
export class GeometryValidator {
  /** 最小距离阈值（毫米） */
  private static readonly MIN_DISTANCE = 0.001;
  
  /** 最小面积阈值（平方毫米） */
  private static readonly MIN_AREA = 0.000001;
  
  /**
   * 验证多边形有效性
   * 
   * @param points - 多边形顶点
   * @returns 验证结果
   */
  static validatePolygon(points: CartesianPoint[]): ValidationResult<CartesianPoint[]> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // # 基础验证
    if (points.length < 3) {
      errors.push(`多边形至少需要3个点，当前: ${points.length}`);
      return { valid: false, errors, warnings, stage: 'geometry' };
    }
    
    // # 检查点距（避免过近的点）
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = this.distance(points[i], points[j]);
        if (dist < this.MIN_DISTANCE) {
          warnings.push(`点${i}和点${j}距离过近: ${dist.toFixed(6)}mm`);
        }
      }
    }
    
    // # 检查自相交
    if (this.hasSelfIntersection(points)) {
      errors.push('多边形存在自相交');
    }
    
    // # 检查方向和面积
    const area = this.calculatePolygonArea(points);
    if (Math.abs(area) < this.MIN_AREA) {
      errors.push(`多边形面积过小: ${area.toFixed(9)}mm²`);
    } else if (area < 0) {
      warnings.push('多边形为顺时针方向，建议使用逆时针方向');
    }
    
    return { 
      valid: errors.length === 0, 
      data: errors.length === 0 ? points : undefined,
      errors, 
      warnings, 
      stage: 'geometry',
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 验证Z轴范围
   * 
   * @param lowerBound - 下界
   * @param upperBound - 上界
   * @returns 验证结果
   */
  static validateZRange(lowerBound: number, upperBound: number): ValidationResult<{lowerBound: number, upperBound: number}> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (lowerBound > upperBound) {
      errors.push(`Z轴下界(${lowerBound})大于上界(${upperBound})`);
    }
    
    const thickness = upperBound - lowerBound;
    if (thickness < 0.001) {
      errors.push(`Z轴范围过小(${thickness}mm)，可能导致几何无效`);
    }
    
    if (thickness > 100) {
      warnings.push(`Z轴范围异常大(${thickness}mm)，请确认是否正确`);
    }
    
    return { 
      valid: errors.length === 0,
      data: errors.length === 0 ? { lowerBound, upperBound } : undefined,
      errors, 
      warnings,
      stage: 'geometry'
    };
  }
  
  /**
   * 计算两点间距离
   */
  private static distance(p1: CartesianPoint, p2: CartesianPoint): number {
    const dx = p2.X - p1.X;
    const dy = p2.Y - p1.Y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * 检查多边形自相交
   * 
   * @remarks
   * 使用简化的线段相交检测算法
   */
  private static hasSelfIntersection(points: CartesianPoint[]): boolean {
    // 简化实现：检查相邻边是否相交
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      for (let j = i + 2; j < points.length; j++) {
        if (j === points.length - 1 && i === 0) continue; // 跳过首尾相邻
        
        const p3 = points[j];
        const p4 = points[(j + 1) % points.length];
        
        if (this.lineSegmentsIntersect(p1, p2, p3, p4)) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * 检查两线段是否相交
   */
  private static lineSegmentsIntersect(
    p1: CartesianPoint, p2: CartesianPoint,
    p3: CartesianPoint, p4: CartesianPoint
  ): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);
    
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 计算方向
   */
  private static direction(pi: CartesianPoint, pj: CartesianPoint, pk: CartesianPoint): number {
    return (pk.X - pi.X) * (pj.Y - pi.Y) - (pj.X - pi.X) * (pk.Y - pi.Y);
  }
  
  /**
   * 计算多边形面积（有符号面积）
   */
  private static calculatePolygonArea(points: CartesianPoint[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].X * points[j].Y - points[j].X * points[i].Y;
    }
    return area / 2;
  }
}

// ============= 几何工具类 =============
/**
 * 几何处理工具类
 * 
 * @remarks
 * 提供2.5D几何相关的计算和转换功能
 * PERFORMANCE: 几何计算可能复杂，注意性能优化
 * DESIGN: 集成缓存和验证机制，提升可靠性
 */
export class GeometryUtils {
  constructor(
    private config: { defaultUnit: GlobalUnit; precision: number },
    private builder: BaseBuilder<any, any>
  ) {}
  
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
   * 创建矩形边界框曲线集（带缓存）
   * 
   * @remarks
   * 用于快速创建组件的2.5D几何表示
   * PERFORMANCE: 使用缓存避免重复创建相同尺寸的矩形
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
    // # 生成缓存键
    const cacheKey = (this.builder as any).generateCacheKey('BBOX', {
      width: this.roundValue(width),
      height: this.roundValue(height),
      thickness: this.roundValue(thickness),
      zPosition: this.roundValue(zPosition)
    });
    
    // # 使用缓存
    return (this.builder as any).getCachedShape(cacheKey, () => {
      // ## 计算Z轴范围
      const lowerBound = zPosition;
      const upperBound = zPosition + thickness;
      
      // ## 创建矩形轮廓点
      const points: CartesianPoint[] = [
        { id: (this.builder as any).generateGeometryId('PT', 'BBOX_1'), X: 0, Y: 0 },
        { id: (this.builder as any).generateGeometryId('PT', 'BBOX_2'), X: this.roundValue(width), Y: 0 },
        { id: (this.builder as any).generateGeometryId('PT', 'BBOX_3'), X: this.roundValue(width), Y: this.roundValue(height) },
        { id: (this.builder as any).generateGeometryId('PT', 'BBOX_4'), X: 0, Y: this.roundValue(height) }
      ];
      
      // ## 验证多边形
      const validation = GeometryValidator.validatePolygon(points);
      if (!validation.valid) {
        throw new ValidationError(`矩形边界框验证失败: ${validation.errors.join(', ')}`, validation.errors, {
          stage: 'geometry'
        });
      }
      
      // ## 创建多边形曲线
      const polyLine: EDMDPolyLine = {
        id: (this.builder as any).generateGeometryId('POLYLINE', 'BBOX'),
        curveType: 'EDMDPolyLine',
        Points: points,
        Closed: true
      };
      
      // ## 创建曲线集
      return (this.builder as any).createCurveSet2D(lowerBound, upperBound, [polyLine.id]);
    });
  }
  
  /**
   * 创建圆形曲线集（带缓存和验证）
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
    // # 参数验证
    if (diameter <= 0) {
      throw new ValidationError(`圆形直径必须大于0: ${diameter}`);
    }
    
    // # 生成缓存键
    const cacheKey = (this.builder as any).generateCacheKey('CIRCLE', {
      centerX: this.roundValue(centerX),
      centerY: this.roundValue(centerY),
      diameter: this.roundValue(diameter),
      lowerBound: this.roundValue(lowerBound),
      upperBound: this.roundValue(upperBound)
    });
    
    // # 使用缓存
    return (this.builder as any).getCachedShape(cacheKey, () => {
      const centerPoint: CartesianPoint = {
        id: (this.builder as any).generateGeometryId('PT', 'CIRCLE_CENTER'),
        X: this.roundValue(centerX),
        Y: this.roundValue(centerY)
      };
      
      const circle: EDMDCircleCenter = {
        id: (this.builder as any).generateGeometryId('CIRCLE'),
        curveType: 'EDMDCircleCenter',
        CenterPoint: centerPoint,
        Diameter: { Value: this.roundValue(diameter) }
      };
      
      return (this.builder as any).createCurveSet2D(lowerBound, upperBound, [circle.id]);
    });
  }
}