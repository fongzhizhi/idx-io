import { EDMDDataSetBody, EDMDItem } from "../../types/core";

/**
 * 构建器注册表接口
 */
export interface BuilderRegistry {
  get(type: string): any;
}

/**
 * 组装器配置接口
 */
export interface AssemblerConfig {
  useSimplified: boolean;
  includeLayerStackup: boolean;
}

/**
 * 层系统组装结果
 */
export interface LayerSystemAssembly {
  items: EDMDItem[];
  shapes: any[];
}

/**
 * 板数据接口（简化版本）
 */
export interface BoardData {
  id: string;
  name: string;
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
  };
  layers?: any[];
  components?: Array<{
    refDes: string;
    partNumber: string;
    packageName: string;
    position: {
      x: number;
      y: number;
      z?: number;
      rotation: number;
    };
    dimensions: {
      width: number;
      height: number;
      thickness: number;
    };
    layer: string;
    isMechanical?: boolean;
    electrical?: any;
    thermal?: any;
    model3D?: any;
    pins?: any[];
    properties?: Record<string, any>;
  }>;
  holes?: Array<{
    id: string;
    name?: string;
    position: { x: number; y: number };
    diameter: number;
    viaType: 'plated' | 'non-plated' | 'filled' | 'micro';
    startLayer: string;
    endLayer: string;
    padDiameter?: number;
    antiPadDiameter?: number;
    netName?: string;
    properties?: Record<string, any>;
  }>;
  keepouts?: Array<{
    id: string;
    name?: string;
    constraintType: 'route' | 'component' | 'via' | 'testpoint' | 'thermal' | 'other';
    purpose: any;
    shape: {
      type: 'rectangle' | 'circle' | 'polygon';
      points: Array<{ x: number; y: number }>;
      radius?: number;
    };
    height?: {
      min: number;
      max: number | 'infinity';
    };
    layer: string;
    enabled?: boolean;
    properties?: Record<string, any>;
  }>;
  layerStackup?: any;
  layerZones?: any[];
}

// src/exporter/assemblers/dataset-assembler.ts
export class DatasetAssembler {
  private builders: BuilderRegistry;
  private config: AssemblerConfig;

  constructor(builders: BuilderRegistry, config: AssemblerConfig) {
    this.builders = builders;
    this.config = config;
  }

  /**
   * 组装基线消息的Body
   */
  async assembleBaselineBody(boardData: BoardData): Promise<EDMDDataSetBody> {
    const body: EDMDDataSetBody = {
      Items: [],
      Shapes: [],
      Models3D: []
    };

    // 存储独立的几何元素
    const geometricElements: any[] = [];
    const shapeElements: any[] = [];
    const curveSet2Ds: any[] = [];

    // 1. 构建板轮廓
    const boardBuilder = this.builders.get('board');
    if (boardBuilder) {
      const boardItem = await boardBuilder.build(boardData);
      body.Items.push(boardItem);
      
      // 收集板子的几何元素
      if (boardItem.geometricElements) {
        geometricElements.push(...boardItem.geometricElements);
        delete boardItem.geometricElements; // 清理临时属性
      }
      if (boardItem.shapeElements) {
        shapeElements.push(...boardItem.shapeElements);
        delete boardItem.shapeElements;
      }
      if (boardItem.curveSet2Ds) {
        curveSet2Ds.push(...boardItem.curveSet2Ds);
        delete boardItem.curveSet2Ds;
      }
    }

    // 2. 构建层系统（如果有多层）
    if (boardData.layers && boardData.layers.length > 0) {
      const layerSystem = await this.assembleLayerSystem(boardData);
      body.Items.push(...layerSystem.items);
      if (body.Shapes) {
        body.Shapes.push(...layerSystem.shapes);
      }
    }

    // 3. 构建组件
    if (boardData.components && boardData.components.length > 0) {
      const componentBuilder = this.builders.get('component');
      if (componentBuilder) {
        for (const component of boardData.components) {
          try {
            const componentItem = await componentBuilder.build(component);
            body.Items.push(componentItem);
            
            // 收集组件的几何元素
            if (componentItem.geometricElements) {
              geometricElements.push(...componentItem.geometricElements);
              delete componentItem.geometricElements;
            }
            if (componentItem.shapeElements) {
              shapeElements.push(...componentItem.shapeElements);
              delete componentItem.shapeElements;
            }
            if (componentItem.curveSet2Ds) {
              curveSet2Ds.push(...componentItem.curveSet2Ds);
              delete componentItem.curveSet2Ds;
            }
            
            // 收集组件的形状和模型
            this.collectComponentArtifacts(componentItem, body);
          } catch (error) {
            console.warn(`构建组件 ${component.refDes} 时出错:`, error);
          }
        }
      }
    }

    // 4. 构建孔和切口
    if (boardData.holes && boardData.holes.length > 0) {
      for (const hole of boardData.holes) {
        try {
          const holeBuilder = this.builders.get(hole.viaType === 'plated' || hole.viaType === 'filled' || hole.viaType === 'micro' ? 'plated-hole' : 'non-plated-hole');
          if (holeBuilder) {
            const holeItem = await holeBuilder.build(hole);
            body.Items.push(holeItem);
            
            // 收集过孔的几何元素
            if (holeItem.geometricElements) {
              geometricElements.push(...holeItem.geometricElements);
              delete holeItem.geometricElements;
            }
            if (holeItem.shapeElements) {
              shapeElements.push(...holeItem.shapeElements);
              delete holeItem.shapeElements;
            }
            if (holeItem.curveSet2Ds) {
              curveSet2Ds.push(...holeItem.curveSet2Ds);
              delete holeItem.curveSet2Ds;
            }
          }
        } catch (error) {
          console.warn(`构建孔 ${hole.id} 时出错:`, error);
        }
      }
    }

    // 5. 构建保持区域
    if (boardData.keepouts && boardData.keepouts.length > 0) {
      for (const keepout of boardData.keepouts) {
        try {
          const keepoutBuilder = this.builders.get('keepout');
          if (keepoutBuilder) {
            const keepoutItem = await keepoutBuilder.build(keepout);
            body.Items.push(keepoutItem);
            
            // 收集禁止区的几何元素
            if (keepoutItem.geometricElements) {
              geometricElements.push(...keepoutItem.geometricElements);
              delete keepoutItem.geometricElements;
            }
            if (keepoutItem.shapeElements) {
              shapeElements.push(...keepoutItem.shapeElements);
              delete keepoutItem.shapeElements;
            }
            if (keepoutItem.curveSet2Ds) {
              curveSet2Ds.push(...keepoutItem.curveSet2Ds);
              delete keepoutItem.curveSet2Ds;
            }
          }
        } catch (error) {
          console.warn(`构建禁止区 ${keepout.id} 时出错:`, error);
        }
      }
    }

    // 6. 将收集的几何元素添加到Body中（按demo文件的顺序）
    // 先添加基础几何元素（点、线、圆等）
    body.GeometricElements = geometricElements;
    
    // 再添加曲线集
    body.CurveSet2Ds = curveSet2Ds;
    
    // 最后添加形状元素
    body.ShapeElements = shapeElements;

    return body;
  }

  /**
   * 组装层系统
   */
  private async assembleLayerSystem(boardData: BoardData): Promise<LayerSystemAssembly> {
    const result: LayerSystemAssembly = {
      items: [],
      shapes: []
    };

    // 构建物理层
    if (boardData.layers) {
      for (const layer of boardData.layers) {
        const layerBuilder = this.builders.get('layer');
        if (layerBuilder) {
          const layerItem = await layerBuilder.build(layer);
          result.items.push(layerItem);
        }
      }
    }

    // 构建层堆叠
    if (boardData.layerStackup) {
      const stackupBuilder = this.builders.get('stackup');
      if (stackupBuilder) {
        const stackupItem = await stackupBuilder.build(boardData.layerStackup);
        result.items.push(stackupItem);
      }
    }

    // 构建层区域（用于柔性板）
    if (boardData.layerZones && boardData.layerZones.length > 0) {
      for (const zone of boardData.layerZones) {
        const zoneBuilder = this.builders.get('layer-zone');
        if (zoneBuilder) {
          const zoneItem = await zoneBuilder.build(zone);
          result.items.push(zoneItem);
        }
      }
    }

    return result;
  }

  /**
   * 收集组件的形状和模型
   */
  private collectComponentArtifacts(componentItem: EDMDItem, body: EDMDDataSetBody): void {
    // 收集形状
    if (componentItem.Shape && typeof componentItem.Shape === 'object') {
      if (body.Shapes) {
        body.Shapes.push(componentItem.Shape);
      }
    }

    // 收集3D模型
    if (componentItem.EDMD3DModel && typeof componentItem.EDMD3DModel === 'object') {
      if (body.Models3D) {
        body.Models3D.push(componentItem.EDMD3DModel);
      }
    }
  }
}