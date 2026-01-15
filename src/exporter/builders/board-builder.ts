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
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 简单矩形板
 * const boardData: BoardData = {
 *   id: 'MAIN_BOARD',
 *   name: '主板',
 *   outline: {
 *     points: [
 *       { x: 0, y: 0 },
 *       { x: 100, y: 0 },
 *       { x: 100, y: 80 },
 *       { x: 0, y: 80 }
 *     ],
 *     thickness: 1.6
 *   },
 *   material: 'FR4',
 *   stiffeners: [
 *     {
 *       id: 'STIFFENER_1',
 *       name: '加强筋1',
 *       shape: { /* 几何形状 *\/ },
 *       thickness: 2.0
 *     }
 *   ]
 * };
 * ```
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
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 构建简单PCB板
 * const builder = new BoardBuilder(config, context);
 * const boardItem = await builder.build(boardData);
 * // 返回: 包含板轮廓和所有特征的EDMDItem
 * ```
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
   * 
   * @testCase 有效板子数据
   * @testInput 包含至少3个轮廓点，厚度大于0
   * @testExpect 验证通过
   * @testCase 无效轮廓点
   * @testInput 少于3个轮廓点
   * @testExpect 验证失败，返回错误信息
   * @testCase 无效厚度
   * @testInput 厚度为0或负数
   * @testExpect 验证失败，返回错误信息
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
    input.cutouts?.forEach((cutout, index) => {
      if (cutout.depth < 0) {
        errors.push(`切口${cutout.id}深度不能为负数: ${cutout.depth}`);
      }
    });
    
    // # 加强筋验证
    input.stiffeners?.forEach((stiffener, index) => {
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
    
    // # 创建轮廓曲线集
    const outlineCurveSet = this.createOutlineCurveSet(outlinePoints, input.outline.thickness);
    
    // # 处理切口（如果有）
    const processedCutouts: ProcessedBoardData['cutouts'] = [];
    if (input.cutouts) {
      for (const cutout of input.cutouts) {
        const cutoutShape = await this.createCutoutShape(cutout);
        if (cutoutShape) {
          processedCutouts.push({
            id: cutout.id,
            shape: cutoutShape,
            inverted: true // 切口是减去材料
          });
        }
      }
    }
    
    // # 处理加强筋（如果有）
    const processedStiffeners: ProcessedBoardData['stiffeners'] = [];
    if (input.stiffeners) {
      for (const stiffener of input.stiffeners) {
        const stiffenerPoints = stiffener.shape.points.map((point, index) => ({
          id: this.generateItemId('POINT', `STIFFENER_${stiffener.id}_${index}`),
          X: this.geometryUtils.roundValue(point.x),
          Y: this.geometryUtils.roundValue(point.y)
        }));
        
        const stiffenerCurveSet = this.createStiffenerCurveSet(stiffenerPoints, stiffener.thickness);
        
        processedStiffeners.push({
          id: stiffener.id,
          name: stiffener.name,
          shape: stiffenerCurveSet
        });
      }
    }
    
    return {
      id: input.id,
      name: input.name,
      outline: {
        points: outlinePoints,
        thickness: input.outline.thickness
      },
      cutouts: processedCutouts,
      stiffeners: processedStiffeners
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
      ...this.createBaseItem(
        ItemType.ASSEMBLY,
        GeometryType.BOARD_OUTLINE,
        processedData.name,
        `PCB板: ${processedData.name}, 厚度: ${processedData.outline.thickness}mm`
      ),
      Identifier: this.createIdentifier('BOARD', processedData.id)
    };
    
    // # 添加用户属性
    boardItem.UserProperties = this.createBoardProperties(processedData);
    
    // # 创建板子形状元素
    const boardShape = await this.createBoardShape(processedData);
    
    if (this.config.useSimplified) {
      // ## 简化表示法：直接引用形状
      boardItem.Shape = boardShape;
    } else {
      // ## 传统表示法：通过Stratum对象
      // TODO(板子构建器): 2024-03-20 实现传统表示法 [P2-NICE_TO_HAVE]
      this.context.addWarning('FEATURE_NOT_IMPLEMENTED', 
        '板子传统表示法暂未实现，使用简化表示法');
      boardItem.Shape = boardShape;
    }
    
    // # 创建加强筋项目（如果有）
    if (processedData.stiffeners.length > 0) {
      const stiffenerItems = await this.createStiffenerItems(processedData.stiffeners);
      // NOTE: 加强筋作为板子的子项目，需要特殊处理
      // 这里简化处理，实际中可能需要不同的组织方式
    }
    
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
    
    // # 记录构建统计
    this.context.addWarning('BOARD_BUILT', 
      `PCB板构建完成: ${output.Name} (ID: ${output.id})`);
    
    return output;
  }
  
  // ============= 私有辅助方法 =============
  /**
   * 创建板子轮廓曲线集
   * 
   * @param points - 轮廓点数组
   * @param thickness - 板子厚度
   * @returns 轮廓曲线集
   */
  private createOutlineCurveSet(points: CartesianPoint[], thickness: number): EDMDCurveSet2D {
    // # 创建多边形曲线
    const polyLine: EDMDPolyLine = {
      id: this.generateItemId('POLYLINE', 'OUTLINE'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    // # 创建曲线集
    // BUSINESS: 板子轮廓的Z范围通常为0到厚度
    return this.createCurveSet2D(0, thickness, [polyLine]);
  }
  
  /**
   * 创建切口形状
   * 
   * @param cutout - 切口数据
   * @returns 切口曲线集
   */
  private async createCutoutShape(cutout: BoardData['cutouts'][0]): Promise<EDMDCurveSet2D | null> {
    try {
      let curveSet: EDMDCurveSet2D;
      
      switch (cutout.shape) {
        case 'circle':
          // ## 圆形切口
          const { centerX, centerY, diameter } = cutout.parameters;
          const depth = cutout.depth === 0 ? cutout.depth : cutout.depth; // 0表示通孔
          
          curveSet = this.geometryUtils.createCircleCurveSet(
            centerX, centerY, diameter,
            0, depth // Z范围
          );
          break;
          
        case 'rectangle':
          // ## 矩形切口
          const { x, y, width, height } = cutout.parameters;
          const rectPoints: CartesianPoint[] = [
            { id: this.generateItemId('POINT', 'RECT1'), X: x, Y: y },
            { id: this.generateItemId('POINT', 'RECT2'), X: x + width, Y: y },
            { id: this.generateItemId('POINT', 'RECT3'), X: x + width, Y: y + height },
            { id: this.generateItemId('POINT', 'RECT4'), X: x, Y: y + height }
          ];
          
          const rectPolyLine: EDMDPolyLine = {
            id: this.generateItemId('POLYLINE', `CUTOUT_${cutout.id}`),
            curveType: 'EDMDPolyLine',
            Points: rectPoints,
            Closed: true
          };
          
          curveSet = this.createCurveSet2D(0, cutout.depth, [rectPolyLine]);
          break;
          
        default:
          // NOTE: 复杂形状暂不支持
          this.context.addWarning('UNSUPPORTED_SHAPE',
            `不支持的切口形状: ${cutout.shape}，将跳过此切口`);
          return null;
      }
      
      curveSet.id = this.generateItemId('CURVESET', `CUTOUT_${cutout.id}`);
      return curveSet;
      
    } catch (error) {
      this.context.addWarning('CUTOUT_CREATION_FAILED',
        `创建切口${cutout.id}失败: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 创建加强筋曲线集
   * 
   * @param points - 加强筋轮廓点
   * @param thickness - 加强筋厚度
   * @returns 加强筋曲线集
   */
  private createStiffenerCurveSet(points: CartesianPoint[], thickness: number): EDMDCurveSet2D {
    const polyLine: EDMDPolyLine = {
      id: this.generateItemId('POLYLINE', 'STIFFENER'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    // BUSINESS: 加强筋的Z范围通常从板子表面开始
    return this.createCurveSet2D(0, thickness, [polyLine]);
  }
  
  /**
   * 创建板子形状元素
   * 
   * @param processedData - 处理后的板子数据
   * @returns 板子形状元素
   */
  private async createBoardShape(processedData: ProcessedBoardData): Promise<EDMDShapeElement> {
    // # 创建主要形状元素（板子轮廓）
    const boardShapeElement: EDMDShapeElement = {
      id: this.generateItemId('SHAPE', 'BOARD_OUTLINE'),
      ShapeElementType: ShapeElementType.FEATURE_SHAPE_ELEMENT,
      DefiningShape: this.createOutlineCurveSet(
        processedData.outline.points,
        processedData.outline.thickness
      ),
      Inverted: false // 添加材料
    };
    
    // # 添加切口形状（减去材料）
    for (const cutout of processedData.cutouts) {
      // NOTE: 实际实现中，切口应该作为独立的形状元素
      // 这里简化处理，实际可能需要使用CompositeCurve或组合多个形状元素
    }
    
    return boardShapeElement;
  }
  
  /**
   * 创建加强筋项目
   * 
   * @param stiffeners - 加强筋数据
   * @returns 加强筋EDMDItem数组
   */
  private async createStiffenerItems(
    stiffeners: ProcessedBoardData['stiffeners']
  ): Promise<EDMDItem[]> {
    const stiffenerItems: EDMDItem[] = [];
    
    for (const stiffener of stiffeners) {
      const stiffenerItem: EDMDItem = {
        id: this.generateItemId('BOARD_AREA_STIFFENER', stiffener.id),
        ...this.createBaseItem(
          ItemType.ASSEMBLY,
          GeometryType.BOARD_AREA_STIFFENER,
          stiffener.name,
          `加强筋区域: ${stiffener.name}`
        )
      };
      
      // # 创建加强筋形状
      const shapeElement: EDMDShapeElement = {
        id: this.generateItemId('SHAPE', `STIFFENER_${stiffener.id}`),
        ShapeElementType: ShapeElementType.FEATURE_SHAPE_ELEMENT,
        DefiningShape: stiffener.shape,
        Inverted: false
      };
      
      stiffenerItem.Shape = shapeElement;
      stiffenerItems.push(stiffenerItem);
    }
    
    return stiffenerItems;
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