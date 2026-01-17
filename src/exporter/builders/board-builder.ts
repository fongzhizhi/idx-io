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
    // # 转换轮廓点
    const outlinePoints = input.outline.points.map((point, index) => ({
      id: this.generateItemId('POINT', `OUTLINE_${index}`),
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
      cutouts: [],
      stiffeners: []
    };
  }
  
  // ============= 核心构建逻辑 =============
  /**
   * 构建PCB板EDMDItem
   * 
   * @remarks
   * DESIGN: PCB板作为装配体项目，包含轮廓和所有特征
   * BUSINESS: 根据配置使用简化或传统表示法
   * 
   * @param processedData - 处理后的板子数据
   * @returns PCB板EDMDItem
   */
  protected async construct(processedData: ProcessedBoardData): Promise<EDMDItem> {
    // # 创建顶层板子项目（装配体）
    const boardItem: EDMDItem = {
      id: this.generateItemId('BOARD', processedData.id),
      ItemType: ItemType.ASSEMBLY,
      Name: processedData.name,
      Description: `PCB板: ${processedData.name}, 厚度: ${processedData.outline.thickness}mm`,
      geometryType: this.config.useSimplified ? GeometryType.BOARD_OUTLINE : undefined,
      BaseLine: true,
      Identifier: this.createIdentifier('BOARD', processedData.id)
    };
    
    // # 添加用户属性
    boardItem.UserProperties = this.createBoardProperties(processedData);
    
    // # 生成独立的几何元素
    const geometryData = this.createIndependentGeometry(processedData);
    
    // # 将几何元素附加到boardItem上（临时存储，DatasetAssembler会提取）
    (boardItem as any).geometricElements = geometryData.geometricElements;
    (boardItem as any).curveSet2Ds = geometryData.curveSet2Ds;
    (boardItem as any).shapeElements = geometryData.shapeElements;
    
    // # 设置形状引用
    boardItem.Shape = geometryData.shapeElementId;
    
    return boardItem;
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
    
    // 1. 创建轮廓点（CartesianPoint）- 按demo格式
    processedData.outline.points.forEach(point => {
      geometricElements.push({
        id: point.id,
        'xsi:type': 'd2:EDMDCartesianPoint',
        'X': { 'property:Value': point.X.toString() },
        'Y': { 'property:Value': point.Y.toString() }
      });
    });
    
    // 2. 创建轮廓多边形（PolyLine）- 按demo格式
    const polyLineId = this.generateItemId('POLYLINE', 'BOARD_OUTLINE');
    const polyLinePoints = processedData.outline.points.map(p => p.id);
    // 确保闭合多边形
    if (polyLinePoints[0] !== polyLinePoints[polyLinePoints.length - 1]) {
      polyLinePoints.push(polyLinePoints[0]);
    }
    
    geometricElements.push({
      id: polyLineId,
      type: 'PolyLine',
      'Point': polyLinePoints.map(pointId => ({ 'd2:Point': pointId }))
    });
    
    // 3. 创建曲线集（CurveSet2D）- 按demo格式
    const curveSetId = this.generateItemId('CURVESET', 'BOARD_OUTLINE');
    curveSet2Ds.push({
      id: curveSetId,
      'xsi:type': 'd2:EDMDCurveSet2d',
      'pdm:ShapeDescriptionType': 'GeometricModel',
      'd2:LowerBound': { 'property:Value': '0.00' },
      'd2:UpperBound': { 'property:Value': processedData.outline.thickness.toString() },
      'd2:DetailedGeometricModelElement': polyLineId
    });
    
    // 4. 创建形状元素（ShapeElement）- 按demo格式
    const shapeElementId = this.generateItemId('SHAPE', 'BOARD_OUTLINE');
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
          ObjectName: 'POINT_COUNT'
        },
        Value: processedData.outline.points.length.toString()
      }
    ];
    
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
}