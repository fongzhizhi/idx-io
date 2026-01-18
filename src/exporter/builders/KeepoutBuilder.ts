// ============= 禁止区构建器 =============
// DESIGN: 支持多种禁止区域类型：布线、组件放置、过孔等
// REF: IDXv4.5规范第6.5节，表6-7支持的禁止区类型
// BUSINESS: 禁止区用于定义设计约束，确保机械和电气兼容性

import { 
  BaseBuilder, BuilderConfig, BuilderContext, BuildError, ValidationError, ValidationResult 
} from './BaseBuilder';
import {
  EDMDItem, ItemType, GeometryType,
  EDMDShapeElement, ShapeElementType,
  EDMDCurveSet2D, CartesianPoint, EDMDPolyLine,
  KeepConstraintPurpose,
  EDMDLengthProperty,
  EDMDCircleCenter,
  EDMDUserSimpleProperty
} from '../../types/core';
import {
  KeepoutGeometryData,
  KeepoutGeometryType, ConstraintType, BuilderShapeType
} from '../../types';
// 使用重命名导入避免冲突
import { KeepoutData as BuilderKeepoutData, ProcessedKeepoutData as BuilderProcessedKeepoutData } from '../../types/exporter/builders/keepout-builder';

// # 输入数据类型定义
/**
 * 禁止区数据接口
 * 
 * @remarks
 * 描述PCB上的禁止区域约束
 * BUSINESS: 必须指定约束类型、几何形状和应用层
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 元件放置禁止区
 * const keepoutData: KeepoutData = {
 *   id: 'KO1',
 *   name: '散热器下方禁止区',
 *   constraintType: 'component',
 *   purpose: 'ComponentPlacement',
 *   shape: {
 *     type: 'rectangle',
 *     points: [
 *       { x: 10, y: 10 },
 *       { x: 50, y: 10 },
 *       { x: 50, y: 30 },
 *       { x: 10, y: 30 }
 *     ]
 *   },
 *   height: {
 *     min: 0,
 *     max: 5 // 高度限制为5mm
 *   },
 *   layer: 'TOP',
 *   properties: {
 *     reason: '散热器安装区域',
 *     priority: 'high'
 *   }
 * };
 * ```
 */
export interface KeepoutData {
  /** 禁止区唯一标识符 */
  id: string;
  
  /** 禁止区名称 */
  name?: string;
  
  /** 约束类型 */
  constraintType: 'route' | 'component' | 'via' | 'testpoint' | 'thermal' | 'other';
  
  /** 约束目的（更详细的分类） */
  purpose: KeepConstraintPurpose;
  
  /** 禁止区形状 */
  shape: {
    type: 'rectangle' | 'circle' | 'polygon';
    points: Array<{ x: number; y: number }>;
    radius?: number; // 仅圆形需要
  };
  
  /** 高度限制（可选） */
  height?: {
    /** 最小高度（相对于参考面） */
    min: number;
    /** 最大高度（相对于参考面），Infinity表示无上限 */
    max: number | 'infinity';
  };
  
  /** 应用层 */
  layer: string;
  
  /** 是否启用 */
  enabled?: boolean;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/**
 * 处理后的禁止区数据
 * 
 * @remarks
 * 包含计算后的几何类型和Z轴范围
 */
interface ProcessedKeepoutData {
  id: string;
  name: string;
  constraintType: BuilderKeepoutData['constraintType'];
  purpose: KeepConstraintPurpose;
  geometryType: GeometryType;
  shape: {
    points: CartesianPoint[];
    type: BuilderKeepoutData['shape']['type'];
    radius?: number;
  };
  lowerBound: number;
  upperBound: number;
  layer: string;
  enabled: boolean;
  properties?: Record<string, any>;
}

// ============= 禁止区构建器类 =============
/**
 * 禁止区构建器
 * 
 * @remarks
 * 负责构建PCB禁止区的EDMDItem表示
 * DESIGN: 禁止区可以是2D区域或具有高度限制的3D空间
 * BUSINESS: 不同的约束类型需要不同的几何类型
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 构建布线禁止区
 * const builder = new KeepoutBuilder(config, context);
 * const keepoutItem = await builder.build(keepoutData);
 * // 返回: 包含禁止区约束的EDMDItem
 * ```
 */
export class KeepoutBuilder extends BaseBuilder<KeepoutData, EDMDItem> {
  
  // # 约束类型到几何类型映射
  private readonly constraintTypeMap: Record<BuilderKeepoutData['constraintType'], GeometryType> = {
    'route': GeometryType.KEEPOUT_AREA_ROUTE,
    'component': GeometryType.KEEPOUT_AREA_COMPONENT,
    'via': GeometryType.KEEPOUT_AREA_VIA,
    'testpoint': GeometryType.KEEPOUT_AREA_TESTPOINT,
    'thermal': GeometryType.KEEPOUT_AREA_THERMAL,
    'other': GeometryType.KEEPOUT_AREA_OTHER
  };
  
  // ============= 输入验证 =============
  /**
   * 验证禁止区数据
   * 
   * @remarks
   * BUSINESS: 禁止区必须有有效的形状和约束类型
   * SECURITY: 防止无效约束破坏设计规则
   * 
   * @param input - 禁止区数据
   * @returns 验证结果
   * 
   * @testCase 有效禁止区数据
   * @testInput 包含有效形状、约束类型和目的
   * @testExpect 验证通过
   * @testCase 无效形状
   * @testInput 少于3个点的多边形
   * @testExpect 验证失败，返回错误信息
   * @testCase 无效高度限制
   * @testInput 最小高度大于最大高度
   * @testExpect 验证失败，返回错误信息
   */
  protected validateInput(input: BuilderKeepoutData): ValidationResult<BuilderKeepoutData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // ============= 基础验证 =============
    if (!input.id) {
      errors.push('禁止区ID不能为空');
    }
    
    if (!input.constraintType) {
      errors.push('禁止区约束类型不能为空');
    } else if (!this.constraintTypeMap[input.constraintType]) {
      errors.push(`不支持的约束类型: ${input.constraintType}，支持的类型: ${Object.keys(this.constraintTypeMap).join(', ')}`);
    }
    
    if (!input.purpose) {
      errors.push('禁止区约束目的不能为空');
    }
    
    // ============= 形状验证 =============
    if (!input.shape) {
      errors.push('禁止区形状不能为空');
    } else {
      const { type, points, radius } = input.shape;
      
      if (!type || !['rectangle', 'circle', 'polygon'].includes(type)) {
        errors.push(`不支持的形状类型: ${type}，支持的类型: rectangle, circle, polygon`);
      }
      
      // 多边形验证
      if (type === 'polygon' && (!points || points.length < 3)) {
        errors.push(`多边形至少需要3个点，当前: ${points?.length || 0}`);
      }
      
      // 矩形验证
      if (type === 'rectangle' && (!points || points.length !== 4)) {
        errors.push(`矩形需要4个点，当前: ${points?.length || 0}`);
      }
      
      // 圆形验证
      if (type === 'circle') {
        if (!radius || radius <= 0) {
          errors.push(`圆形半径必须大于0，当前: ${radius}`);
        }
        if (!points || points.length !== 1) {
          warnings.push(`圆形通常只需要一个中心点，当前: ${points?.length || 0}个点`);
        }
      }
      
      // 点坐标验证
      points?.forEach((point, index) => {
        if (isNaN(point.x) || isNaN(point.y)) {
          errors.push(`点${index}坐标无效: x=${point.x}, y=${point.y}`);
        }
      });
    }
    
    // ============= 高度限制验证 =============
    if (input.height) {
      const { min, max } = input.height;
      
      if (min < 0) {
        errors.push(`最小高度不能为负数: ${min}`);
      }
      
      if (max !== 'infinity' && max < 0) {
        errors.push(`最大高度不能为负数: ${max}`);
      }
      
      if (max !== 'infinity' && min > max) {
        errors.push(`最小高度(${min})不能大于最大高度(${max})`);
      }
    }
    
    // ============= 层验证 =============
    if (!input.layer) {
      warnings.push('禁止区应用层未指定，将使用默认值TOP');
    }
    
    // ============= 启用状态验证 =============
    if (input.enabled === false) {
      warnings.push('禁止区被禁用，构建后可能不会生效');
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
   * 预处理禁止区数据
   * 
   * @remarks
   * 计算几何类型，转换点数据，准备构建数据
   * BUSINESS: 不同约束类型使用不同的几何类型
   * 
   * @param input - 验证后的禁止区数据
   * @returns 处理后的禁止区数据
   */
  protected async preProcess(input: BuilderKeepoutData): Promise<ProcessedKeepoutData> {
    // # 确定几何类型
    const geometryType = this.constraintTypeMap[input.constraintType];
    if (!geometryType) {
      throw new ValidationError(`无效的约束类型: ${input.constraintType}`);
    }
    
    // # 转换点数据
    const points = input.shape.points.map((point, index) => ({
      id: this.generateItemId('POINT', `${input.id}_${index}`),
      X: this.geometryUtils.roundValue(point.x),
      Y: this.geometryUtils.roundValue(point.y)
    }));
    
    // # 计算Z轴范围
    let lowerBound = 0;
    let upperBound = Infinity;
    
    if (input.height) {
      lowerBound = input.height.min;
      upperBound = input.height.max === 'infinity' ? Infinity : input.height.max;
    }
    
    // NOTE: Infinity在IDX中需要特殊处理，通常表示为非常大的数值或省略上界
    if (upperBound === Infinity) {
      // IDX规范中，未定义的上界表示无限
      upperBound = 1e6; // 使用一个大数值表示"无限"
    }
    
    return {
      id: input.id,
      name: input.name || `禁止区_${input.id}`,
      constraintType: input.constraintType,
      purpose: input.purpose,
      geometryType,
      shape: {
        points,
        type: input.shape.type,
        radius: input.shape.radius
      },
      lowerBound,
      upperBound,
      layer: input.layer || 'TOP',
      enabled: input.enabled !== false,
      properties: input.properties
    };
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建禁止区EDMDItem
   * 
   * @remarks
   * DESIGN: 禁止区作为装配体项目，包含约束信息和几何形状
   * BUSINESS: 根据约束类型选择适当的几何类型
   * 
   * @param processedData - 处理后的禁止区数据
   * @returns 禁止区EDMDItem
   */
  protected async construct(processedData: ProcessedKeepoutData): Promise<EDMDItem> {
    // # 检查启用状态
    if (!processedData.enabled) {
      this.context.addWarning('KEEPOUT_DISABLED',
        `禁止区${processedData.id}被禁用，将构建但可能不生效`);
    }
    
    // # 创建禁止区项目
    const baseItem = this.createBaseItem(
      ItemType.ASSEMBLY,
      processedData.geometryType,
      processedData.name,
      this.getKeepoutDescription(processedData)
    );
    
    const keepoutItem: EDMDItem = {
      id: this.generateItemId('KEEPOUT', processedData.id),
      ItemType: ItemType.ASSEMBLY,
      ...baseItem,
      Identifier: this.createIdentifier('KEEPOUT', processedData.id)
    };
    
    // # 添加用户属性
    keepoutItem.UserProperties = this.createKeepoutProperties(processedData);
    
    // # 创建禁止区形状
    const shapeElementId = await this.createKeepoutShape(processedData);
    
    if (this.config.useSimplified) {
      // ## 简化表示法：直接引用形状
      keepoutItem.Shape = shapeElementId; // 使用href引用
    } else {
      // ## 传统表示法：通过EDMDKeepOut对象
      const keepoutObject = this.createKeepoutObject(processedData, shapeElementId);
      keepoutItem.Shape = keepoutObject;
    }
    
    // # 设置装配到名称（层引用）
    keepoutItem.AssembleToName = processedData.layer;
    
    // # 添加基线标记
    keepoutItem.BaseLine = processedData.enabled;
    
    return keepoutItem;
  }
  
  // ============= 后处理 =============
  /**
   * 后处理禁止区项目
   * 
   * @param output - 构建的禁止区项目
   * @returns 验证后的禁止区项目
   */
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    // # 验证基本结构
    if (!output.geometryType || !output.geometryType.startsWith('KEEPOUT')) {
      this.context.addWarning('KEEPOUT_INVALID_TYPE',
        `禁止区${output.id}的几何类型无效: ${output.geometryType}`);
    }
    
    // # 验证形状存在
    if (!output.Shape) {
      throw new BuildError(`禁止区${output.id}缺少形状定义`);
    }
    
    // # 验证高度范围
    const heightProps = output.UserProperties?.filter(p => 
      p.Key.ObjectName === 'HEIGHT_MIN' || p.Key.ObjectName === 'HEIGHT_MAX'
    );
    
    if (heightProps && heightProps.length === 2) {
      const min = parseFloat(heightProps.find(p => p.Key.ObjectName === 'HEIGHT_MIN')!.Value as string);
      const max = parseFloat(heightProps.find(p => p.Key.ObjectName === 'HEIGHT_MAX')!.Value as string);
      
      if (min > max) {
        this.context.addWarning('KEEPOUT_INVALID_HEIGHT',
          `禁止区${output.id}的最小高度(${min})大于最大高度(${max})`);
      }
    }
    
    // # 添加构建元数据
    if (!output.UserProperties) {
      output.UserProperties = [];
    }
    
    output.UserProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'ENABLED'
      },
      Value: output.BaseLine ? 'true' : 'false'
    });
    
    // # 添加基线标记 - 根据需求 10.1-10.4 使用正确格式
    output.BaseLine = true;
    
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
    this.context.addWarning('KEEPOUT_BUILT',
      `禁止区构建完成: ${output.Name} (类型: ${output.geometryType}, 层: ${output.AssembleToName})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 创建禁止区独立几何元素
   * 
   * @param processedData - 处理后的禁止区数据
   * @returns 独立几何元素集合
   */
  private createIndependentGeometry(processedData: ProcessedKeepoutData): {
    geometricElements: any[];
    curveSet2Ds: any[];
    shapeElements: any[];
    shapeElementId: string;
  } {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    let geometricElement: any;
    
    switch (processedData.shape.type) {
      case 'rectangle':
      case 'polygon':
        // ## 多边形或矩形 - 创建CartesianPoint和PolyLine
        const cartesianPoints: any[] = [];
        processedData.shape.points.forEach((point, index) => {
          const cartesianPoint = {
            id: this.generateItemId('POINT', `KEEPOUT_${processedData.id}_P${index}`),
            'xsi:type': 'd2:EDMDCartesianPoint',
            X: {
              'property:Value': point.X.toString()
            },
            Y: {
              'property:Value': point.Y.toString()
            }
          };
          geometricElements.push(cartesianPoint);
          cartesianPoints.push(cartesianPoint);
        });
        
        // 创建PolyLine
        geometricElement = {
          id: this.generateItemId('POLYLINE', `KEEPOUT_${processedData.id}`),
          type: 'PolyLine',
          Point: cartesianPoints.map(point => ({
            'd2:Point': point.id
          }))
        };
        geometricElements.push(geometricElement);
        break;
        
      case 'circle':
        // ## 圆形 - 创建中心点和CircleCenter
        if (!processedData.shape.radius || processedData.shape.points.length === 0) {
          throw new ValidationError(`圆形禁止区${processedData.id}缺少半径或中心点`);
        }
        
        const centerPoint = processedData.shape.points[0];
        const center = {
          id: this.generateItemId('POINT', `KEEPOUT_CENTER_${processedData.id}`),
          'xsi:type': 'd2:EDMDCartesianPoint',
          X: {
            'property:Value': centerPoint.X.toString()
          },
          Y: {
            'property:Value': centerPoint.Y.toString()
          }
        };
        geometricElements.push(center);
        
        geometricElement = {
          id: this.generateItemId('CIRCLE', `KEEPOUT_${processedData.id}`),
          type: 'CircleCenter',
          CenterPoint: center.id,
          Diameter: {
            'property:Value': (processedData.shape.radius * 2).toString()
          }
        };
        geometricElements.push(geometricElement);
        break;
        
      default:
        throw new ValidationError(`不支持的形状类型: ${processedData.shape.type}`);
    }
    
    // # 创建CurveSet2D
    const curveSet2D = {
      id: this.generateItemId('CURVESET', `KEEPOUT_${processedData.id}`),
      'xsi:type': 'd2:EDMDCurveSet2d',  // 统一使用小写 d
      'pdm:ShapeDescriptionType': 'OUTLINE',
      'd2:LowerBound': {
        'property:Value': processedData.lowerBound.toString()
      },
      'd2:UpperBound': {
        'property:Value': processedData.upperBound.toString()
      },
      'd2:DetailedGeometricModelElement': geometricElement.id
    };
    curveSet2Ds.push(curveSet2D);
    
    // # 创建ShapeElement
    // 根据需求 15.1：切割特征（孔、挖槽）的 Inverted 属性设为 true
    const shapeElementId = this.generateItemId('SHAPE', `KEEPOUT_${processedData.id}`);
    const shapeElement = {
      id: shapeElementId,
      'pdm:ShapeElementType': 'FeatureShapeElement',
      'pdm:Inverted': 'true', // 禁止区是切割特征，应该设为 true
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
   * 创建禁止区形状（更新为使用独立几何元素）
   * 
   * @param processedData - 处理后的禁止区数据
   * @returns 形状元素ID引用
   */
  private async createKeepoutShape(processedData: ProcessedKeepoutData): Promise<string> {
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
   * 创建EDMDKeepOut对象（传统表示法）
   * 
   * @param processedData - 处理后的禁止区数据
   * @param shapeElementId - 形状元素ID
   * @returns EDMDKeepOut对象
   */
  private createKeepoutObject(
    processedData: ProcessedKeepoutData,
    shapeElementId: string
  ): any {
    return {
      id: this.generateItemId('KEEPOUT_OBJ', processedData.id),
      Purpose: processedData.purpose,
      ShapeElement: shapeElementId, // 使用ID引用
      Properties: processedData.properties ? this.convertProperties(processedData.properties) : []
    };
  }
  
  /**
   * 创建禁止区用户属性
   * 
   * @param processedData - 处理后的禁止区数据
   * @returns 用户属性数组
   */
  private createKeepoutProperties(processedData: ProcessedKeepoutData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'CONSTRAINT_TYPE'
        },
        Value: processedData.constraintType
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'PURPOSE'
        },
        Value: processedData.purpose
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER'
        },
        Value: processedData.layer
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'SHAPE_TYPE'
        },
        Value: processedData.shape.type
      }
    ];
    
    // # 添加高度属性
    properties.push(
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'HEIGHT_MIN'
        },
        Value: processedData.lowerBound.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'HEIGHT_MAX'
        },
        Value: processedData.upperBound.toString()
      }
    );
    
    // # 添加点数量属性
    properties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'POINT_COUNT'
      },
      Value: processedData.shape.points.length.toString()
    });
    
    // # 添加自定义属性
    if (processedData.properties) {
      Object.entries(processedData.properties).forEach(([key, value]) => {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: key.toUpperCase()
          },
          Value: String(value)
        });
      });
    }
    
    return properties;
  }
  
  /**
   * 转换属性对象为IDX格式
   * 
   * @param properties - 原始属性对象
   * @returns IDX格式的属性数组
   */
  private convertProperties(properties: Record<string, any>): EDMDUserSimpleProperty[] {
    return Object.entries(properties).map(([key, value]) => ({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: key
      },
      Value: String(value)
    }));
  }
  
  /**
   * 获取禁止区描述
   * 
   * @param processedData - 处理后的禁止区数据
   * @returns 描述字符串
   */
  private getKeepoutDescription(processedData: ProcessedKeepoutData): string {
    const typeMap: Record<BuilderKeepoutData['constraintType'], string> = {
      'route': '布线',
      'component': '元件放置',
      'via': '过孔',
      'testpoint': '测试点',
      'thermal': '热',
      'other': '其他'
    };
    
    const typeName = typeMap[processedData.constraintType] || processedData.constraintType;
    const baseDesc = `${typeName}禁止区: ${processedData.name}`;
    
    if (processedData.upperBound === Infinity || processedData.upperBound > 1000) {
      return `${baseDesc}，高度限制: ${processedData.lowerBound}mm以上`;
    }
    
    return `${baseDesc}，高度限制: ${processedData.lowerBound}-${processedData.upperBound}mm`;
  }
}