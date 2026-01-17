// ============= src/exporter/builders/via-builder.ts =============

// # 过孔构建器
// DESIGN: 支持镀孔、非镀孔、填充孔等多种过孔类型
// REF: IDXv4.5规范第6.3节，表5支持的孔类型
// BUSINESS: 过孔是PCB的关键互连元素，必须准确表示层间连接

import { 
  BaseBuilder, BuilderConfig, BuilderContext, BuildError, ValidationError, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, GeometryType, 
  EDMDShapeElement, ShapeElementType,
  EDMDCurveSet2D, CartesianPoint, EDMDCircleCenter,
  InterStratumFeatureType, LayerPurpose,
  EDMDUserSimpleProperty
} from '../../types/core';

// # 输入数据类型定义
/**
 * 过孔数据接口
 * 
 * @remarks
 * 描述PCB过孔的几何和电气特性
 * BUSINESS: 必须指定孔类型、直径和连接的层
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 标准镀孔
 * const viaData: ViaData = {
 *   id: 'VIA1',
 *   name: '过孔1',
 *   position: { x: 50, y: 30 },
 *   diameter: 0.3,
 *   viaType: 'plated',
 *   startLayer: 'TOP',
 *   endLayer: 'BOTTOM',
 *   properties: {
 *     netName: 'GND',
 *     padSize: 0.6
 *   }
 * };
 * ```
 */
export interface ViaData {
  /** 过孔唯一标识符 */
  id: string;
  
  /** 过孔名称（可选） */
  name?: string;
  
  /** 过孔位置 */
  position: {
    x: number;
    y: number;
  };
  
  /** 过孔直径（mm） */
  diameter: number;
  
  /** 过孔类型 */
  viaType: 'plated' | 'non-plated' | 'filled' | 'micro';
  
  /** 起始层 */
  startLayer: string;
  
  /** 结束层 */
  endLayer: string;
  
  /** 焊盘直径（可选，如果不同于孔径） */
  padDiameter?: number;
  
  /** 反焊盘直径（可选） */
  antiPadDiameter?: number;
  
  /** 所属网络（可选） */
  netName?: string;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/**
 * 处理后的过孔数据
 * 
 * @remarks
 * 包含计算后的Z轴范围和层信息
 */
interface ProcessedViaData {
  id: string;
  name: string;
  position: { x: number; y: number };
  diameter: number;
  viaType: ViaData['viaType'];
  geometryType: GeometryType;
  lowerBound: number;  // Z轴下界
  upperBound: number;  // Z轴上界
  padDiameter?: number;
  properties?: Record<string, any>;
}

// ============= 过孔构建器类 =============
/**
 * 过孔构建器
 * 
 * @remarks
 * 负责构建PCB过孔的EDMDItem表示，支持多种过孔类型
 * DESIGN: 使用InterStratumFeature表示跨层特征
 * PERFORMANCE: 过孔数量可能很多，注意构建效率
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 构建填充过孔
 * const builder = new ViaBuilder(config, context);
 * const viaItem = await builder.build(viaData);
 * // 返回: 包含过孔几何和层信息的EDMDItem
 * ```
 */
export class ViaBuilder extends BaseBuilder<ViaData, EDMDItem> {
  
  // # 过孔类型映射
  // 根据 IDX V4.5 协议表 8，VIA 不是标准几何类型，应该使用 HOLE_PLATED
  private readonly viaTypeMap: Record<ViaData['viaType'], {
    geometryType: GeometryType;
    interStratumType?: InterStratumFeatureType;
    description: string;
  }> = {
    'plated': {
      geometryType: GeometryType.HOLE_PLATED,  // 修复：VIA → HOLE_PLATED
      interStratumType: InterStratumFeatureType.VIA,
      description: '镀孔'
    },
    'non-plated': {
      geometryType: GeometryType.HOLE_NON_PLATED,
      interStratumType: InterStratumFeatureType.CUTOUT,
      description: '非镀孔'
    },
    'filled': {
      geometryType: GeometryType.FILLED_VIA,
      interStratumType: InterStratumFeatureType.FILLED_VIA,
      description: '填充孔'
    },
    'micro': {
      geometryType: GeometryType.HOLE_PLATED,  // 修复：VIA → HOLE_PLATED（微孔也是镀孔的一种）
      interStratumType: InterStratumFeatureType.VIA,
      description: '微孔'
    }
  };
  
  // ============= 输入验证 =============
  /**
   * 验证过孔数据
   * 
   * @remarks
   * BUSINESS: 过孔直径必须为正数，位置必须在板子范围内
   * SECURITY: 防止无效几何数据破坏PCB设计
   * 
   * @param input - 过孔数据
   * @returns 验证结果
   * 
   * @testCase 有效过孔数据
   * @testInput 直径大于0，位置坐标有效
   * @testExpect 验证通过
   * @testCase 无效直径
   * @testInput 直径为0或负数
   * @testExpect 验证失败，返回错误信息
   * @testCase 未支持的过孔类型
   * @testInput viaType='unknown'
   * @testExpect 验证失败，返回错误信息
   */
  protected validateInput(input: ViaData): ValidationResult<ViaData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // # 基础验证
    if (!input.id) {
      errors.push('过孔ID不能为空');
    }
    
    if (!input.position) {
      errors.push('过孔位置不能为空');
    }
    
    // # 几何验证
    if (input.diameter <= 0) {
      errors.push(`过孔直径必须大于0，当前: ${input.diameter}`);
    }
    
    if (isNaN(input.position.x) || isNaN(input.position.y)) {
      errors.push(`过孔位置坐标无效: x=${input.position.x}, y=${input.position.y}`);
    }
    
    // # 过孔类型验证
    if (!this.viaTypeMap[input.viaType]) {
      errors.push(`不支持的过孔类型: ${input.viaType}，支持的类型: ${Object.keys(this.viaTypeMap).join(', ')}`);
    }
    
    // # 焊盘直径验证（如果提供）
    if (input.padDiameter !== undefined && input.padDiameter <= 0) {
      errors.push(`焊盘直径必须大于0，当前: ${input.padDiameter}`);
    }
    
    if (input.padDiameter && input.padDiameter < input.diameter) {
      warnings.push(`焊盘直径(${input.padDiameter})小于孔径(${input.diameter})，可能不符合设计规则`);
    }
    
    // # 层验证
    if (!input.startLayer || !input.endLayer) {
      warnings.push('起始层或结束层未指定，将使用默认值');
    }
    
    // # 网络名称验证
    if (input.netName && input.netName.trim().length === 0) {
      warnings.push('网络名称为空字符串，将忽略');
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
   * 预处理过孔数据
   * 
   * @remarks
   * 计算Z轴范围，确定几何类型，准备构建数据
   * BUSINESS: 微孔可能需要特殊处理
   * 
   * @param input - 验证后的过孔数据
   * @returns 处理后的过孔数据
   */
  protected async preProcess(input: ViaData): Promise<ProcessedViaData> {
    // # 获取过孔类型配置
    const viaConfig = this.viaTypeMap[input.viaType];
    if (!viaConfig) {
      throw new ValidationError(`无效的过孔类型: ${input.viaType}`);
    }
    
    // # 计算Z轴范围
    // NOTE: 实际实现中应根据层堆叠计算准确的Z范围
    // 这里简化处理，假设板子厚度为1.6mm
    const boardThickness = 1.6; // 默认板子厚度
    const lowerBound = 0;
    const upperBound = boardThickness;
    
    // # 处理微孔特殊逻辑
    if (input.viaType === 'micro') {
      // BUSINESS: 微孔通常只连接相邻层
      // 这里简化处理，实际中需要根据层堆叠计算
    }
    
    return {
      id: input.id,
      name: input.name || `过孔_${input.id}`,
      position: {
        x: this.geometryUtils.roundValue(input.position.x),
        y: this.geometryUtils.roundValue(input.position.y)
      },
      diameter: this.geometryUtils.roundValue(input.diameter),
      viaType: input.viaType,
      geometryType: viaConfig.geometryType,
      lowerBound,
      upperBound,
      padDiameter: input.padDiameter ? this.geometryUtils.roundValue(input.padDiameter) : undefined,
      properties: input.properties
    };
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建过孔EDMDItem
   * 
   * @remarks
   * DESIGN: 过孔作为层间特征，需要准确表示连接关系
   * BUSINESS: 根据过孔类型选择适当的表示法
   * 
   * @param processedData - 处理后的过孔数据
   * @returns 过孔EDMDItem
   */
  protected async construct(processedData: ProcessedViaData): Promise<EDMDItem> {
    // # 创建过孔项目
    const baseItem = this.createBaseItem(
      ItemType.ASSEMBLY,
      processedData.geometryType,
      processedData.name,
      this.getViaDescription(processedData)
    );
    
    const viaItem: EDMDItem = {
      id: this.generateItemId('VIA', processedData.id),
      ItemType: ItemType.ASSEMBLY,
      ...baseItem,
      Identifier: this.createIdentifier('VIA', processedData.id)
    };
    
    // # 添加用户属性
    viaItem.UserProperties = this.createViaProperties(processedData);
    
    // # 创建过孔形状
    const shapeElementId = await this.createViaShape(processedData);
    
    if (this.config.useSimplified) {
      // ## 简化表示法：直接引用形状
      viaItem.Shape = shapeElementId; // 使用href引用
    } else {
      // ## 传统表示法：通过InterStratumFeature对象
      const interStratumFeature = this.createInterStratumFeature(processedData, shapeElementId);
      viaItem.Shape = interStratumFeature;
    }
    
    // # 添加焊盘形状（如果提供焊盘直径）
    if (processedData.padDiameter) {
      await this.addPadShape(viaItem, processedData);
    }
    
    return viaItem;
  }
  
  // ============= 后处理 =============
  /**
   * 后处理过孔项目
   * 
   * @param output - 构建的过孔项目
   * @returns 验证后的过孔项目
   */
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    // # 验证基本结构
    if (!output.geometryType) {
      this.context.addWarning('VIA_MISSING_GEOMETRY_TYPE',
        `过孔${output.id}缺少geometryType属性`);
    }
    
    // # 验证形状存在
    if (!output.Shape) {
      throw new BuildError(`过孔${output.id}缺少形状定义`);
    }
    
    // # 添加构建元数据
    if (!output.UserProperties) {
      output.UserProperties = [];
    }
    
    output.UserProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'VIA_TYPE'
      },
      Value: output.geometryType || 'UNKNOWN'
    });
    
    // # 添加基线标记 - 根据demo文件格式
    output.Baseline = {
      Value: 'true'
    };
    
    // # 将临时存储的几何元素移动到输出项目
    const currentItem = this.getCurrentBuildingItem();
    if (currentItem) {
      if (currentItem.geometricElements) {
        output.geometricElements = currentItem.geometricElements;
      }
      if (currentItem.curveSet2Ds) {
        output.curveSet2Ds = currentItem.curveSet2Ds;
      }
      if (currentItem.shapeElements) {
        output.shapeElements = currentItem.shapeElements;
      }
      // 清理临时存储
      this.context.currentBuildingItem = null;
    }
    
    // # 记录构建统计
    this.context.addWarning('VIA_BUILT',
      `过孔构建完成: ${output.Name} (类型: ${output.geometryType})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 创建过孔独立几何元素
   * 
   * @param processedData - 处理后的过孔数据
   * @returns 独立几何元素集合
   */
  private createIndependentGeometry(processedData: ProcessedViaData): {
    geometricElements: any[];
    curveSet2Ds: any[];
    shapeElements: any[];
    shapeElementId: string;
  } {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    // # 创建中心点
    const centerPoint = {
      id: this.generateItemId('POINT', `VIA_CENTER_${processedData.id}`),
      'xsi:type': 'd2:EDMDCartesianPoint',
      X: {
        'property:Value': processedData.position.x.toString()
      },
      Y: {
        'property:Value': processedData.position.y.toString()
      }
    };
    geometricElements.push(centerPoint);
    
    // # 创建CircleCenter
    const circleCenter = {
      id: this.generateItemId('CIRCLE', `VIA_${processedData.id}`),
      type: 'CircleCenter',
      CenterPoint: centerPoint.id,
      Diameter: {
        'property:Value': processedData.diameter.toString()
      }
    };
    geometricElements.push(circleCenter);
    
    // # 创建CurveSet2D
    const curveSet2D = {
      id: this.generateItemId('CURVESET', `VIA_${processedData.id}`),
      'xsi:type': 'd2:EDMDCurveSet2D',
      'pdm:ShapeDescriptionType': 'OUTLINE',
      'd2:LowerBound': {
        'property:Value': processedData.lowerBound.toString()
      },
      'd2:UpperBound': {
        'property:Value': processedData.upperBound.toString()
      },
      'd2:DetailedGeometricModelElement': circleCenter.id
    };
    curveSet2Ds.push(curveSet2D);
    
    // # 创建ShapeElement
    const shapeElementId = this.generateItemId('SHAPE', `VIA_${processedData.id}`);
    const shapeElement = {
      id: shapeElementId,
      'pdm:ShapeElementType': 'FeatureShapeElement',
      'pdm:Inverted': 'false',
      'pdm:DefiningShape': curveSet2D.id
    };
    shapeElements.push(shapeElement);
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      shapeElementId
    };
  }

  /**
   * 创建过孔形状（更新为使用独立几何元素）
   * 
   * @param processedData - 处理后的过孔数据
   * @returns 形状元素ID引用
   */
  private async createViaShape(processedData: ProcessedViaData): Promise<string> {
    // 创建独立几何元素并返回形状元素ID
    const geometry = this.createIndependentGeometry(processedData);
    
    // 将几何元素附加到当前构建的项目上（临时存储）
    const currentItem = this.getCurrentBuildingItem();
    if (currentItem) {
      currentItem.geometricElements = geometry.geometricElements;
      currentItem.curveSet2Ds = geometry.curveSet2Ds;
      currentItem.shapeElements = geometry.shapeElements;
    }
    
    return geometry.shapeElementId;
  }
  
  /**
   * 获取当前正在构建的项目（用于临时存储几何元素）
   */
  private getCurrentBuildingItem(): any {
    if (!this.context.currentBuildingItem) {
      this.context.currentBuildingItem = {};
    }
    return this.context.currentBuildingItem;
  }
  
  /**
   * 创建InterStratumFeature（传统表示法）
   * 
   * @param processedData - 处理后的过孔数据
   * @param shapeElementId - 形状元素ID
   * @returns InterStratumFeature对象
   */
  private createInterStratumFeature(
    processedData: ProcessedViaData,
    shapeElementId: string
  ): any {
    const viaConfig = this.viaTypeMap[processedData.viaType];
    
    return {
      id: this.generateItemId('INTERSTRATUM', processedData.id),
      InterStratumFeatureType: viaConfig.interStratumType,
      ShapeElement: shapeElementId, // 使用ID引用
      // NOTE: 实际实现中需要添加Stratum引用
      Stratum: null // 待实现
    };
  }
  
  /**
   * 添加焊盘形状
   * 
   * @param viaItem - 过孔项目
   * @param processedData - 处理后的过孔数据
   */
  private async addPadShape(viaItem: EDMDItem, processedData: ProcessedViaData): Promise<void> {
    // BUSINESS: 焊盘通常位于外层，厚度较小
    const padThickness = 0.035; // 典型铜厚
    
    // # 创建焊盘圆形曲线
    const padCircle: EDMDCircleCenter = {
      id: this.generateItemId('CIRCLE', `PAD_${processedData.id}`),
      curveType: 'EDMDCircleCenter',
      CenterPoint: {
        id: this.generateItemId('POINT', `PAD_CENTER_${processedData.id}`),
        X: processedData.position.x,
        Y: processedData.position.y
      },
      Diameter: this.createLengthProperty(processedData.padDiameter!)
    };
    
    // # 创建焊盘曲线集（位于顶层）
    const padCurveSet: EDMDCurveSet2D = this.createCurveSet2D(
      processedData.upperBound - padThickness,
      processedData.upperBound,
      [padCircle]
    );
    
    padCurveSet.id = this.generateItemId('CURVESET', `PAD_${processedData.id}`);
    
    // # 创建焊盘形状元素
    const padShapeElement: EDMDShapeElement = {
      id: this.generateItemId('SHAPE', `PAD_${processedData.id}`),
      ShapeElementType: ShapeElementType.FEATURE_SHAPE_ELEMENT,
      DefiningShape: padCurveSet,
      Inverted: false
    };
    
    // NOTE: 实际实现中，焊盘可能需要作为独立的Item或与过孔组合
    // 这里简化处理，仅记录信息
    this.context.addWarning('PAD_SHAPE_CREATED',
      `为过孔${processedData.id}创建了焊盘形状，直径: ${processedData.padDiameter}mm`);
    
    // TODO(过孔构建器): 2024-03-20 实现焊盘与过孔的关联关系 [P1-IMPORTANT]
  }
  
  /**
   * 创建过孔用户属性
   * 
   * @param processedData - 处理后的过孔数据
   * @returns 用户属性数组
   */
  private createViaProperties(processedData: ProcessedViaData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'DIAMETER'
        },
        Value: processedData.diameter.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'VIA_TYPE'
        },
        Value: processedData.viaType
      }
    ];
    
    // # 添加网络属性（如果有）
    if (processedData.properties?.netName) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'NET_NAME'
        },
        Value: processedData.properties.netName
      });
    }
    
    // # 添加焊盘属性（如果有）
    if (processedData.padDiameter) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'PAD_DIAMETER'
        },
        Value: processedData.padDiameter.toString()
      });
    }
    
    // # 添加位置属性
    properties.push(
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POSITION_X'
        },
        Value: processedData.position.x.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POSITION_Y'
        },
        Value: processedData.position.y.toString()
      }
    );
    
    return properties;
  }
  
  /**
   * 获取过孔描述
   * 
   * @param processedData - 处理后的过孔数据
   * @returns 描述字符串
   */
  private getViaDescription(processedData: ProcessedViaData): string {
    const viaConfig = this.viaTypeMap[processedData.viaType];
    const baseDesc = `${viaConfig.description}，直径: ${processedData.diameter}mm`;
    
    if (processedData.padDiameter) {
      return `${baseDesc}，焊盘直径: ${processedData.padDiameter}mm`;
    }
    
    return baseDesc;
  }
}