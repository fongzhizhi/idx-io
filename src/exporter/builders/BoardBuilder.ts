// ============= PCB板构建器 =============
// DESIGN: 支持两种板子建模类型：BOARD_OUTLINE 和 BOARD_AREA_RIGID
// REF: IDXv4.5规范第46-61页，板子建模详细说明

import { 
  BaseBuilder, BuildError, ValidationResult 
} from './BaseBuilder';
import {
  EDMDItem, ItemType, StandardGeometryType, 
  CartesianPoint, EDMDCurveSet2D,
  EDMDUserSimpleProperty, StratumType, StratumSurfaceDesignation,
  ShapeElementType
} from '../../types/core';
import { LayerStackupData } from '../../types/data-models';
import {
  BoardData, ProcessedBoardData, GeometryData, CircleInfo,
  BoardGeometryType, ZAxisReference
} from '../../types/builder';

// ============= PCB板构建器类 =============

/**
 * PCB板构建器
 * 
 * @remarks
 * 负责构建PCB板的EDMDItem表示，支持板轮廓和加强筋区域
 * 
 * @example
 * ```typescript
 * const builder = new BoardBuilder(config, context);
 * const boardItem = await builder.build(boardData);
 * ```
 */
export class BoardBuilder extends BaseBuilder<BoardData, EDMDItem> {
  
  // ============= 输入验证 =============
  
  /**
   * 验证板子数据
   * 
   * @param input - 板子数据
   * @returns 验证结果
   */
  protected validateInput(input: BoardData): ValidationResult<BoardData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // 基础验证
    if (!input.id || !input.name) {
      errors.push('板子ID和名称不能为空');
    }
    
    if (!input.outline) {
      errors.push('板子轮廓数据不能为空');
      return { valid: false, errors, warnings };
    }
    
    // 轮廓验证
    const { points, thickness } = input.outline;
    
    if (!points || points.length < 3) {
      errors.push(`板子轮廓至少需要3个点，当前: ${points?.length || 0}`);
    }
    
    if (thickness <= 0) {
      errors.push(`板子厚度必须大于0，当前: ${thickness}`);
    }
    
    // 点数据验证
    points?.forEach((point, index) => {
      if (isNaN(point.x) || isNaN(point.y)) {
        errors.push(`轮廓点${index}坐标无效: x=${point.x}, y=${point.y}`);
      }
    });
    
    // 切口验证
    input.cutouts?.forEach((cutout) => {
      if (cutout.depth < 0) {
        errors.push(`切口${cutout.id}深度不能为负数: ${cutout.depth}`);
      }
    });
    
    // 加强筋验证
    input.stiffeners?.forEach((stiffener) => {
      if (stiffener.thickness <= 0) {
        errors.push(`加强筋${stiffener.id}厚度必须大于0: ${stiffener.thickness}`);
      }
    });
    
    // 警告收集
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
   * @param input - 验证后的板子数据
   * @returns 处理后的板子数据
   */
  protected async preProcess(input: BoardData): Promise<ProcessedBoardData> {
    const boardPrefix = `BOARD_${input.id.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    
    // 转换轮廓点
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
        thickness: input.outline.thickness,
        material: input.outline.material
      },
      layerStackup: input.layerStackup,
      cutouts: [],
      stiffeners: [],
      customProperties: input.properties
    };
  }
  
  // ============= 核心构建逻辑 =============
  
  /**
   * 构建PCB板EDMDItem
   * 
   * @param processedData - 处理后的板子数据
   * @returns PCB板EDMDItem
   */
  protected async construct(processedData: ProcessedBoardData): Promise<EDMDItem> {
    // 根据是否有层叠结构决定板子类型
    const hasLayerStackup = processedData.layerStackup && processedData.layerStackup.layers.length > 0;
    const boardType: BoardGeometryType = 
      hasLayerStackup ? StandardGeometryType.BOARD_AREA_RIGID : StandardGeometryType.BOARD_OUTLINE;
    
    // 验证层堆叠有效性（如果存在）
    if (hasLayerStackup) {
      this.validateLayerStackup(processedData.layerStackup!);
    }
    
    // 生成独立的几何元素
    const geometryData = this.createIndependentGeometry(processedData, boardType);
    
    // 创建single类型的Item（定义几何）
    const boardPrefix = this.generateValidId(`BOARD_${processedData.id}`);
    const boardDefinitionItem: EDMDItem = {
      id: `${boardPrefix}_DEF_001`,
      ItemType: ItemType.SINGLE,
      Name: `${processedData.name} Definition`,
      Description: `Board geometry definition for ${processedData.name}`,
      Identifier: this.createIdentifier('BOARD_DEF', processedData.id),
      Shape: geometryData.shapeElementId,
      BaseLine: true
    };
    
    // 创建assembly类型的Item（包含ItemInstance）
    const boardAssemblyItem: EDMDItem = {
      id: `${boardPrefix}_ASSY_001`,
      ItemType: ItemType.ASSEMBLY,
      Name: processedData.name,
      Description: `PCB板 (${boardType}): ${processedData.name}, 厚度: ${processedData.outline.thickness}mm`,
      geometryType: boardType,
      Identifier: this.createIdentifier('BOARD_ASSY', processedData.id),
      
      ItemInstances: [{
        id: `${boardPrefix}_INST_001`,
        Item: boardDefinitionItem.id,
        InstanceName: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BoardInstance1'
        },
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
    
    // 根据板子类型设置 AssembleToName
    if (boardType === StandardGeometryType.BOARD_AREA_RIGID) {
      if (hasLayerStackup) {
        boardAssemblyItem.AssembleToName = this.getLayerStackupReferenceName(processedData.layerStackup!);
      } else {
        throw new BuildError('BOARD_AREA_RIGID 类型必须有层叠结构');
      }
    }
    
    // 添加用户属性
    boardAssemblyItem.UserProperties = this.createBoardProperties(processedData, boardType);
    
    // 将几何元素附加到assembly项上
    (boardAssemblyItem as any).geometricElements = geometryData.geometricElements;
    (boardAssemblyItem as any).curveSet2Ds = geometryData.curveSet2Ds;
    (boardAssemblyItem as any).shapeElements = geometryData.shapeElements;
    (boardAssemblyItem as any).stratumElements = geometryData.stratumElements;
    (boardAssemblyItem as any).boardDefinitionItem = boardDefinitionItem;
    
    return boardAssemblyItem;
  }
  
  // ============= 后处理 =============
  
  /**
   * 后处理板子项目
   * 
   * @param output - 构建的板子项目
   * @returns 验证后的板子项目
   */
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    if (!output.id || !output.ItemType) {
      throw new BuildError('板子项目缺少必需字段');
    }
    
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
    
    output.BaseLine = true;
    
    this.context.addWarning('BOARD_BUILT', 
      `PCB板构建完成: ${output.Name} (ID: ${output.id})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  
  /**
   * 验证层堆叠有效性
   */
  private validateLayerStackup(layerStackup: LayerStackupData): void {
    if (!layerStackup.id && !layerStackup.name) {
      throw new BuildError('层堆叠必须有ID或名称');
    }
    
    layerStackup.layers.forEach((layer, index) => {
      if (layer.thickness <= 0) {
        throw new BuildError(`层 ${index} 厚度必须大于0: ${layer.thickness}`);
      }
      
      if (!layer.layerId) {
        throw new BuildError(`层 ${index} 缺少layerId`);
      }
      
      if (!layer.material) {
        this.context.addWarning('LAYER_MISSING_MATERIAL', 
          `层 ${layer.layerId} 缺少材料信息，将使用默认值`);
      }
    });
    
    // 验证总厚度一致性
    const calculatedThickness = layerStackup.layers.reduce((sum, layer) => sum + layer.thickness, 0);
    if (layerStackup.totalThickness && 
        Math.abs(calculatedThickness - layerStackup.totalThickness) > 0.001) {
      this.context.addWarning('THICKNESS_MISMATCH', 
        `层堆叠总厚度不匹配: 计算值=${calculatedThickness}, 声明值=${layerStackup.totalThickness}`);
    }
  }
  
  /**
   * 生成有效的XML ID
   */
  private generateValidId(base: string, suffix?: string): string {
    let validId = base.replace(/[^A-Za-z0-9_\-\.]/g, '_');
    
    if (/^\d/.test(validId)) {
      validId = `ID_${validId}`;
    }
    
    if (validId.length > 50) {
      validId = validId.substring(0, 50);
    }
    
    if (suffix) {
      validId = `${validId}_${suffix}`;
    }
    
    if (!validId || validId === '_') {
      validId = 'GENERATED_ID';
    }
    
    return validId;
  }
  
  /**
   * 计算Z轴边界
   */
  private getZBounds(
    boardData: ProcessedBoardData, 
    zReference: ZAxisReference = 'BOTTOM'
  ): { lower: number; upper: number } {
    const thickness = boardData.outline.thickness;
    
    switch (zReference) {
      case 'BOTTOM':
        return { lower: 0, upper: thickness };
      case 'TOP':
        return { lower: -thickness, upper: 0 };
      case 'CENTER':
        const halfThickness = thickness / 2;
        return { lower: -halfThickness, upper: halfThickness };
      default:
        return { lower: 0, upper: thickness };
    }
  }
  
  /**
   * 创建独立的几何元素
   */
  private createIndependentGeometry(
    processedData: ProcessedBoardData, 
    boardType: BoardGeometryType
  ): GeometryData {
    const boardPrefix = this.generateValidId(`BOARD_${processedData.id}`);
    const orderedPoints = this.ensureCounterClockwiseOrder(processedData.outline.points);
    const circleInfo = this.detectCircularBoard(orderedPoints);
    const useStratum = boardType === StandardGeometryType.BOARD_AREA_RIGID;
    
    if (circleInfo) {
      return this.createCircularGeometry(processedData, boardPrefix, circleInfo, useStratum);
    } else {
      return this.createPolygonGeometry(processedData, boardPrefix, orderedPoints, useStratum);
    }
  }
  
  /**
   * 检测是否为圆形板子
   */
  private detectCircularBoard(points: CartesianPoint[]): CircleInfo | null {
    if (points.length < 8) {
      return null;
    }
    
    const centerX = points.reduce((sum, p) => sum + p.X, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.Y, 0) / points.length;
    
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.X - centerX, 2) + Math.pow(p.Y - centerY, 2))
    );
    
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgRadius)));
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
    circleInfo: CircleInfo,
    useStratum: boolean
  ): GeometryData {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    const stratumElements: any[] = [];
    
    // 创建中心点
    const centerPointId = `${boardPrefix}_CENTER`;
    geometricElements.push({
      id: centerPointId,
      'xsi:type': 'd2:EDMDCartesianPoint',
      'X': { 'property:Value': circleInfo.centerX.toString() },
      'Y': { 'property:Value': circleInfo.centerY.toString() }
    });
    
    // 创建圆形
    const circleId = `${boardPrefix}_CIRCLE`;
    geometricElements.push({
      id: circleId,
      'xsi:type': 'd2:EDMDCircleCenter',
      'd2:CenterPoint': centerPointId,
      'd2:Diameter': { 'property:Value': (circleInfo.radius * 2).toString() }
    });
    
    // 创建曲线集
    const curveSetId = `${boardPrefix}_CURVESET`;
    const zBounds = this.getZBounds(processedData);
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': zBounds.lower.toString() },
      'd2:UpperBound': { 'property:Value': zBounds.upper.toString() },
      'd2:DetailedGeometricModelElement': circleId
    });
    
    // 创建形状元素
    const shapeElementId = `${boardPrefix}_SHAPE`;
    shapeElements.push({
      id: shapeElementId,
      'pdm:ShapeElementType': ShapeElementType.FEATURE_SHAPE_ELEMENT,
      'pdm:Inverted': 'false',
      'pdm:DefiningShape': curveSetId
    });
    
    let finalShapeElementId = shapeElementId;
    
    // 根据板子类型决定是否创建 Stratum 对象
    if (useStratum) {
      const stratumId = `${boardPrefix}_STRATUM`;
      stratumElements.push({
        id: stratumId,
        'xsi:type': 'pdm:EDMDStratum',
        'pdm:ShapeElement': shapeElementId,
        'pdm:StratumType': StratumType.DESIGN_LAYER_STRATUM,
        'pdm:StratumSurfaceDesignation': StratumSurfaceDesignation.PRIMARY_SURFACE
      });
      finalShapeElementId = stratumId;
    }
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      stratumElements,
      shapeElementId: finalShapeElementId
    };
  }
  
  /**
   * 创建多边形几何元素
   */
  private createPolygonGeometry(
    processedData: ProcessedBoardData,
    boardPrefix: string,
    orderedPoints: CartesianPoint[],
    useStratum: boolean
  ): GeometryData {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    const stratumElements: any[] = [];
    
    // 创建轮廓点
    orderedPoints.forEach(point => {
      geometricElements.push({
        id: point.id,
        'xsi:type': 'd2:EDMDCartesianPoint',
        'X': { 'property:Value': point.X.toString() },
        'Y': { 'property:Value': point.Y.toString() }
      });
    });
    
    // 创建轮廓多边形
    const polyLineId = `${boardPrefix}_OUTLINE`;
    const polyLinePoints = orderedPoints.map(p => p.id);
    if (polyLinePoints[0] !== polyLinePoints[polyLinePoints.length - 1]) {
      polyLinePoints.push(polyLinePoints[0]);
    }
    
    geometricElements.push({
      id: polyLineId,
      type: 'PolyLine',
      'Point': polyLinePoints.map(pointId => ({ 'd2:Point': pointId }))
    });
    
    // 创建曲线集
    const curveSetId = `${boardPrefix}_CURVESET`;
    const zBounds = this.getZBounds(processedData);
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': zBounds.lower.toString() },
      'd2:UpperBound': { 'property:Value': zBounds.upper.toString() },
      'd2:DetailedGeometricModelElement': polyLineId
    });
    
    // 创建形状元素
    const shapeElementId = `${boardPrefix}_SHAPE`;
    shapeElements.push({
      id: shapeElementId,
      'pdm:ShapeElementType': ShapeElementType.FEATURE_SHAPE_ELEMENT,
      'pdm:Inverted': 'false',
      'pdm:DefiningShape': curveSetId
    });
    
    let finalShapeElementId = shapeElementId;
    
    // 根据板子类型决定是否创建 Stratum 对象
    if (useStratum) {
      const stratumId = `${boardPrefix}_STRATUM`;
      stratumElements.push({
        id: stratumId,
        'xsi:type': 'pdm:EDMDStratum',
        'pdm:ShapeElement': shapeElementId,
        'pdm:StratumType': StratumType.DESIGN_LAYER_STRATUM,
        'pdm:StratumSurfaceDesignation': StratumSurfaceDesignation.PRIMARY_SURFACE
      });
      finalShapeElementId = stratumId;
    }
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      stratumElements,
      shapeElementId: finalShapeElementId
    };
  }
  
  /**
   * 确保轮廓点为逆时针方向
   */
  private ensureCounterClockwiseOrder(points: CartesianPoint[]): CartesianPoint[] {
    if (points.length < 3) return points;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += (points[j].X - points[i].X) * (points[j].Y + points[i].Y);
    }
    
    if (area < 0) {
      return [...points].reverse();
    }
    
    return points;
  }
  
  /**
   * 创建板子用户属性
   */
  private createBoardProperties(
    processedData: ProcessedBoardData, 
    boardType: BoardGeometryType
  ): EDMDUserSimpleProperty[] {
    const standardProperties: EDMDUserSimpleProperty[] = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'THICKNESS'
        },
        Value: processedData.outline.thickness.toString()
      }
    ];
    
    // 材质属性
    const material = processedData.outline.material || 'FR4';
    const standardMaterials = ['FR4', 'FR408', 'ISOLA', 'LCP', 'ROGERS', 'POLYIMIDE'];
    if (standardMaterials.includes(material.toUpperCase())) {
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'MATERIAL'
        },
        Value: material
      });
    }
    
    // 板子类型
    standardProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'MODELING_TYPE'
      },
      Value: boardType
    });
    
    // 几何特征
    const circleInfo = this.detectCircularBoard(processedData.outline.points);
    if (circleInfo) {
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'GEOMETRY_TYPE'
        },
        Value: 'CIRCULAR'
      });
      
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'DIAMETER'
        },
        Value: (circleInfo.radius * 2).toString()
      });
    } else {
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'GEOMETRY_TYPE'
        },
        Value: 'POLYGON'
      });
      
      const area = this.calculatePolygonArea(processedData.outline.points);
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_AREA'
        },
        Value: area.toFixed(2)
      });
    }
    
    // 处理自定义属性
    const customProperties: EDMDUserSimpleProperty[] = [];
    if (processedData.customProperties) {
      const criticalProperties = ['SURFACE_FINISH', 'COPPER_LAYERS', 'BOARD_CLASS', 'IPC_CLASS'];
      
      Object.entries(processedData.customProperties).forEach(([key, value]) => {
        if (criticalProperties.includes(key)) {
          customProperties.push({
            Key: {
              SystemScope: this.config.creatorSystem,
              ObjectName: key
            },
            Value: String(value)
          });
        } else {
          const prefixedKey = key.startsWith('CUSTOM_') ? key : `CUSTOM_${key}`;
          customProperties.push({
            Key: {
              SystemScope: this.config.creatorSystem,
              ObjectName: prefixedKey
            },
            Value: String(value)
          });
        }
      });
    }
    
    return [...standardProperties, ...customProperties];
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
   * 获取层叠结构的引用名称
   */
  private getLayerStackupReferenceName(layerStackup: LayerStackupData): string {
    if (layerStackup.id) {
      return layerStackup.id;
    }
    
    if (layerStackup.name) {
      return layerStackup.name.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
    }
    
    return 'PRIMARY_STACKUP';
  }
}