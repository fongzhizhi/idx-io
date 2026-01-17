// ============= src/exporter/builders/component-builder.ts =============

// # 元件构建器
// DESIGN: 支持电气和机械元件，支持2.5D几何和外部3D模型
// REF: IDXv4.5规范第6.2节，表8所有元件类型
// BUSINESS: 元件是PCB的核心部件，必须准确表示尺寸、位置和属性

import { 
  BaseBuilder, BuilderConfig, BuilderContext, BuildError, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, GeometryType,
  EDMDShapeElement, ShapeElementType,
  EDMDCurveSet2D, CartesianPoint, EDMDPolyLine,
  EDMD3DModel, EDMDTransformation2D, EDMDTransformation3D,
  PackagePin, AssemblyComponentType,
  EDMDLengthProperty, EDMName,
  EDMDCircleCenter,
  EDMDUserSimpleProperty
} from '../../types/core';

// # 输入数据类型定义
/**
 * 元件数据接口
 * 
 * @remarks
 * 描述PCB元件的几何、电气和位置信息
 * BUSINESS: 必须包含位号、封装名称和位置信息
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 标准电容器件
 * const componentData: ComponentData = {
 *   refDes: 'C1',
 *   partNumber: 'CAP-0805-1uF',
 *   packageName: '0805',
 *   position: { x: 30, y: 30, z: 1.6, rotation: 0 },
 *   dimensions: { width: 2.0, height: 1.2, thickness: 0.8 },
 *   layer: 'TOP',
 *   electrical: {
 *     capacitance: 0.000001,
 *     tolerance: 10
 *   },
 *   thermal: {
 *     powerRating: 0.125
 *   }
 * };
 * ```
 */
export interface ComponentData {
  /** 元件位号（如C1、R1、U1等） */
  refDes: string;
  
  /** 元件型号/料号 */
  partNumber: string;
  
  /** 封装名称（如0805、SOIC-8等） */
  packageName: string;
  
  /** 元件位置 */
  position: {
    x: number;
    y: number;
    z?: number; // Z轴位置，可选
    rotation: number; // 旋转角度（度）
  };
  
  /** 元件尺寸 */
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  
  /** 所在层（TOP/BOTTOM/INNER） */
  layer: string;
  
  /** 是否为机械元件 */
  isMechanical?: boolean;
  
  /** 电气属性（可选） */
  electrical?: {
    /** 电容值（法拉） */
    capacitance?: number;
    /** 电阻值（欧姆） */
    resistance?: number;
    /** 电感值（亨利） */
    inductance?: number;
    /** 容差（百分比） */
    tolerance?: number;
  };
  
  /** 热属性（可选） */
  thermal?: {
    /** 工作功率（瓦特） */
    powerRating?: number;
    /** 最大功率（瓦特） */
    maxPower?: number;
    /** 热导率（W/m·K） */
    thermalConductivity?: number;
    /** 结到板热阻（°C/W） */
    junctionToBoardResistance?: number;
    /** 结到壳热阻（°C/W） */
    junctionToCaseResistance?: number;
  };
  
  /** 3D模型信息（可选） */
  model3D?: {
    /** 模型文件路径或标识符 */
    path: string;
    /** 模型格式（STEP、STL、SLDPRT等） */
    format: string;
    /** 模型版本（可选） */
    version?: string;
    /** 变换偏移（用于对齐） */
    offset?: { x: number; y: number; z: number; rotation: number };
  };
  
  /** 引脚定义（可选） */
  pins?: Array<{
    number: string;
    isPrimary: boolean; // 是否为主要引脚（Pin 1）
    position: { x: number; y: number };
    shape?: any; // 引脚形状（可选）
  }>;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/**
 * 处理后的元件数据
 * 
 * @remarks
 * 包含计算后的变换矩阵和几何类型
 */
interface ProcessedComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  layer: string;
  isMechanical: boolean;
  geometryType: GeometryType;
  transformation: EDMDTransformation2D | EDMDTransformation3D;
  electrical?: ComponentData['electrical'];
  thermal?: ComponentData['thermal'];
  model3D?: ComponentData['model3D'];
  pins?: ComponentData['pins'];
  properties?: Record<string, any>;
}

// ============= 元件构建器类 =============
/**
 * 元件构建器
 * 
 * @remarks
 * 负责构建PCB元件的EDMDItem表示，支持2.5D几何和外部3D模型
 * DESIGN: 元件可以是电气或机械类型，使用不同的几何类型
 * PERFORMANCE: PCB可能包含数百个元件，注意构建效率
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 构建电气元件
 * const builder = new ComponentBuilder(config, context);
 * const componentItem = await builder.build(componentData);
 * // 返回: 包含元件几何、属性和引脚的EDMDItem
 * ```
 */
export class ComponentBuilder extends BaseBuilder<ComponentData, EDMDItem> {
  
  // ============= 输入验证 =============
  /**
   * 验证元件数据
   * 
   * @remarks
   * BUSINESS: 元件必须有有效的位号、封装和位置信息
   * SECURITY: 防止无效元件破坏PCB装配
   * 
   * @param input - 元件数据
   * @returns 验证结果
   * 
   * @testCase 有效元件数据
   * @testInput 包含位号、封装、有效位置和尺寸
   * @testExpect 验证通过
   * @testCase 无效位号
   * @testInput 位号为空或格式无效
   * @testExpect 验证失败，返回错误信息
   * @testCase 无效尺寸
   * @testInput 尺寸为0或负数
   * @testExpect 验证失败，返回错误信息
   */
  protected validateInput(input: ComponentData): ValidationResult<ComponentData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // ============= 基础验证 =============
    if (!input.refDes || input.refDes.trim().length === 0) {
      errors.push('元件位号不能为空');
    }
    
    if (!input.partNumber || input.partNumber.trim().length === 0) {
      warnings.push('元件料号为空，将使用位号作为替代');
    }
    
    if (!input.packageName || input.packageName.trim().length === 0) {
      errors.push('元件封装名称不能为空');
    }
    
    // ============= 位置验证 =============
    if (!input.position) {
      errors.push('元件位置不能为空');
    } else {
      const { x, y, rotation } = input.position;
      
      if (isNaN(x) || isNaN(y)) {
        errors.push(`元件位置坐标无效: x=${x}, y=${y}`);
      }
      
      if (isNaN(rotation)) {
        errors.push(`元件旋转角度无效: ${rotation}`);
      }
    }
    
    // ============= 尺寸验证 =============
    if (!input.dimensions) {
      errors.push('元件尺寸不能为空');
    } else {
      const { width, height, thickness } = input.dimensions;
      
      if (width <= 0) {
        errors.push(`元件宽度必须大于0，当前: ${width}`);
      }
      
      if (height <= 0) {
        errors.push(`元件高度必须大于0，当前: ${height}`);
      }
      
      if (thickness <= 0) {
        errors.push(`元件厚度必须大于0，当前: ${thickness}`);
      }
    }
    
    // ============= 层验证 =============
    if (!input.layer) {
      warnings.push('元件所在层未指定，将使用默认值TOP');
    } else if (!['TOP', 'BOTTOM', 'INNER'].includes(input.layer.toUpperCase())) {
      warnings.push(`元件所在层${input.layer}不是标准值（TOP/BOTTOM/INNER）`);
    }
    
    // ============= 电气属性验证 =============
    if (input.electrical) {
      const { capacitance, resistance, inductance, tolerance } = input.electrical;
      
      if (capacitance !== undefined && capacitance < 0) {
        errors.push(`电容值不能为负数: ${capacitance}`);
      }
      
      if (resistance !== undefined && resistance < 0) {
        errors.push(`电阻值不能为负数: ${resistance}`);
      }
      
      if (inductance !== undefined && inductance < 0) {
        errors.push(`电感值不能为负数: ${inductance}`);
      }
      
      if (tolerance !== undefined && (tolerance < 0 || tolerance > 100)) {
        errors.push(`容差必须在0-100%之间: ${tolerance}`);
      }
    }
    
    // ============= 热属性验证 =============
    if (input.thermal) {
      const { powerRating, maxPower } = input.thermal;
      
      if (powerRating !== undefined && powerRating < 0) {
        errors.push(`工作功率不能为负数: ${powerRating}`);
      }
      
      if (maxPower !== undefined && maxPower < 0) {
        errors.push(`最大功率不能为负数: ${maxPower}`);
      }
      
      if (powerRating !== undefined && maxPower !== undefined && powerRating > maxPower) {
        warnings.push(`工作功率(${powerRating})大于最大功率(${maxPower})，可能有问题`);
      }
    }
    
    // ============= 引脚验证 =============
    if (input.pins && input.pins.length > 0) {
      // 检查是否有主要引脚
      const primaryPins = input.pins.filter(pin => pin.isPrimary);
      if (primaryPins.length === 0) {
        warnings.push('元件引脚中未指定主要引脚（Pin 1）');
      } else if (primaryPins.length > 1) {
        warnings.push(`元件引脚中指定了${primaryPins.length}个主要引脚，通常应只有一个`);
      }
      
      // 检查引脚编号唯一性
      const pinNumbers = input.pins.map(pin => pin.number);
      const uniquePinNumbers = new Set(pinNumbers);
      if (pinNumbers.length !== uniquePinNumbers.size) {
        errors.push('元件引脚编号必须唯一');
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
   * 预处理元件数据
   * 
   * @remarks
   * 计算变换矩阵，确定几何类型，准备构建数据
   * BUSINESS: 机械元件使用不同的几何类型
   * 
   * @param input - 验证后的元件数据
   * @returns 处理后的元件数据
   */
  protected async preProcess(input: ComponentData): Promise<ProcessedComponentData> {
    // # 确定几何类型
    const geometryType = input.isMechanical 
      ? GeometryType.COMPONENT_MECHANICAL 
      : GeometryType.COMPONENT;
    
    // # 计算Z位置
    // NOTE: 实际实现中应根据层堆叠计算准确的Z位置
    // 这里简化处理，假设板子厚度为1.6mm
    const boardThickness = 1.6;
    const zPosition = input.position.z !== undefined 
      ? input.position.z 
      : (input.layer.toUpperCase() === 'TOP' ? boardThickness : 0);
    
    // # 创建变换矩阵
    const rotationRad = (input.position.rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    const transformation: EDMDTransformation2D = {
      TransformationType: 'd2',
      xx: cos,
      xy: -sin,
      yx: sin,
      yy: cos,
      tx: this.createLengthProperty(input.position.x),
      ty: this.createLengthProperty(input.position.y)
    };
    
    // 如果提供Z偏移，添加zOffset属性
    if (input.position.z !== undefined) {
      transformation.zOffset = this.createLengthProperty(zPosition);
    }
    
    return {
      refDes: input.refDes,
      partNumber: input.partNumber || input.refDes,
      packageName: input.packageName,
      position: {
        x: this.geometryUtils.roundValue(input.position.x),
        y: this.geometryUtils.roundValue(input.position.y),
        z: this.geometryUtils.roundValue(zPosition),
        rotation: input.position.rotation
      },
      dimensions: {
        width: this.geometryUtils.roundValue(input.dimensions.width),
        height: this.geometryUtils.roundValue(input.dimensions.height),
        thickness: this.geometryUtils.roundValue(input.dimensions.thickness)
      },
      layer: input.layer,
      isMechanical: input.isMechanical || false,
      geometryType,
      transformation,
      electrical: input.electrical,
      thermal: input.thermal,
      model3D: input.model3D,
      pins: input.pins,
      properties: input.properties
    };
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建元件EDMDItem
   * 
   * @remarks
   * DESIGN: 元件作为装配体项目，包含实例和定义
   * BUSINESS: 根据元件类型和配置选择适当的表示法
   * 
   * @param processedData - 处理后的元件数据
   * @returns 元件EDMDItem
   */
  protected async construct(processedData: ProcessedComponentData): Promise<EDMDItem> {
    // # 创建顶层元件项目（装配体）
    const baseItem = this.createBaseItem(
      ItemType.ASSEMBLY,
      processedData.geometryType,
      processedData.refDes,
      this.getComponentDescription(processedData)
    );
    
    const assemblyItem: EDMDItem = {
      id: this.generateItemId('COMPONENT', processedData.refDes),
      ItemType: ItemType.ASSEMBLY,
      ...baseItem,
      Identifier: this.createIdentifier('COMPONENT', processedData.refDes)
    };
    
    // # 创建元件实例
    const instance = this.createComponentInstance(processedData, assemblyItem.id);
    
    // # 创建元件定义项目
    const componentItem = await this.createComponentDefinition(processedData, assemblyItem.id);
    
    // # 组织项目结构
    assemblyItem.ItemInstances = [instance];
    
    // # 根据配置选择简化或传统表示法
    if (this.config.useSimplified) {
      return this.buildSimplifiedComponent(assemblyItem, componentItem, processedData);
    } else {
      return this.buildTraditionalComponent(assemblyItem, componentItem, processedData);
    }
  }
  
  // ============= 后处理 =============
  /**
   * 后处理元件项目
   * 
   * @param output - 构建的元件项目
   * @returns 验证后的元件项目
   */
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    // # 验证基本结构
    if (!output.ItemInstances || output.ItemInstances.length === 0) {
      throw new BuildError(`元件${output.id}缺少实例定义`);
    }
    
    // # 验证变换矩阵
    const instance = output.ItemInstances[0];
    if (!instance.Transformation) {
      this.context.addWarning('COMPONENT_MISSING_TRANSFORM',
        `元件${output.id}实例缺少变换矩阵`);
    }
    
    // # 添加构建元数据
    if (!output.UserProperties) {
      output.UserProperties = [];
    }
    
    // 添加元件类型标记
    output.UserProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'COMPONENT_TYPE'
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
    this.context.addWarning('COMPONENT_BUILT',
      `元件构建完成: ${output.Name} (位号: ${output.Name}, 封装: ${output.UserProperties.find(p => p.Key.ObjectName === 'PKGNAME')?.Value || '未知'})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 使用简化表示法构建元件
   * 
   * @remarks
   * IDXv4.5简化表示法：使用geometryType属性
   * 
   * @param assemblyItem - 装配体项目
   * @param componentItem - 元件定义项目
   * @param processedData - 处理后的元件数据
   * @returns 完整的元件项目
   */
  private buildSimplifiedComponent(
    assemblyItem: EDMDItem,
    componentItem: EDMDItem,
    processedData: ProcessedComponentData
  ): EDMDItem {
    // # 设置几何类型
    assemblyItem.geometryType = processedData.geometryType;
    
    // # 添加用户属性
    assemblyItem.UserProperties = [
      ...(assemblyItem.UserProperties || []),
      ...this.createComponentProperties(processedData)
    ];
    
    // # 设置元件定义项目的形状
    if (processedData.model3D) {
      // 使用外部3D模型
      componentItem.EDMD3DModel = this.create3DModelReference(processedData.model3D);
    } else {
      // 使用2.5D几何 - 返回形状元素ID引用
      const shapeElementId = this.createComponentShape(processedData);
      componentItem.Shape = shapeElementId; // 使用href引用
    }
    
    // # 添加引脚定义
    if (processedData.pins && processedData.pins.length > 0) {
      componentItem.PackagePins = this.createPackagePins(processedData.pins, componentItem.id);
    }
    
    // # 设置装配到名称（层引用）
    assemblyItem.AssembleToName = processedData.layer;
    
    return assemblyItem;
  }
  
  /**
   * 使用传统表示法构建元件
   * 
   * @remarks
   * IDXv4.0及之前版本的传统表示法
   * 
   * @param assemblyItem - 装配体项目
   * @param componentItem - 元件定义项目
   * @param processedData - 处理后的元件数据
   * @returns 完整的元件项目
   */
  private buildTraditionalComponent(
    assemblyItem: EDMDItem,
    componentItem: EDMDItem,
    processedData: ProcessedComponentData
  ): EDMDItem {
    // TODO(元件构建器): 2024-03-20 实现传统表示法 [P2-NICE_TO_HAVE]
    this.context.addWarning('TRADITIONAL_NOT_IMPLEMENTED',
      '元件传统表示法暂未实现，使用简化表示法');
    
    // 暂时使用简化表示法
    return this.buildSimplifiedComponent(assemblyItem, componentItem, processedData);
  }
  
  /**
   * 创建元件实例
   * 
   * @param processedData - 处理后的元件数据
   * @param componentItemId - 元件定义项目ID
   * @returns 元件实例
   */
  private createComponentInstance(
    processedData: ProcessedComponentData,
    componentItemId: string
  ): any {
    return {
      id: this.generateItemId('INSTANCE', processedData.refDes),
      Item: componentItemId,
      InstanceName: {
        SystemScope: this.config.creatorSystem,
        ObjectName: processedData.refDes
      },
      // 根据demo格式添加用户属性到实例中
      UserProperties: [
        {
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'REFDES'
          },
          Value: processedData.refDes
        },
        {
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'PLACED'
          },
          Value: 'true'
        }
      ],
      // 修正变换矩阵格式，匹配demo
      Transformation: {
        TransformationType: 'd2',
        xx: processedData.transformation.xx,
        xy: processedData.transformation.xy,
        yx: processedData.transformation.yx,
        yy: processedData.transformation.yy,
        tx: {
          Value: processedData.position.x.toString()
        },
        ty: {
          Value: processedData.position.y.toString()
        }
      }
    };
  }
  
  /**
   * 创建元件定义项目
   * 
   * @param processedData - 处理后的元件数据
   * @param assemblyItemId - 装配体项目ID
   * @returns 元件定义项目
   */
  private async createComponentDefinition(
    processedData: ProcessedComponentData,
    assemblyItemId: string
  ): Promise<EDMDItem> {
    const baseItem = this.createBaseItem(
      ItemType.SINGLE,
      undefined, // 定义项目不需要geometryType
      processedData.partNumber,
      `元件定义: ${processedData.partNumber} (${processedData.packageName})`
    );
    
    const componentItem: EDMDItem = {
      id: `${assemblyItemId}_DEF`,
      ItemType: ItemType.SINGLE,
      ...baseItem,
      PackageName: {
        SystemScope: this.config.creatorSystem,
        ObjectName: processedData.packageName
      }
    };
    
    return componentItem;
  }
  
  /**
   * 创建元件独立几何元素
   * 
   * @param processedData - 处理后的元件数据
   * @returns 独立几何元素集合
   */
  private createIndependentGeometry(processedData: ProcessedComponentData): {
    geometricElements: any[];
    curveSet2Ds: any[];
    shapeElements: any[];
    shapeElementId: string;
  } {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    // # 创建边界框的四个角点
    const halfWidth = processedData.dimensions.width / 2;
    const halfHeight = processedData.dimensions.height / 2;
    
    const points = [
      { x: -halfWidth, y: -halfHeight }, // 左下角
      { x: halfWidth, y: -halfHeight },  // 右下角
      { x: halfWidth, y: halfHeight },   // 右上角
      { x: -halfWidth, y: halfHeight }   // 左上角
    ];
    
    // # 创建CartesianPoint元素
    const cartesianPoints: any[] = [];
    points.forEach((point, index) => {
      const cartesianPoint = {
        id: this.generateItemId('POINT', `COMP_${processedData.refDes}_P${index}`),
        'xsi:type': 'd2:EDMDCartesianPoint',
        X: {
          'property:Value': point.x.toString()
        },
        Y: {
          'property:Value': point.y.toString()
        }
      };
      geometricElements.push(cartesianPoint);
      cartesianPoints.push(cartesianPoint);
    });
    
    // # 创建PolyLine（矩形轮廓）
    const polyLine = {
      id: this.generateItemId('POLYLINE', `COMP_${processedData.refDes}`),
      type: 'PolyLine',
      Point: cartesianPoints.map(point => ({
        'd2:Point': point.id
      }))
    };
    geometricElements.push(polyLine);
    
    // # 创建CurveSet2D
    const curveSet2D = {
      id: this.generateItemId('CURVESET', `COMP_${processedData.refDes}`),
      'xsi:type': 'd2:EDMDCurveSet2d',  // 统一使用小写 d
      'pdm:ShapeDescriptionType': 'OUTLINE',
      'd2:LowerBound': {
        'property:Value': '0.0'
      },
      'd2:UpperBound': {
        'property:Value': processedData.dimensions.thickness.toString()
      },
      'd2:DetailedGeometricModelElement': polyLine.id
    };
    curveSet2Ds.push(curveSet2D);
    
    // # 创建ShapeElement
    const shapeElementId = this.generateItemId('SHAPE', `COMP_${processedData.refDes}`);
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
   * 创建元件2.5D形状（更新为使用独立几何元素）
   * 
   * @param processedData - 处理后的元件数据
   * @returns 形状元素ID引用
   */
  private createComponentShape(processedData: ProcessedComponentData): string {
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
    // 这是一个临时方法，用于在构建过程中存储几何元素
    // 实际实现中可能需要更复杂的状态管理
    if (!this.context.currentBuildingItem) {
      this.context.currentBuildingItem = {};
    }
    return this.context.currentBuildingItem;
  }
  
  /**
   * 创建3D模型引用
   * 
   * @param modelData - 3D模型数据
   * @returns 3D模型引用对象
   */
  private create3DModelReference(modelData: ComponentData['model3D']): EDMD3DModel {
    const modelId = this.generateItemId('MODEL3D', modelData!.path.replace(/[^\w]/g, '_'));
    
    const model3D: EDMD3DModel = {
      id: modelId,
      ModelIdentifier: modelData!.path,
      MCADFormat: modelData!.format.toUpperCase(),
      ModelVersion: modelData!.version || '1.0'
    };
    
    // # 添加变换（如果有偏移）
    if (modelData!.offset) {
      const { x, y, z, rotation } = modelData!.offset;
      const rotationRad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rotationRad);
      const sin = Math.sin(rotationRad);
      
      model3D.Transformation = {
        TransformationType: 'd3',
        xx: cos, xy: -sin, xz: 0,
        yx: sin, yy: cos, yz: 0,
        zx: 0, zy: 0, zz: 1,
        tx: this.createLengthProperty(x),
        ty: this.createLengthProperty(y),
        tz: this.createLengthProperty(z)
      };
    }
    
    return model3D;
  }
  
  /**
   * 创建元件引脚定义
   * 
   * @param pins - 引脚数据
   * @param componentItemId - 元件定义项目ID
   * @returns 引脚定义数组
   */
  private createPackagePins(
    pins: ComponentData['pins'],
    componentItemId: string
  ): PackagePin[] {
    return pins!.map(pin => {
      const pinShape = pin.shape ? this.createPinShape(pin.shape, pin.number) : undefined;
      
      return {
        pinNumber: pin.number,
        primary: pin.isPrimary,
        Point: {
          id: this.generateItemId('POINT', `PIN_${pin.number}`),
          X: this.geometryUtils.roundValue(pin.position.x),
          Y: this.geometryUtils.roundValue(pin.position.y)
        },
        Shape: pinShape || this.createDefaultPinShape(pin.number)
      };
    });
  }
  
  /**
   * 创建默认引脚形状
   * 
   * @param pinNumber - 引脚编号
   * @returns 默认引脚形状
   */
  private createDefaultPinShape(pinNumber: string): EDMDShapeElement {
    // # 创建默认圆形引脚形状
    const circle: EDMDCircleCenter = {
      id: this.generateItemId('CIRCLE', `PIN_DEFAULT_${pinNumber}`),
      curveType: 'EDMDCircleCenter',
      CenterPoint: {
        id: this.generateItemId('POINT', `PIN_CENTER_${pinNumber}`),
        X: 0,
        Y: 0
      },
      Diameter: this.createLengthProperty(0.5) // 默认0.5mm直径
    };
    
    const curveSet: EDMDCurveSet2D = this.createCurveSet2D(0, 0.5, [circle]);
    
    return {
      id: this.generateItemId('SHAPE', `PIN_${pinNumber}`),
      ShapeElementType: ShapeElementType.COMPONENT_TERMINAL,
      DefiningShape: curveSet,
      Inverted: false
    };
  }
  
  /**
   * 创建引脚形状（根据输入数据）
   * 
   * @param shapeData - 形状数据
   * @param pinNumber - 引脚编号
   * @returns 引脚形状元素
   */
  private createPinShape(shapeData: any, pinNumber: string): EDMDShapeElement | undefined {
    // TODO(元件构建器): 2024-03-20 实现引脚形状创建 [P1-IMPORTANT]
    this.context.addWarning('PIN_SHAPE_NOT_IMPLEMENTED',
      `引脚${pinNumber}的自定义形状创建暂未实现，使用默认形状`);
    
    return this.createDefaultPinShape(pinNumber);
  }
  
  /**
   * 创建元件用户属性
   * 
   * @param processedData - 处理后的元件数据
   * @returns 用户属性数组
   */
  private createComponentProperties(processedData: ProcessedComponentData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'REFDES'
        },
        Value: processedData.refDes
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'PARTNUM'
        },
        Value: processedData.partNumber
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'PKGNAME'
        },
        Value: processedData.packageName
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LAYER'
        },
        Value: processedData.layer
      }
    ];
    
    // # 添加尺寸属性
    properties.push(
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'WIDTH'
        },
        Value: processedData.dimensions.width.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'HEIGHT'
        },
        Value: processedData.dimensions.height.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'THICKNESS'
        },
        Value: processedData.dimensions.thickness.toString()
      }
    );
    
    // # 添加位置属性
    properties.push(
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POS_X'
        },
        Value: processedData.position.x.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POS_Y'
        },
        Value: processedData.position.y.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'ROTATION'
        },
        Value: processedData.position.rotation.toString()
      }
    );
    
    // # 添加电气属性
    if (processedData.electrical) {
      const { capacitance, resistance, inductance, tolerance } = processedData.electrical;
      
      if (capacitance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'CAPACITANCE'
          },
          Value: capacitance.toString()
        });
      }
      
      if (resistance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'RESISTANCE'
          },
          Value: resistance.toString()
        });
      }
      
      if (inductance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'INDUCTANCE'
          },
          Value: inductance.toString()
        });
      }
      
      if (tolerance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'TOLERANCE'
          },
          Value: tolerance.toString()
        });
      }
    }
    
    // # 添加热属性
    if (processedData.thermal) {
      const { powerRating, maxPower, thermalConductivity, junctionToBoardResistance, junctionToCaseResistance } = processedData.thermal;
      
      if (powerRating !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'POWER_OPR'
          },
          Value: powerRating.toString()
        });
      }
      
      if (maxPower !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'POWER_MAX'
          },
          Value: maxPower.toString()
        });
      }
      
      if (thermalConductivity !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'THERM_COND'
          },
          Value: thermalConductivity.toString()
        });
      }
      
      if (junctionToBoardResistance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'THETA_JB'
          },
          Value: junctionToBoardResistance.toString()
        });
      }
      
      if (junctionToCaseResistance !== undefined) {
        properties.push({
          Key: {
            SystemScope: this.config.creatorSystem,
            ObjectName: 'THETA_JC'
          },
          Value: junctionToCaseResistance.toString()
        });
      }
    }
    
    return properties;
  }
  
  /**
   * 获取元件描述
   * 
   * @param processedData - 处理后的元件数据
   * @returns 描述字符串
   */
  private getComponentDescription(processedData: ProcessedComponentData): string {
    const type = processedData.isMechanical ? '机械' : '电气';
    const baseDesc = `${type}元件 ${processedData.refDes} (${processedData.partNumber})`;
    
    if (processedData.electrical?.capacitance) {
      return `${baseDesc}, 电容: ${processedData.electrical.capacitance}F`;
    }
    
    if (processedData.electrical?.resistance) {
      return `${baseDesc}, 电阻: ${processedData.electrical.resistance}Ω`;
    }
    
    return baseDesc;
  }
}