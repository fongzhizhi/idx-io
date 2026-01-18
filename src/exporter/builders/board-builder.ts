// ============= src/exporter/builders/board-builder.ts =============

// # PCB板构建器
// DESIGN: 支持两种板子建模类型：BOARD_OUTLINE 和 BOARD_AREA_RIGID
// REF: IDXv4.5规范第46-61页，板子建模详细说明
// BUSINESS: 板子是所有其他元素的容器，必须首先构建

// ## 板子类型说明
// 
// ### BOARD_OUTLINE（简单板）
// - 用途：描述整个PCB板的外部轮廓和整体厚度
// - 特点：
//   * 使用LowerBound/UpperBound定义绝对Z范围
//   * 通常LowerBound=0, UpperBound=厚度
//   * 没有AssembleToName属性
//   * 适用于单层板或不需要分层详细信息的板子
// 
// ### BOARD_AREA_RIGID（刚性区域）
// - 用途：描述板子内部的一个区域，该区域使用特定的层堆叠
// - 特点：
//   * 必须通过AssembleToName关联到一个层堆叠（Layer Stackup）
//   * 几何形状定义该区域的XY范围
//   * Z范围由关联的层堆叠决定
//   * 用于多层板、刚柔结合板的不同区域
// 
// ## 选择规则
// - 简单板，无详细层信息 → BOARD_OUTLINE
// - 多层板，需要详细层信息 → BOARD_AREA_RIGID + LAYER_STACKUP
// - 刚柔结合板 → BOARD_AREA_RIGID + BOARD_AREA_FLEXIBLE
// - 有不同厚度区域 → 多个BOARD_AREA_*区域

import { 
  BaseBuilder, BuildError, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, StandardGeometryType, 
  CartesianPoint, EDMDCurveSet2D,
  EDMDUserSimpleProperty, StratumType, StratumSurfaceDesignation,
  ShapeElementType
} from '../../types/core';
import { LayerStackupData } from '../../types/data-models';

// # Z轴参考类型定义
/**
 * Z轴参考点类型
 * 
 * @remarks
 * 定义板子厚度的参考点位置
 */
export type ZAxisReference = 'BOTTOM' | 'CENTER' | 'TOP';
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
    material?: string;
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
  customProperties?: Record<string, any>;
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
   * @remarks
   * DESIGN: 根据IDX v4.5规范创建正确的Item层次结构
   * - 根据是否有层叠结构决定使用 BOARD_OUTLINE 还是 BOARD_AREA_RIGID
   * - BOARD_OUTLINE: 简单板，无层叠结构，无 AssembleToName
   * - BOARD_AREA_RIGID: 复杂板的区域，有层叠结构，必须有 AssembleToName
   * BUSINESS: 符合规范第46-61页的板子建模要求
   * 
   * @param processedData - 处理后的板子数据
   * @returns PCB板EDMDItem（返回assembly类型，single类型通过geometricElements传递）
   */
  protected async construct(processedData: ProcessedBoardData): Promise<EDMDItem> {
    // # 1. 根据是否有层叠结构决定板子类型
    const hasLayerStackup = processedData.layerStackup && processedData.layerStackup.layers.length > 0;
    const boardType: StandardGeometryType.BOARD_OUTLINE | StandardGeometryType.BOARD_AREA_RIGID = 
      hasLayerStackup ? StandardGeometryType.BOARD_AREA_RIGID : StandardGeometryType.BOARD_OUTLINE;
    
    // # 2. 验证层堆叠有效性（如果存在）
    if (hasLayerStackup) {
      this.validateLayerStackup(processedData.layerStackup!);
    }
    
    // # 3. 生成独立的几何元素（根据板子类型决定是否使用 Stratum）
    const geometryData = this.createIndependentGeometry(processedData, boardType);
    
    // # 4. 创建single类型的Item（定义几何）
    const boardPrefix = this.generateValidId(`BOARD_${processedData.id}`);
    const boardDefinitionItem: EDMDItem = {
      id: `${boardPrefix}_DEF_001`,
      ItemType: ItemType.SINGLE,
      Name: `${processedData.name} Definition`,
      Description: `Board geometry definition for ${processedData.name}`,
      Identifier: this.createIdentifier('BOARD_DEF', processedData.id),
      Shape: geometryData.shapeElementId,
      BaseLine: true // 在基线文件中，定义项也应该是基线的一部分
    };
    
    // # 5. 创建assembly类型的Item（包含ItemInstance）
    const boardAssemblyItem: EDMDItem = {
      id: `${boardPrefix}_ASSY_001`,
      ItemType: ItemType.ASSEMBLY,
      Name: processedData.name,
      Description: `PCB板 (${boardType}): ${processedData.name}, 厚度: ${processedData.outline.thickness}mm`,
      geometryType: boardType, // 使用枚举类型
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
    
    // # 6. 根据板子类型设置 AssembleToName
    if (boardType === StandardGeometryType.BOARD_AREA_RIGID) {
      // BOARD_AREA_RIGID 必须关联到层堆叠
      if (hasLayerStackup) {
        // 关联到层堆叠的引用名称
        boardAssemblyItem.AssembleToName = this.getLayerStackupReferenceName(processedData.layerStackup!);
      } else {
        // 这种情况不应该发生，但为了安全起见
        throw new BuildError('BOARD_AREA_RIGID 类型必须有层叠结构');
      }
    }
    // BOARD_OUTLINE 不设置 AssembleToName（符合IDX v4.5规范第46-48页）
    
    // # 7. 添加用户属性到assembly项
    boardAssemblyItem.UserProperties = this.createBoardProperties(processedData, boardType);
    
    // # 8. 将几何元素和定义项附加到assembly项上（临时存储，DatasetAssembler会提取）
    (boardAssemblyItem as any).geometricElements = geometryData.geometricElements;
    (boardAssemblyItem as any).curveSet2Ds = geometryData.curveSet2Ds;
    (boardAssemblyItem as any).shapeElements = geometryData.shapeElements;
    (boardAssemblyItem as any).stratumElements = geometryData.stratumElements; // 新增Stratum元素
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
   * 验证层堆叠有效性
   * 
   * @param layerStackup - 层叠结构数据
   */
  private validateLayerStackup(layerStackup: LayerStackupData): void {
    if (!layerStackup.id && !layerStackup.name) {
      throw new BuildError('层堆叠必须有ID或名称');
    }
    
    // 验证层定义完整性
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
   * 
   * @param base - 基础名称
   * @param suffix - 可选后缀
   * @returns 有效的XML ID
   */
  private generateValidId(base: string, suffix?: string): string {
    // 1. 移除无效字符，只保留字母、数字、下划线、连字符、点
    let validId = base.replace(/[^A-Za-z0-9_\-\.]/g, '_');
    
    // 2. 确保不以数字开头（XML ID要求）
    if (/^\d/.test(validId)) {
      validId = `ID_${validId}`;
    }
    
    // 3. 限制长度（避免过长的ID）
    if (validId.length > 50) {
      validId = validId.substring(0, 50);
    }
    
    // 4. 添加后缀
    if (suffix) {
      validId = `${validId}_${suffix}`;
    }
    
    // 5. 确保不为空
    if (!validId || validId === '_') {
      validId = 'GENERATED_ID';
    }
    
    return validId;
  }
  
  /**
   * 计算Z轴边界
   * 
   * @param boardData - 板子数据
   * @param zReference - Z轴参考点
   * @returns Z轴边界
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
   * 
   * @param processedData - 处理后的板子数据
   * @param boardType - 板子类型，决定是否使用 Stratum
   * @returns 几何元素数据
   */
  private createIndependentGeometry(
    processedData: ProcessedBoardData, 
    boardType: StandardGeometryType.BOARD_OUTLINE | StandardGeometryType.BOARD_AREA_RIGID
  ): {
    geometricElements: any[];
    curveSet2Ds: any[];
    shapeElements: any[];
    stratumElements: any[];
    shapeElementId: string;
  } {
    // # 生成有效的板子前缀
    const boardPrefix = this.generateValidId(`BOARD_${processedData.id}`);
    
    // # 确保轮廓点为逆时针方向（外轮廓标准）
    const orderedPoints = this.ensureCounterClockwiseOrder(processedData.outline.points);
    
    // # 检查是否为圆形板子
    const circleInfo = this.detectCircularBoard(orderedPoints);
    
    // # 根据板子类型决定是否使用 Stratum
    const useStratum = boardType === StandardGeometryType.BOARD_AREA_RIGID;
    
    if (circleInfo) {
      // 使用圆形几何表示（更高效）
      return this.createCircularGeometry(processedData, boardPrefix, circleInfo, useStratum);
    } else {
      // 使用多边形几何表示
      return this.createPolygonGeometry(processedData, boardPrefix, orderedPoints, useStratum);
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
   * 
   * @param processedData - 处理后的板子数据
   * @param boardPrefix - 板子前缀
   * @param circleInfo - 圆形信息
   * @param useStratum - 是否使用 Stratum（BOARD_AREA_RIGID 时为 true）
   */
  private createCircularGeometry(
    processedData: ProcessedBoardData,
    boardPrefix: string,
    circleInfo: { centerX: number; centerY: number; radius: number },
    useStratum: boolean
  ) {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    const stratumElements: any[] = [];
    
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
    const zBounds = this.getZBounds(processedData);
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': zBounds.lower.toString() },
      'd2:UpperBound': { 'property:Value': zBounds.upper.toString() },
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
    
    let finalShapeElementId = shapeElementId;
    
    // 5. 根据板子类型决定是否创建 Stratum 对象
    if (useStratum) {
      // BOARD_AREA_RIGID: 创建 Stratum 对象
      const stratumId = `${boardPrefix}_STRATUM`;
      stratumElements.push({
        id: stratumId,
        'xsi:type': 'pdm:EDMDStratum',
        'pdm:ShapeElement': shapeElementId,
        'pdm:StratumType': StratumType.DESIGN_LAYER_STRATUM,
        'pdm:StratumSurfaceDesignation': StratumSurfaceDesignation.PRIMARY_SURFACE
      });
      finalShapeElementId = stratumId; // 返回 Stratum ID
    }
    // BOARD_OUTLINE: 直接使用 ShapeElement，不创建 Stratum
    
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
   * 
   * @param processedData - 处理后的板子数据
   * @param boardPrefix - 板子前缀
   * @param orderedPoints - 排序后的轮廓点
   * @param useStratum - 是否使用 Stratum（BOARD_AREA_RIGID 时为 true）
   */
  private createPolygonGeometry(
    processedData: ProcessedBoardData,
    boardPrefix: string,
    orderedPoints: CartesianPoint[],
    useStratum: boolean
  ) {
    const geometricElements: any[] = [];
    const curveSet2Ds: any[] = [];
    const shapeElements: any[] = [];
    const stratumElements: any[] = [];
    
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
    const zBounds = this.getZBounds(processedData);
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': zBounds.lower.toString() },
      'd2:UpperBound': { 'property:Value': zBounds.upper.toString() },
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
    
    let finalShapeElementId = shapeElementId;
    
    // 5. 根据板子类型决定是否创建 Stratum 对象
    if (useStratum) {
      // BOARD_AREA_RIGID: 创建 Stratum 对象
      const stratumId = `${boardPrefix}_STRATUM`;
      stratumElements.push({
        id: stratumId,
        'xsi:type': 'pdm:EDMDStratum',
        'pdm:ShapeElement': shapeElementId,
        'pdm:StratumType': StratumType.DESIGN_LAYER_STRATUM,
        'pdm:StratumSurfaceDesignation': StratumSurfaceDesignation.PRIMARY_SURFACE
      });
      finalShapeElementId = stratumId; // 返回 Stratum ID
    }
    // BOARD_OUTLINE: 直接使用 ShapeElement，不创建 Stratum
    
    return {
      geometricElements,
      curveSet2Ds,
      shapeElements,
      stratumElements,
      shapeElementId: finalShapeElementId
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
   * 创建板子用户属性（使用IDX标准属性）
   * 
   * @param processedData - 处理后的板子数据
   * @param boardType - 板子类型枚举
   * @returns 用户属性数组
   */
  private createBoardProperties(
    processedData: ProcessedBoardData, 
    boardType: StandardGeometryType.BOARD_OUTLINE | StandardGeometryType.BOARD_AREA_RIGID
  ): EDMDUserSimpleProperty[] {
    // 使用IDX标准属性名（参考规范表11，第140-141页）
    const standardProperties: EDMDUserSimpleProperty[] = [
      // 1. 厚度 - 制造必需的标准属性
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'THICKNESS'
        },
        Value: processedData.outline.thickness.toString()
      }
    ];
    
    // 2. 材质 - 如果是标准材质，添加MATERIAL属性
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
    
    // 3. 板子类型 - 用于区分建模方式
    standardProperties.push({
      Key: {
        SystemScope: this.config.creatorSystem,
        ObjectName: 'MODELING_TYPE'
      },
      Value: boardType // 直接使用枚举值
    });
    
    // 4. 几何特征 - 用于制造成本计算
    const circleInfo = this.detectCircularBoard(processedData.outline.points);
    if (circleInfo) {
      // 圆形板子
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
      // 多边形板子
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'GEOMETRY_TYPE'
        },
        Value: 'POLYGON'
      });
      
      // 计算面积（制造成本计算必需）
      const area = this.calculatePolygonArea(processedData.outline.points);
      standardProperties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'BOARD_AREA'
        },
        Value: area.toFixed(2)
      });
    }
    
    // 5. 处理自定义属性（使用前缀区分）
    const customProperties: EDMDUserSimpleProperty[] = [];
    if (processedData.customProperties) {
      // 只添加制造相关的核心属性
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
          // 其他属性使用CUSTOM_前缀
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
   * 
   * @param layerStackup - 层叠结构数据
   * @returns 层堆叠的引用名称
   */
  private getLayerStackupReferenceName(layerStackup: LayerStackupData): string {
    // 优先使用明确定义的id
    if (layerStackup.id) {
      return layerStackup.id;
    }
    
    // 如果没有id，使用名称
    if (layerStackup.name) {
      return layerStackup.name.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
    }
    
    // 最后使用默认名称
    return 'PRIMARY_STACKUP';
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
}