// ============= src/exporter/builders/layer-builder.ts =============

// # 层构建器
// DESIGN: 支持PCB层的2.5D几何表示，包括信号层、电源层、阻焊层等
// REF: IDXv4.5规范第6.1节，层和地层定义
// BUSINESS: 层是PCB的基础结构，必须准确表示厚度、材料和电气属性

import { 
  BaseBuilder, BuilderConfig, BuilderContext, BuildError, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, GeometryType,
  EDMDShapeElement, ShapeElementType,
  EDMDCurveSet2D, CartesianPoint, EDMDPolyLine,
  EDMDTransformation2D, EDMDLengthProperty,
  EDMDUserSimpleProperty, LayerPurpose
} from '../../types/core';
import { 
  LayerData, LayerType, LayerStackupData, LayerStackupEntry,
  calculateStackupThickness, getLayerZPosition 
} from '../../types/data-models';
import { LayerStackupBuilder, LayerStackupData as StackupBuilderData } from './layer-stackup-builder';

// # 处理后的层数据类型定义
/**
 * 处理后的层数据
 * 
 * @remarks
 * 包含计算后的几何类型和标准化属性
 */
interface ProcessedLayerData {
  id: string;
  name: string;
  type: LayerType;
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  lossTangent?: number;
  surfaceFinish?: string;
  color?: string;
  visible?: boolean;
  properties?: Record<string, any>;
  
  // 处理后的属性
  processedId: string;
  normalizedType: GeometryType;
  layerPurpose: LayerPurpose;
}

// # 层叠结构处理输入接口
/**
 * 层叠结构处理输入
 * 
 * @remarks
 * 包含层数据和可选的层叠结构定义
 */
export interface LayerStackupInput {
  /** 层数据数组 */
  layers: LayerData[];
  /** 可选的层叠结构定义 */
  layerStackup?: LayerStackupData;
}

/**
 * 处理后的层叠结构数据
 * 
 * @remarks
 * 包含验证后的层叠结构和计算的Z位置信息
 */
interface ProcessedLayerStackupData {
  id: string;
  name: string;
  totalThickness: number;
  layers: ProcessedLayerStackupEntry[];
  processedId: string;
  layerZPositions: Map<string, number>;
}

/**
 * 处理后的层叠结构条目
 */
interface ProcessedLayerStackupEntry {
  layerId: string;
  position: number;
  thickness: number;
  material?: string;
  zPosition: number;
  layerExists: boolean;
}

// ============= 层构建器类 =============
/**
 * 层构建器
 * 
 * @remarks
 * 负责构建PCB层的EDMDItem表示，支持各种层类型和材料属性
 * DESIGN: 层使用简化表示法，通过geometryType属性标识层类型
 * PERFORMANCE: 层数量通常较少（2-20层），构建效率不是主要考虑
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 构建信号层
 * const builder = new LayerBuilder(config, context);
 * const layerItems = await builder.build([layerData]);
 * // 返回: 包含层几何和属性的EDMDItem数组
 * ```
 */
export class LayerBuilder extends BaseBuilder<LayerData[], EDMDItem[]> {
  
  private layerStackupBuilder: LayerStackupBuilder;
  
  constructor(config: BuilderConfig, context: BuilderContext) {
    super(config, context);
    this.layerStackupBuilder = new LayerStackupBuilder();
  }
  
  // ============= 输入验证 =============
  /**
   * 验证层数据数组
   * 
   * @remarks
   * BUSINESS: 层必须有有效的ID、名称、类型和厚度信息
   * SECURITY: 防止无效层数据破坏PCB结构
   * 
   * @param input - 层数据数组
   * @returns 验证结果
   * 
   * @testCase 有效层数据数组
   * @testInput 包含ID、名称、有效类型和正数厚度的层数组
   * @testExpected 验证通过
   * @testCase 空数组
   * @testInput 空的层数据数组
   * @testExpected 验证通过（允许无层定义）
   * @testCase 无效层ID
   * @testInput 层ID为空或重复
   * @testExpected 验证失败，返回错误信息
   * @testCase 无效厚度
   * @testInput 层厚度为0或负数
   * @testExpected 验证失败，返回错误信息
   */
  protected validateInput(input: LayerData[]): ValidationResult<LayerData[]> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // ============= 基础验证 =============
    if (!Array.isArray(input)) {
      errors.push('层数据必须是数组');
      return { valid: false, errors, warnings };
    }
    
    // 空数组是有效的（允许无层定义）
    if (input.length === 0) {
      warnings.push('层数据数组为空，将不生成任何层定义');
      return { valid: true, data: input, errors, warnings };
    }
    
    // ============= 层ID唯一性验证 =============
    const layerIds = new Set<string>();
    const layerNames = new Set<string>();
    
    for (let i = 0; i < input.length; i++) {
      const layer = input[i];
      const layerIndex = `[${i}]`;
      
      // # ID验证
      if (!layer.id || layer.id.trim().length === 0) {
        errors.push(`层${layerIndex}的ID不能为空`);
        continue;
      }
      
      if (layerIds.has(layer.id)) {
        errors.push(`层ID重复: ${layer.id}`);
      } else {
        layerIds.add(layer.id);
      }
      
      // # 名称验证
      if (!layer.name || layer.name.trim().length === 0) {
        errors.push(`层${layerIndex}(${layer.id})的名称不能为空`);
      } else if (layerNames.has(layer.name)) {
        warnings.push(`层名称重复: ${layer.name}，可能导致混淆`);
      } else {
        layerNames.add(layer.name);
      }
      
      // # 类型验证
      if (!layer.type) {
        errors.push(`层${layerIndex}(${layer.id})的类型不能为空`);
      } else if (!Object.values(LayerType).includes(layer.type)) {
        errors.push(`层${layerIndex}(${layer.id})的类型无效: ${layer.type}`);
      }
      
      // # 厚度验证
      if (typeof layer.thickness !== 'number') {
        errors.push(`层${layerIndex}(${layer.id})的厚度必须是数字`);
      } else if (layer.thickness <= 0) {
        errors.push(`层${layerIndex}(${layer.id})的厚度必须大于0，当前: ${layer.thickness}`);
      } else if (layer.thickness > 10) {
        warnings.push(`层${layerIndex}(${layer.id})的厚度异常大: ${layer.thickness}mm，请确认是否正确`);
      }
      
      // # 材料属性验证
      if (layer.copperWeight !== undefined) {
        if (typeof layer.copperWeight !== 'number' || layer.copperWeight <= 0) {
          errors.push(`层${layerIndex}(${layer.id})的铜重量必须是正数: ${layer.copperWeight}`);
        }
        
        // 检查铜重量是否适用于该层类型
        if (layer.type !== LayerType.SIGNAL && layer.type !== LayerType.PLANE && layer.type !== LayerType.OTHERSIGNAL) {
          warnings.push(`层${layerIndex}(${layer.id})类型为${layer.type}，通常不需要铜重量属性`);
        }
      }
      
      if (layer.dielectricConstant !== undefined) {
        if (typeof layer.dielectricConstant !== 'number' || layer.dielectricConstant <= 1) {
          errors.push(`层${layerIndex}(${layer.id})的介电常数必须大于1: ${layer.dielectricConstant}`);
        }
        
        // 检查介电常数是否适用于该层类型
        if (layer.type !== LayerType.DIELECTRIC) {
          warnings.push(`层${layerIndex}(${layer.id})类型为${layer.type}，通常不需要介电常数属性`);
        }
      }
      
      if (layer.lossTangent !== undefined) {
        if (typeof layer.lossTangent !== 'number' || layer.lossTangent < 0 || layer.lossTangent > 1) {
          errors.push(`层${layerIndex}(${layer.id})的损耗角正切必须在0-1之间: ${layer.lossTangent}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? input : undefined,
      warnings,
      errors
    };
  }
  
  // ============= 层叠结构验证 =============
  /**
   * 验证层叠结构输入数据
   * 
   * @remarks
   * BUSINESS: 层叠结构必须引用有效的层，并且位置和厚度信息一致
   * SECURITY: 防止无效的层叠结构定义导致错误的PCB表示
   * 
   * @param input - 层叠结构输入数据
   * @returns 验证结果
   */
  validateLayerStackupInput(input: LayerStackupInput): ValidationResult<LayerStackupInput> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // 首先验证层数据
    const layerValidation = this.validateInput(input.layers);
    errors.push(...layerValidation.errors);
    warnings.push(...layerValidation.warnings);
    
    // 如果没有层叠结构定义，只验证层数据
    if (!input.layerStackup) {
      return {
        valid: errors.length === 0,
        data: errors.length === 0 ? input : undefined,
        warnings,
        errors
      };
    }
    
    const stackup = input.layerStackup;
    
    // ============= 层叠结构基础验证 =============
    if (!stackup.id || stackup.id.trim().length === 0) {
      errors.push('层叠结构ID不能为空');
    }
    
    if (!stackup.name || stackup.name.trim().length === 0) {
      errors.push('层叠结构名称不能为空');
    }
    
    if (!stackup.layers || !Array.isArray(stackup.layers) || stackup.layers.length === 0) {
      errors.push('层叠结构必须包含至少一个层定义');
      return { valid: false, errors, warnings };
    }
    
    // ============= 层叠结构条目验证 =============
    const layerIds = new Set(input.layers.map(l => l.id));
    const stackupPositions = new Set<number>();
    let calculatedThickness = 0;
    
    for (let i = 0; i < stackup.layers.length; i++) {
      const entry = stackup.layers[i];
      const entryIndex = `[${i}]`;
      
      // 验证层ID引用
      if (!entry.layerId || entry.layerId.trim().length === 0) {
        errors.push(`层叠结构条目${entryIndex}的layerId不能为空`);
        continue;
      }
      
      if (!layerIds.has(entry.layerId)) {
        errors.push(`层叠结构条目${entryIndex}引用了不存在的层: ${entry.layerId}`);
      }
      
      // 验证位置
      if (typeof entry.position !== 'number' || entry.position < 1) {
        errors.push(`层叠结构条目${entryIndex}的位置必须是大于0的整数: ${entry.position}`);
      } else if (stackupPositions.has(entry.position)) {
        errors.push(`层叠结构条目${entryIndex}的位置重复: ${entry.position}`);
      } else {
        stackupPositions.add(entry.position);
      }
      
      // 验证厚度
      if (typeof entry.thickness !== 'number' || entry.thickness <= 0) {
        errors.push(`层叠结构条目${entryIndex}的厚度必须是正数: ${entry.thickness}`);
      } else {
        calculatedThickness += entry.thickness;
      }
      
      // 检查厚度一致性（如果层数据中也定义了厚度）
      const referencedLayer = input.layers.find(l => l.id === entry.layerId);
      if (referencedLayer && Math.abs(referencedLayer.thickness - entry.thickness) > 0.001) {
        warnings.push(`层叠结构条目${entryIndex}的厚度(${entry.thickness})与层定义中的厚度(${referencedLayer.thickness})不一致`);
      }
    }
    
    // ============= 总厚度验证 =============
    if (stackup.totalThickness !== undefined) {
      if (typeof stackup.totalThickness !== 'number' || stackup.totalThickness <= 0) {
        errors.push(`层叠结构总厚度必须是正数: ${stackup.totalThickness}`);
      } else if (Math.abs(stackup.totalThickness - calculatedThickness) > 0.001) {
        warnings.push(`层叠结构声明的总厚度(${stackup.totalThickness})与计算的总厚度(${calculatedThickness})不一致`);
      }
    }
    
    // ============= 位置连续性验证 =============
    const sortedPositions = Array.from(stackupPositions).sort((a, b) => a - b);
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i] !== i + 1) {
        warnings.push(`层叠结构位置不连续，期望位置${i + 1}，实际位置${sortedPositions[i]}`);
        break;
      }
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? input : undefined,
      warnings,
      errors
    };
  }
  
  // ============= 数据预处理 =============
  /**
   * 预处理层数据
   * 
   * @remarks
   * 标准化层类型，生成处理ID，确定几何类型
   * BUSINESS: 不同层类型需要映射到对应的IDX几何类型
   * 
   * @param input - 验证后的层数据数组
   * @returns 处理后的层数据数组
   */
  protected async preProcess(input: LayerData[]): Promise<ProcessedLayerData[]> {
    return input.map((layer) => {
      // # 生成处理ID
      const processedId = this.generateItemId('LAYER', layer.id);
      
      // # 标准化层类型到IDX几何类型
      const normalizedType = this.normalizeLayerType(layer.type);
      
      // # 确定层目的
      const layerPurpose = this.determineLayerPurpose(layer.type);
      
      return {
        ...layer,
        processedId,
        normalizedType,
        layerPurpose,
        // 确保可见性默认值
        visible: layer.visible !== undefined ? layer.visible : true
      };
    });
  }
  
  // ============= 层叠结构预处理 =============
  /**
   * 预处理层叠结构数据
   * 
   * @remarks
   * 计算Z位置，验证层引用，生成处理后的层叠结构
   * BUSINESS: 层叠结构定义了PCB的物理层次和厚度分布
   * 
   * @param stackup - 层叠结构数据
   * @param layers - 层数据数组
   * @returns 处理后的层叠结构数据
   */
  private async processLayerStackup(
    stackup: LayerStackupData, 
    layers: LayerData[]
  ): Promise<ProcessedLayerStackupData> {
    // 创建层ID到层数据的映射
    const layerMap = new Map(layers.map(layer => [layer.id, layer]));
    
    // 按位置排序层叠结构条目
    const sortedEntries = [...stackup.layers].sort((a, b) => a.position - b.position);
    
    // 计算Z位置和处理条目
    const processedEntries: ProcessedLayerStackupEntry[] = [];
    const layerZPositions = new Map<string, number>();
    let currentZ = 0;
    
    for (const entry of sortedEntries) {
      const layerExists = layerMap.has(entry.layerId);
      const zPosition = currentZ + entry.thickness / 2; // 层中心的Z位置
      
      processedEntries.push({
        layerId: entry.layerId,
        position: entry.position,
        thickness: entry.thickness,
        material: entry.material,
        zPosition,
        layerExists
      });
      
      layerZPositions.set(entry.layerId, zPosition);
      currentZ += entry.thickness;
    }
    
    // 计算或使用提供的总厚度
    const calculatedThickness = calculateStackupThickness(stackup);
    const totalThickness = stackup.totalThickness || calculatedThickness;
    
    return {
      id: stackup.id,
      name: stackup.name,
      totalThickness,
      layers: processedEntries,
      processedId: this.generateItemId('STACKUP', stackup.id),
      layerZPositions
    };
  }
  
  // ============= 层叠结构构建方法 =============
  /**
   * 构建层叠结构和层数据
   * 
   * @remarks
   * 支持同时处理层数据和层叠结构，确保一致性
   * BUSINESS: 层叠结构是多层PCB设计的核心，必须准确表示
   * 
   * @param input - 层叠结构输入数据
   * @returns 构建的EDMDItem数组
   */
  async buildWithStackup(input: LayerStackupInput): Promise<EDMDItem[]> {
    // 验证输入
    const validation = this.validateLayerStackupInput(input);
    if (!validation.valid) {
      const errorMsg = `层叠结构验证失败: ${validation.errors.join(', ')}`;
      this.context.addError('STACKUP_VALIDATION_FAILED', errorMsg);
      throw new Error(errorMsg);
    }
    
    // 输出验证警告
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        this.context.addWarning('STACKUP_VALIDATION_WARNING', warning);
      });
    }
    
    const items: EDMDItem[] = [];
    
    // 预处理层数据
    const processedLayers = await this.preProcess(input.layers);
    
    // 构建层项目
    for (const layer of processedLayers) {
      const layerItem = await this.createLayerItem(layer);
      
      // 如果有层叠结构，添加Z位置信息
      if (input.layerStackup) {
        const processedStackup = await this.processLayerStackup(input.layerStackup, input.layers);
        const zPosition = processedStackup.layerZPositions.get(layer.id);
        
        if (zPosition !== undefined) {
          // 添加Z位置属性
          layerItem.UserProperties = layerItem.UserProperties || [];
          layerItem.UserProperties.push({
            Key: {
              SystemScope: this.config.creatorSystem,
              ObjectName: 'Z_POSITION'
            },
            Value: zPosition.toString()
          });
          
          // 添加层叠结构引用
          layerItem.UserProperties.push({
            Key: {
              SystemScope: this.config.creatorSystem,
              ObjectName: 'STACKUP_REFERENCE'
            },
            Value: input.layerStackup.id
          });
        }
      }
      
      items.push(layerItem);
    }
    
    // 如果有层叠结构定义，创建层叠结构项目
    if (input.layerStackup) {
      const processedStackup = await this.processLayerStackup(input.layerStackup, input.layers);
      
      // 使用 LayerStackupBuilder 创建层叠结构
      const stackupBuilderData: StackupBuilderData = {
        id: processedStackup.id,
        name: processedStackup.name,
        identifier: this.createIdentifier('STACKUP', processedStackup.id),
        layers: processedStackup.layers.map((layer, index) => ({
          instanceId: `${processedStackup.processedId}_LAYER_${index + 1}_INSTANCE`,
          layerItemId: layer.layerId,
          layerName: layer.layerId,
          position: layer.position - 1, // 转换为0-based索引
          thickness: layer.thickness,
          lowerBound: layer.zPosition - layer.thickness / 2,
          upperBound: layer.zPosition + layer.thickness / 2,
          material: layer.material,
          layerType: 'LAYER'
        })),
        totalThickness: processedStackup.totalThickness,
        userProperties: this.createStackupProperties(processedStackup),
        baseline: true
      };
      
      // 构建层叠结构
      const layerStackupStructure = this.layerStackupBuilder.buildLayerStackup(stackupBuilderData);
      
      // 添加层叠结构 Item 到结果中
      items.push(layerStackupStructure.stackupItem);
      
      // 记录层叠结构构建信息
      this.context.addWarning('LAYER_STACKUP_BUILT',
        `层叠结构构建完成: ${layerStackupStructure.stackupItem.Name}, 包含${layerStackupStructure.layerInstances.length}个层实例`);
    }
    
    return items;
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建层EDMDItem数组
   * 
   * @remarks
   * DESIGN: 每个层作为单独的EDMDItem，使用简化表示法
   * BUSINESS: 层定义PCB的物理结构和电气特性
   * 
   * @param processedData - 处理后的层数据数组
   * @returns 层EDMDItem数组
   */
  protected async construct(processedData: ProcessedLayerData[]): Promise<EDMDItem[]> {
    const items: EDMDItem[] = [];
    
    for (const layer of processedData) {
      const item = await this.createLayerItem(layer);
      items.push(item);
    }
    
    return items;
  }
  
  // ============= 后处理 =============
  /**
   * 后处理层项目数组
   * 
   * @param output - 构建的层项目数组
   * @returns 验证后的层项目数组
   */
  protected async postProcess(output: EDMDItem[]): Promise<EDMDItem[]> {
    // # 验证基本结构
    for (const item of output) {
      if (!item.geometryType) {
        this.context.addWarning('LAYER_MISSING_GEOMETRY_TYPE',
          `层${item.id}缺少几何类型定义`);
      }
      
      if (!item.UserProperties || item.UserProperties.length === 0) {
        this.context.addWarning('LAYER_MISSING_PROPERTIES',
          `层${item.id}缺少用户属性`);
      }
    }
    
    // # 记录构建统计
    this.context.addWarning('LAYERS_BUILT',
      `层构建完成: 共${output.length}个层`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 创建单个层项目
   * 
   * @param layer - 处理后的层数据
   * @returns 层EDMDItem
   */
  private async createLayerItem(layer: ProcessedLayerData): Promise<EDMDItem> {
    // # 创建基础项目结构
    // 根据需求 6.2：层应该使用 ItemType="assembly" 而不是 ItemType="single"
    const baseItem = this.createBaseItem(
      ItemType.ASSEMBLY,
      layer.normalizedType,
      layer.name,
      this.getLayerDescription(layer)
    );
    
    const layerItem: EDMDItem = {
      id: layer.processedId,
      ItemType: ItemType.ASSEMBLY,
      ...baseItem,
      Identifier: this.createIdentifier('LAYER', layer.id),
      UserProperties: this.createLayerProperties(layer),
      // 添加 ReferenceName 用于组件的 AssembleToName 引用 - 根据需求 13.4
      ReferenceName: layer.name || layer.id
    };
    
    // # 添加基线标记 - 根据需求 10.1-10.4 使用正确格式
    layerItem.BaseLine = true;
    
    return layerItem;
  }
  
  /**
   * 创建层叠结构项目
   * 
   * @param stackup - 处理后的层叠结构数据
   * @returns 层叠结构EDMDItem
   */
  private async createStackupItem(stackup: ProcessedLayerStackupData): Promise<EDMDItem> {
    // 使用 LayerStackupBuilder 创建层叠结构
    const stackupBuilderData: StackupBuilderData = {
      id: stackup.id,
      name: stackup.name,
      identifier: this.createIdentifier('STACKUP', stackup.id),
      layers: stackup.layers.map((layer, index) => ({
        instanceId: `${stackup.processedId}_LAYER_${index + 1}_INSTANCE`,
        layerItemId: layer.layerId,
        layerName: layer.layerId, // 使用层ID作为名称
        position: layer.position - 1, // 转换为0-based索引
        thickness: layer.thickness,
        lowerBound: layer.zPosition - layer.thickness / 2,
        upperBound: layer.zPosition + layer.thickness / 2,
        material: layer.material,
        layerType: 'LAYER' // 默认层类型
      })),
      totalThickness: stackup.totalThickness,
      userProperties: this.createStackupProperties(stackup),
      baseline: true
    };
    
    // 使用 LayerStackupBuilder 构建层叠结构
    const layerStackupStructure = this.layerStackupBuilder.buildLayerStackup(stackupBuilderData);
    
    // 返回构建的层叠结构 Item
    return layerStackupStructure.stackupItem;
  }
  
  /**
   * 标准化层类型到IDX几何类型
   * 
   * @param layerType - 输入层类型
   * @returns IDX几何类型
   */
  private normalizeLayerType(layerType: LayerType): GeometryType {
    const typeMap: Record<LayerType, GeometryType> = {
      [LayerType.SIGNAL]: GeometryType.LAYER_OTHERSIGNAL,
      [LayerType.PLANE]: GeometryType.LAYER_POWERGROUND,
      [LayerType.SOLDERMASK]: GeometryType.LAYER_SOLDERMASK,
      [LayerType.SILKSCREEN]: GeometryType.LAYER_SILKSCREEN,
      [LayerType.DIELECTRIC]: GeometryType.LAYER_DIELECTRIC,
      [LayerType.OTHERSIGNAL]: GeometryType.LAYER_OTHERSIGNAL
    };
    
    return typeMap[layerType] || GeometryType.LAYER_GENERIC;
  }
  
  /**
   * 确定层目的
   * 
   * @param layerType - 输入层类型
   * @returns 层目的
   */
  private determineLayerPurpose(layerType: LayerType): LayerPurpose {
    const purposeMap: Record<LayerType, LayerPurpose> = {
      [LayerType.SIGNAL]: LayerPurpose.OTHERSIGNAL,
      [LayerType.PLANE]: LayerPurpose.POWERGROUND,
      [LayerType.SOLDERMASK]: LayerPurpose.SOLDERMASK,
      [LayerType.SILKSCREEN]: LayerPurpose.SILKSCREEN,
      [LayerType.DIELECTRIC]: LayerPurpose.DIELECTRIC,
      [LayerType.OTHERSIGNAL]: LayerPurpose.OTHERSIGNAL
    };
    
    return purposeMap[layerType] || LayerPurpose.GENERIC;
  }
  
  /**
   * 创建层用户属性
   * 
   * @param layer - 处理后的层数据
   * @returns 用户属性数组
   */
  private createLayerProperties(layer: ProcessedLayerData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER_ID'
        },
        Value: layer.id
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER_NAME'
        },
        Value: layer.name
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER_TYPE'
        },
        Value: layer.type
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'THICKNESS'
        },
        Value: layer.thickness.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'GEOMETRY_TYPE'
        },
        Value: layer.normalizedType
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER_PURPOSE'
        },
        Value: layer.layerPurpose
      }
    ];
    
    // # 添加材料属性
    if (layer.material) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'MATERIAL'
        },
        Value: layer.material
      });
    }
    
    // # 添加铜重量属性
    if (layer.copperWeight !== undefined) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'COPPER_WEIGHT'
        },
        Value: layer.copperWeight.toString()
      });
      
      // 计算铜厚度（1 oz/ft² ≈ 0.035 mm）
      const copperThickness = layer.copperWeight * 0.035;
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'COPPER_THICKNESS'
        },
        Value: copperThickness.toFixed(4)
      });
    }
    
    // # 添加介电常数属性
    if (layer.dielectricConstant !== undefined) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'DIELECTRIC_CONSTANT'
        },
        Value: layer.dielectricConstant.toString()
      });
    }
    
    // # 添加损耗角正切属性
    if (layer.lossTangent !== undefined) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LOSS_TANGENT'
        },
        Value: layer.lossTangent.toString()
      });
    }
    
    // # 添加表面处理属性
    if (layer.surfaceFinish) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'SURFACE_FINISH'
        },
        Value: layer.surfaceFinish
      });
    }
    
    // # 添加颜色属性
    if (layer.color) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'COLOR'
        },
        Value: layer.color
      });
    }
    
    // # 添加可见性属性
    properties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'VISIBLE'
      },
      Value: layer.visible ? 'true' : 'false'
    });
    
    // # 添加层分类信息
    properties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'LAYER_CATEGORY'
      },
      Value: this.getLayerCategory(layer.type)
    });
    
    // # 添加是否为导电层标记
    properties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'IS_CONDUCTIVE'
      },
      Value: this.isConductive(layer.type) ? 'true' : 'false'
    });
    
    // # 添加扩展属性
    if (layer.properties) {
      for (const [key, value] of Object.entries(layer.properties)) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: `CUSTOM_${key.toUpperCase()}`
          },
          Value: String(value)
        });
      }
    }
    
    return properties;
  }
  
  /**
   * 获取层分类
   * 
   * @param layerType - 层类型
   * @returns 层分类
   */
  private getLayerCategory(layerType: LayerType): string {
    const categories: Record<LayerType, string> = {
      [LayerType.SIGNAL]: 'CONDUCTIVE',
      [LayerType.PLANE]: 'CONDUCTIVE',
      [LayerType.OTHERSIGNAL]: 'CONDUCTIVE',
      [LayerType.SOLDERMASK]: 'PROTECTIVE',
      [LayerType.SILKSCREEN]: 'MARKING',
      [LayerType.DIELECTRIC]: 'INSULATING'
    };
    
    return categories[layerType] || 'OTHER';
  }
  
  /**
   * 判断层是否为导电层
   * 
   * @param layerType - 层类型
   * @returns 是否导电
   */
  private isConductive(layerType: LayerType): boolean {
    return [LayerType.SIGNAL, LayerType.PLANE, LayerType.OTHERSIGNAL].includes(layerType);
  }
  
  /**
   * 获取层类型描述
   * 
   * @param layerType - 层类型
   * @returns 类型描述
   */
  private getLayerTypeDescription(layerType: LayerType): string {
    const descriptions: Record<LayerType, string> = {
      [LayerType.SIGNAL]: '信号层',
      [LayerType.PLANE]: '电源/地平面层',
      [LayerType.SOLDERMASK]: '阻焊层',
      [LayerType.SILKSCREEN]: '丝印层',
      [LayerType.DIELECTRIC]: '介质层',
      [LayerType.OTHERSIGNAL]: '其他信号层'
    };
    
    return descriptions[layerType] || '未知层类型';
  }
  
  /**
   * 获取层描述
   * 
   * @param layer - 处理后的层数据
   * @returns 描述字符串
   */
  private getLayerDescription(layer: ProcessedLayerData): string {
    const typeDesc = this.getLayerTypeDescription(layer.type);
    let desc = `${typeDesc} - ${layer.name}`;
    
    if (layer.material) {
      desc += ` (${layer.material})`;
    }
    
    desc += `, 厚度: ${layer.thickness}mm`;
    
    if (layer.copperWeight) {
      desc += `, 铜重: ${layer.copperWeight}oz`;
    }
    
    if (layer.dielectricConstant) {
      desc += `, εr: ${layer.dielectricConstant}`;
    }
    
    return desc;
  }
  
  /**
   * 创建层叠结构用户属性
   * 
   * @param stackup - 处理后的层叠结构数据
   * @returns 用户属性数组
   */
  private createStackupProperties(stackup: ProcessedLayerStackupData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'STACKUP_ID'
        },
        Value: stackup.id
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'STACKUP_NAME'
        },
        Value: stackup.name
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'TOTAL_THICKNESS'
        },
        Value: stackup.totalThickness.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER_COUNT'
        },
        Value: stackup.layers.length.toString()
      }
    ];
    
    // 添加层序列信息
    const layerSequence = stackup.layers
      .sort((a, b) => a.position - b.position)
      .map(layer => `${layer.layerId}:${layer.thickness}`)
      .join('|');
    
    properties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'LAYER_SEQUENCE'
      },
      Value: layerSequence
    });
    
    // 添加每个层的详细信息
    for (const layer of stackup.layers) {
      const prefix = `LAYER_${layer.position}`;
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: `${prefix}_ID`
        },
        Value: layer.layerId
      });
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: `${prefix}_THICKNESS`
        },
        Value: layer.thickness.toString()
      });
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: `${prefix}_Z_POSITION`
        },
        Value: layer.zPosition.toString()
      });
      
      if (layer.material) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: `${prefix}_MATERIAL`
          },
          Value: layer.material
        });
      }
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: `${prefix}_EXISTS`
        },
        Value: layer.layerExists ? 'true' : 'false'
      });
    }
    
    return properties;
  }
  
  /**
   * 获取层叠结构描述
   * 
   * @param stackup - 处理后的层叠结构数据
   * @returns 描述字符串
   */
  private getStackupDescription(stackup: ProcessedLayerStackupData): string {
    const layerCount = stackup.layers.length;
    const thickness = stackup.totalThickness;
    
    let desc = `${layerCount}层PCB层叠结构 - ${stackup.name}`;
    desc += `, 总厚度: ${thickness}mm`;
    
    // 添加层类型统计
    const layerTypes = new Map<string, number>();
    for (const layer of stackup.layers) {
      const count = layerTypes.get(layer.material || 'Unknown') || 0;
      layerTypes.set(layer.material || 'Unknown', count + 1);
    }
    
    if (layerTypes.size > 0) {
      const typeDesc = Array.from(layerTypes.entries())
        .map(([material, count]) => `${material}(${count})`)
        .join(', ');
      desc += `, 材料: ${typeDesc}`;
    }
    
    return desc;
  }
}