// ============= PCB板构建器 =============
// DESIGN: 支持多种板类型：刚性板、柔性板、加强筋区域等
// REF: IDXv4.5规范第6.1节

import { 
  BaseBuilder, BuilderConfig, BuilderContext, ValidationResult 
} from './base-builder';
import {
  EDMDItem, ItemType, GeometryType, 
  EDMDShapeElement, ShapeElementType,
  CartesianPoint, EDMDPolyLine, EDMDCurveSet2D,
  EDMDUserSimpleProperty
} from '../../types/core';

/**
 * PCB板数据接口
 */
export interface BoardData {
  id: string;
  name: string;
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
    material?: string;
    finish?: string;
  };
  cutouts?: Array<{
    id: string;
    shape: 'circle' | 'rectangle' | 'polygon';
    parameters: any;
    depth: number;
  }>;
  stiffeners?: Array<{
    id: string;
    name: string;
    shape: {
      points: Array<{ x: number; y: number }>;
    };
    thickness: number;
  }>;
  properties?: Record<string, any>;
}

/**
 * 处理后的板子数据
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
    inverted: boolean;
  }>;
  stiffeners: Array<{
    id: string;
    name: string;
    shape: EDMDCurveSet2D;
  }>;
}

/**
 * PCB板构建器
 */
export class BoardBuilder extends BaseBuilder<BoardData, EDMDItem> {
  
  protected validateInput(input: BoardData): ValidationResult<BoardData> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!input.id || !input.name) {
      errors.push('板子ID和名称不能为空');
    }
    
    if (!input.outline) {
      errors.push('板子轮廓数据不能为空');
      return { valid: false, errors, warnings };
    }
    
    const { points, thickness } = input.outline;
    
    if (!points || points.length < 3) {
      errors.push(`板子轮廓至少需要3个点，当前: ${points?.length || 0}`);
    }
    
    if (thickness <= 0) {
      errors.push(`板子厚度必须大于0，当前: ${thickness}`);
    }
    
    points?.forEach((point, index) => {
      if (isNaN(point.x) || isNaN(point.y)) {
        errors.push(`轮廓点${index}坐标无效: x=${point.x}, y=${point.y}`);
      }
    });
    
    if (!input.outline.material) {
      warnings.push('板子材质未指定，将使用默认值');
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? input : undefined,
      warnings,
      errors
    };
  }
  
  protected async preProcess(input: BoardData): Promise<ProcessedBoardData> {
    const outlinePoints = input.outline.points.map((point, index) => ({
      id: this.generateItemId('POINT', `OUTLINE_${index}`),
      X: this.geometryUtils.roundValue(point.x),
      Y: this.geometryUtils.roundValue(point.y)
    }));
    
    const processedCutouts: ProcessedBoardData['cutouts'] = [];
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
  
  protected async construct(processedData: ProcessedBoardData): Promise<EDMDItem> {
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
    
    boardItem.UserProperties = this.createBoardProperties(processedData);
    
    const boardShape = await this.createBoardShape(processedData);
    boardItem.Shape = boardShape;
    
    return boardItem;
  }
  
  protected async postProcess(output: EDMDItem): Promise<EDMDItem> {
    if (!output.id || !output.ItemType) {
      throw new Error('板子项目缺少必需字段');
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
    
    return output;
  }
  
  private createStiffenerCurveSet(points: CartesianPoint[], thickness: number): EDMDCurveSet2D {
    const polyLine: EDMDPolyLine = {
      id: this.generateItemId('POLYLINE', 'STIFFENER'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    return this.createCurveSet2D(0, thickness, [polyLine]);
  }
  
  private async createBoardShape(processedData: ProcessedBoardData): Promise<EDMDShapeElement> {
    const polyLine: EDMDPolyLine = {
      id: this.generateItemId('POLYLINE', 'OUTLINE'),
      curveType: 'EDMDPolyLine',
      Points: processedData.outline.points,
      Closed: true
    };
    
    const curveSet = this.createCurveSet2D(0, processedData.outline.thickness, [polyLine]);
    
    const boardShapeElement: EDMDShapeElement = {
      id: this.generateItemId('SHAPE', 'BOARD_OUTLINE'),
      ShapeElementType: ShapeElementType.FEATURE_SHAPE_ELEMENT,
      DefiningShape: curveSet,
      Inverted: false
    };
    
    return boardShapeElement;
  }
  
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
    
    return properties;
  }
}
