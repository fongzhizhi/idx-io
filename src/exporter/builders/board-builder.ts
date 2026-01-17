// ============= src/exporter/builders/board-builder.ts =============

// # PCB板构建器
// DESIGN: 支持多种板类型：刚性板、柔性板、加强筋区域等
// REF: IDXv4.5规范第6.1节，特别是2.5D几何表示
// BUSINESS: 板子是所有其他元素的容器，必须首先构建

import { 
  BaseBuilder, BuilderConfig, BuilderContext, BuildError, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, GeometryType, 
  EDMDShapeElement, ShapeElementType,
  CartesianPoint, EDMDPolyLine, EDMDCurveSet2D,
  EDMDUserSimpleProperty
} from '../../types/core';
import { LayerStackupData } from '../../types/data-models';

// # 输入数据类型定义
/**
 * PCB板数据接口
 * 
 * @remarks
 * 描述PCB板的基本信息和几何形状
 * BUSINESS: 必须包含轮廓点和厚度信息
 */
export interface BoardData {
  /** 板子唯一标识符 */
  id: string;
  
  /** 板子名称 */
  name: string;
  
  /** 板子轮廓定义 */
  outline: {
    /** 轮廓点列表（顺时针或逆时针） */
    points: Array<{ x: number; y: number }>;
    
    /** 板子厚度（mm） */
    thickness: number;
    
    /** 板子材质（可选） */
    material?: string;
    
    /** 表面处理（可选） */
    finish?: string;
  };
  
  /** 层叠结构（可选） */
  layerStackup?: LayerStackupData;
  
  /** 切口列表（可选） */
  cutouts?: Array<{
    id: string;
    shape: 'circle' | 'rectangle' | 'polygon';
    parameters: any;
    depth: number; // 切口深度，0表示通孔
  }>;
  
  /** 加强筋区域列表（可选） */
  stiffeners?: Array<{
    id: string;
    name: string;
    shape: {
      points: Array<{ x: number; y: number }>;
    };
    thickness: number; // 加强筋厚度（通常大于板子厚度）
  }>;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/**
 * 处理后的板子数据
 * 
 * @remarks
 * 经过预处理和验证的内部数据结构
 */
interface ProcessedBoardData {
  id: string;
  name: string;
  outline: {
    points: CartesianPoint[];
    thickness: number;
  };
  layerStackup?: LayerStackupData;
  cutouts: Array<{
    id: string;
    shape: EDMDCurveSet2D;
    inverted: boolean; // true表示减去材料
  }>;
  stiffeners: Array<{
    id: string;
    name: string;
    shape: EDMDCurveSet2D;
  }>;
}

// ============= PCB板构建器类 =============
/**
 * PCB板构建器
 * 
 * @remarks
 * 负责构建PCB板的EDMDItem表示，支持板轮廓和加强筋区域
 * DESIGN: 使用装配体项目包含所有板元素
 * PERFORMANCE: 板子通常包含大量几何，注意内存使用
 */
export class BoardBuilder extends BaseBuilder<BoardData, EDMDItem> {
  
  // ============= 输入验证 =============
  /**
   * 验证板子数据
   * 
   * @remarks
   * BUSINESS: PCB板必须具有有效的轮廓和厚度
   * SECURITY: 防止几何数据无效导致构建失败
   * 
   * @param input - 板子数据
   * @returns 验证结果
   */
  protected validateInput(input: BoardData): ValidationResult<BoardData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // # 基础验证
    if (!input.id || !input.name) {
      errors.push('板子ID和名称不能为空');
    }
    
    if (!input.outline) {
      errors.push('板子轮廓数据不能为空');
      return { valid: false, errors, warnings };
    }
    
    // # 轮廓验证
    const { points, thickness } = input.outline;
    
    if (!points || points.length < 3) {
      errors.push(`板子轮廓至少需要3个点，当前: ${points?.length || 0}`);
    }
    
    if (thickness <= 0) {
      errors.push(`板子厚度必须大于0，当前: ${thickness}`);
    }
    
    // # 点数据验证
    points?.forEach((point, index) => {
      if (isNaN(point.x) || isNaN(point.y)) {
        errors.push(`轮廓点${index}坐标无效: x=${point.x}, y=${point.y}`);
      }
    });
    
    // # 切口验证
    input.cutouts?.forEach((cutout) => {
      if (cutout.depth < 0) {
        errors.push(`切口${cutout.id}深度不能为负数: ${cutout.depth}`);
      }
    });
    
    // # 加强筋验证
    input.stiffeners?.forEach((stiffener) => {
      if (stiffener.thickness <= 0) {
        errors.push(`加强筋${stiffener.id}厚度必须大于0: ${stiffener.thickness}`);
      }
    });
    
    // # 警告收集
    if (!input.outline.material) {
      warnings.push('板子材质未指定，将使用默认值');
    }
    
    if (points && points.length > 100) {
      warnings.push('板子轮廓点数量较多，可能影响性能');
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
   * 预处理板子数据
   * 
   * @remarks
   * PERFORMANCE: 将原始点数据转换为IDX格式，减少构建时重复计算
   * 
   * @param input - 验证后的板子数据
   * @returns 处理后的板子数据
   */
  protected async preProcess(input: BoardData): Promise<ProcessedBoardData> {
    // # 生成唯一的板子前缀，避免ID冲突
    const boardPrefix = `BOARD_${input.id.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    
    // # 转换轮廓点，使用更唯一的ID命名
    const outlinePoints = input.outline.points.map((point, index) => ({
      id: `${boardPrefix}_PT${index + 1}`,
      X: this.geometryUtils.roundValue(point.x),
      Y: this.geometryUtils.roundValue(point.y)
    }));
    
    return {
      id: input.id,
      name: input.name,
      outline: {
        points: outlinePoints,
        thickness: input.outline.thickness
      },
      layerStackup: input.layerStackup,
      cutouts: [],
      stiffeners: []
    };
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建PCB板EDMDItem
   * 
   * @remarks
   * DESIGN: 根据IDX v4.5规范创建正确的Item层次结构
   * - 创建single类型的Item定义几何
   * - 创建assembly类型的Item包含ItemInstance
   * BUSINESS: 符合规范第19页和45-46页的要求
   * 
   * @param processedData - 处理后的板子数据
   * @returns PCB板EDMDItem（返回assembly类型，single类型通过geometricElements传递）
   */
  protected async construct(processedData: ProcessedBoardData): Promise<EDMDItem> {
    // # 生成独立的几何元素
    const geometryData = this.createIndependentGeometry(processedData);
    
    // # 1. 创建single类型的Item（定义几何）
    const boardPrefix = `BOARD_${processedData.id.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    const boardDefinitionItem: EDMDItem = {
      id: `${boardPrefix}_DEF_001`,
      ItemType: ItemType.SINGLE,
      Name: `${processedData.name} Definition`,
      Description: `Board geometry definition for ${processedData.name}`,
      Identifier: this.createIdentifier('BOARD_DEF', processedData.id),
      Shape: geometryData.shapeElementId,
      BaseLine: true // 在基线文件中，定义项也应该是基线的一部分
    };
    
    // # 2. 创建assembly类型的Item（包含ItemInstance）
    const boardAssemblyItem: EDMDItem = {
      id: `${boardPrefix}_ASSY_001`,
      ItemType: ItemType.ASSEMBLY,
      Name: processedData.name,
      Description: `PCB板: ${processedData.name}, 厚度: ${processedData.outline.thickness}mm`,
      geometryType: this.config.useSimplified ? GeometryType.BOARD_OUTLINE as any : undefined,
      Identifier: this.createIdentifier('BOARD_ASSY', processedData.id),
      
      // # ItemInstance - 引用single类型的Item
      ItemInstances: [{
        id: `${boardPrefix}_INST_001`,
        Item: boardDefinitionItem.id,
        InstanceName: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BoardInstance1'
        },
        // # 2D变换（无旋转，在原点）
        Transformation: {
          TransformationType: 'd2',
          xx: 1,
          xy: 0,
          yx: 0,
          yy: 1,
          tx: { Value: 0 },
          ty: { Value: 0 }
        }
      }]
    };
    
    // # 根据是否有层叠结构决定AssembleToName
    if (processedData.layerStackup && processedData.layerStackup.layers.length > 0) {
      // 有层叠结构时，引用底层作为参考表面
      const bottomLayer = this.getBottomLayer(processedData.layerStackup);
      if (bottomLayer) {
        boardAssemblyItem.AssembleToName = bottomLayer.layerId;
      }
    }
    // 没有层叠结构时，不设置AssembleToName（符合IDX v4.5指南4.1.1节）
    
    // # 添加用户属性到assembly项
    boardAssemblyItem.UserProperties = this.createBoardProperties(processedData);
    
    // # 将几何元素和定义项附加到assembly项上（临时存储，DatasetAssembler会提取）
    (boardAssemblyItem as any).geometricElements = geometryData.geometricElements;
    (boardAssemblyItem as any).curveSet2Ds = geometryData.curveSet2Ds;
    (boardAssemblyItem as any).shapeElements = geometryData.shapeElements;
    (boardAssemblyItem as any).boardDefinitionItem = boardDefinitionItem; // 传递定义项
    
    return boardAssemblyItem;
  }
  
  // ============= 后处理 =============
  /**
   * 后处理板子项目
   * 
   * @remarks
   * 验证构建结果并添加必要的元数据
   * 
   * @param output - 构建的板子项目
   * @returns 验证后的板子项目
   */
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    // # 验证基本结构
    if (!output.id || !output.ItemType) {
      throw new BuildError('板子项目缺少必需字段');
    }
    
    // # 添加构建元数据
    if (!output.UserProperties) {
      output.UserProperties = [];
    }
    
    output.UserProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'BUILD_TIMESTAMP'
      },
      Value: new Date().toISOString()
    });
    
    // # 添加基线标记 - 根据需求 10.1-10.4 使用正确格式
    output.BaseLine = true;
    
    // # 记录构建统计
    this.context.addWarning('BOARD_BUILT', 
      `PCB板构建完成: ${output.Name} (ID: ${output.id})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 创建独立的几何元素
   * 
   * @param processedData - 处理后的板子数据
   * @returns 几何元素数据
   */
  private createIndependentGeometry(processedData: ProcessedBoardData): {
    geometricElements: any[];
    curveSet2Ds: any[];
    shapeElements: any[];
    shapeElementId: string;
  } {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    // # 生成唯一的板子前缀
    const boardPrefix = `BOARD_${processedData.id.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    
    // # 确保轮廓点为逆时针方向（外轮廓标准）
    const orderedPoints = this.ensureCounterClockwiseOrder(processedData.outline.points);
    
    // # 检查是否为圆形板子
    const circleInfo = this.detectCircularBoard(orderedPoints);
    
    if (circleInfo) {
      // 使用圆形几何表示（更高效）
      return this.createCircularGeometry(processedData, boardPrefix, circleInfo);
    } else {
      // 使用多边形几何表示
      return this.createPolygonGeometry(processedData, boardPrefix, orderedPoints);
    }
  }
  
  /**
   * 检测是否为圆形板子
   * 
   * @param points - 轮廓点数组
   * @returns 圆形信息，如果不是圆形则返回null
   */
  private detectCircularBoard(points: CartesianPoint[]): { centerX: number; centerY: number; radius: number } | null {
    if (points.length < 8) {
      return null; // 点数太少，不太可能是圆形近似
    }
    
    // 计算几何中心
    const centerX = points.reduce((sum, p) => sum + p.X, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.Y, 0) / points.length;
    
    // 计算到中心的距离
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.X - centerX, 2) + Math.pow(p.Y - centerY, 2))
    );
    
    // 检查距离的一致性
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgRadius)));
    
    // 如果最大偏差小于平均半径的5%，认为是圆形
    const tolerance = avgRadius * 0.05;
    
    if (maxDeviation <= tolerance && avgRadius > 0) {
      return {
        centerX: this.geometryUtils.roundValue(centerX),
        centerY: this.geometryUtils.roundValue(centerY),
        radius: this.geometryUtils.roundValue(avgRadius)
      };
    }
    
    return null;
  }
  
  /**
   * 创建圆形几何元素
   */
  private createCircularGeometry(
    processedData: ProcessedBoardData,
    boardPrefix: string,
    circleInfo: { centerX: number; centerY: number; radius: number }
  ) {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    // 1. 创建中心点
    const centerPointId = `${boardPrefix}_CENTER`;
    geometricElements.push({
      id: centerPointId,
      'xsi:type': 'd2:EDMDCartesianPoint',
      'X': { 'property:Value': circleInfo.centerX.toString() },
      'Y': { 'property:Value': circleInfo.centerY.toString() }
    });
    
    // 2. 创建圆形
    const circleId = `${boardPrefix}_CIRCLE`;
    geometricElements.push({
      id: circleId,
      'xsi:type': 'd2:EDMDCircleCenter',
      'd2:CenterPoint': centerPointId,
      'd2:Diameter': { 'property:Value': (circleInfo.radius * 2).toString() }
    });
    
    // 3. 创建曲线集（CurveSet2D）
    const curveSetId = `${boardPrefix}_CURVESET`;
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': '0' },
      'd2:UpperBound': { 'property:Value': processedData.outline.thickness.toString() },
      'd2:DetailedGeometricModelElement': circleId
    });
    
    // 4. 创建形状元素（ShapeElement）
    const shapeElementId = `${boardPrefix}_SHAPE`;
    shapeElements.push({
      id: shapeElementId,
      'pdm:ShapeElementType': 'FeatureShapeElement',
      'pdm:Inverted': 'false',
      'pdm:DefiningShape': curveSetId
    });
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      shapeElementId
    };
  }
  
  /**
   * 创建多边形几何元素
   */
  private createPolygonGeometry(
    processedData: ProcessedBoardData,
    boardPrefix: string,
    orderedPoints: CartesianPoint[]
  ) {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    
    // 1. 创建轮廓点（CartesianPoint）
    orderedPoints.forEach(point => {
      geometricElements.push({
        id: point.id,
        'xsi:type': 'd2:EDMDCartesianPoint',
        'X': { 'property:Value': point.X.toString() },
        'Y': { 'property:Value': point.Y.toString() }
      });
    });
    
    // 2. 创建轮廓多边形（PolyLine）
    const polyLineId = `${boardPrefix}_OUTLINE`;
    const polyLinePoints = orderedPoints.map(p => p.id);
    // 确保闭合多边形
    if (polyLinePoints[0] !== polyLinePoints[polyLinePoints.length - 1]) {
      polyLinePoints.push(polyLinePoints[0]);
    }
    
    geometricElements.push({
      id: polyLineId,
      type: 'PolyLine',
      'Point': polyLinePoints.map(pointId => ({ 'd2:Point': pointId }))
    });
    
    // 3. 创建曲线集（CurveSet2D）
    const curveSetId = `${boardPrefix}_CURVESET`;
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': '0' },
      'd2:UpperBound': { 'property:Value': processedData.outline.thickness.toString() },
      'd2:DetailedGeometricModelElement': polyLineId
    });
    
    // 4. 创建形状元素（ShapeElement）
    const shapeElementId = `${boardPrefix}_SHAPE`;
    shapeElements.push({
      id: shapeElementId,
      'pdm:ShapeElementType': 'FeatureShapeElement',
      'pdm:Inverted': 'false',
      'pdm:DefiningShape': curveSetId
    });
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      shapeElementId
    };
  }
  
  /**
   * 确保轮廓点为逆时针方向（外轮廓标准）
   * 
   * @param points - 原始点数组
   * @returns 逆时针排序的点数组
   */
  private ensureCounterClockwiseOrder(points: CartesianPoint[]): CartesianPoint[] {
    if (points.length < 3) return points;
    
    // 计算多边形面积（使用鞋带公式）
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += (points[j].X - points[i].X) * (points[j].Y + points[i].Y);
    }
    
    // 如果面积为负，则为顺时针，需要反转为逆时针
    // 根据CAD系统惯例和IDX指南，外轮廓应使用逆时针方向
    if (area < 0) {
      return [...points].reverse();
    }
    
    return points;
  }
  
  /**
   * 创建板子用户属性
   * 
   * @param processedData - 处理后的板子数据
   * @returns 用户属性数组
   */
  private createBoardProperties(processedData: ProcessedBoardData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'THICKNESS'
        },
        Value: processedData.outline.thickness.toString()
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'MATERIAL'
        },
        Value: 'FR4' // 默认材质
      }
    ];
    
    // # 检测板子类型并添加相应属性
    const circleInfo = this.detectCircularBoard(processedData.outline.points);
    
    if (circleInfo) {
      // 圆形板子属性
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_SHAPE'
        },
        Value: 'CIRCULAR'
      });
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'DIAMETER'
        },
        Value: (circleInfo.radius * 2).toString()
      });
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'RADIUS'
        },
        Value: circleInfo.radius.toString()
      });
    } else {
      // 多边形板子属性
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_SHAPE'
        },
        Value: 'POLYGON'
      });
      
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POINT_COUNT'
        },
        Value: processedData.outline.points.length.toString()
      });
      
      // 添加多边形方向信息
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'POLYGON_ORIENTATION'
        },
        Value: 'COUNTERCLOCKWISE'
      });
      
      // 计算并添加板子尺寸
      const dimensions = this.calculateBoardDimensions(processedData.outline.points);
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_DIMENSIONS'
        },
        Value: `${dimensions.width}x${dimensions.height}mm`
      });
      
      // 计算并添加板子面积
      const area = this.calculatePolygonArea(processedData.outline.points);
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_AREA'
        },
        Value: `${area.toFixed(2)}mm²`
      });
    }
    
    // # 添加切口数量属性
    if (processedData.cutouts.length > 0) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'CUTOUT_COUNT'
        },
        Value: processedData.cutouts.length.toString()
      });
    }
    
    // # 添加加强筋数量属性
    if (processedData.stiffeners.length > 0) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'STIFFENER_COUNT'
        },
        Value: processedData.stiffeners.length.toString()
      });
    }
    
    return properties;
  }
  
  /**
   * 计算板子边界框尺寸
   */
  private calculateBoardDimensions(points: CartesianPoint[]): { width: number; height: number } {
    if (points.length === 0) {
      return { width: 0, height: 0 };
    }
    
    let minX = points[0].X;
    let maxX = points[0].X;
    let minY = points[0].Y;
    let maxY = points[0].Y;
    
    for (const point of points) {
      minX = Math.min(minX, point.X);
      maxX = Math.max(maxX, point.X);
      minY = Math.min(minY, point.Y);
      maxY = Math.max(maxY, point.Y);
    }
    
    return {
      width: this.geometryUtils.roundValue(maxX - minX),
      height: this.geometryUtils.roundValue(maxY - minY)
    };
  }
  
  /**
   * 计算多边形面积
   */
  private calculatePolygonArea(points: CartesianPoint[]): number {
    if (points.length < 3) {
      return 0;
    }
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].X * points[j].Y - points[j].X * points[i].Y;
    }
    
    return Math.abs(area / 2);
  }
  
  /**
   * 获取层叠结构中的底层
   * 
   * @param layerStackup - 层叠结构数据
   * @returns 底层信息，如果没有找到则返回undefined
   */
  private getBottomLayer(layerStackup: LayerStackupData) {
    if (!layerStackup.layers || layerStackup.layers.length === 0) {
      return undefined;
    }
    
    // 按位置排序，找到最底层（position最小的）
    const sortedLayers = [...layerStackup.layers].sort((a, b) => a.position - b.position);
    return sortedLayers[0];
  }
  
  /**
   * 获取层叠结构中的顶层
   * 
   * @param layerStackup - 层叠结构数据
   * @returns 顶层信息，如果没有找到则返回undefined
   */
  private getTopLayer(layerStackup: LayerStackupData) {
    if (!layerStackup.layers || layerStackup.layers.length === 0) {
      return undefined;
    }
    
    // 按位置排序，找到最顶层（position最大的）
    const sortedLayers = [...layerStackup.layers].sort((a, b) => b.position - a.position);
    return sortedLayers[0];
  }
}