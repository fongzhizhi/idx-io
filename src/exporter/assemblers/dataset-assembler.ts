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
 * 组件数据接口
 */
export interface ComponentData {
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
}

/**
 * 孔数据接口
 */
export interface HoleData {
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
}

/**
 * 禁止区数据接口
 */
export interface KeepoutData {
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
}

/**
 * 层数据接口
 */
export interface LayerData {
  id: string;
  name: string;
  type: 'SIGNAL' | 'PLANE' | 'SOLDERMASK' | 'SILKSCREEN' | 'DIELECTRIC' | 'OTHERSIGNAL';
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  properties?: Record<string, any>;
}

/**
 * 层叠结构数据接口
 */
export interface LayerStackupData {
  id: string;
  name: string;
  totalThickness?: number;
  layers: Array<{
    layerId: string;
    position: number;
    thickness: number;
  }>;
}

/**
 * 板数据接口（完善版本）
 */
export interface BoardData {
  id: string;
  name: string;
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
  };
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  layerZones?: any[];
  properties?: Record<string, any>;
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
      const boardAssemblyItem = await boardBuilder.build(boardData);
      body.Items.push(boardAssemblyItem);
      
      // 如果有板定义项，也添加到Items中
      if ((boardAssemblyItem as any).boardDefinitionItem) {
        body.Items.push((boardAssemblyItem as any).boardDefinitionItem);
        delete (boardAssemblyItem as any).boardDefinitionItem; // 清理临时属性
      }
      
      // 收集板子的几何元素
      // 根据需求 15.3 和 15.5：ShapeElement 顺序应反映布尔运算顺序（先加后减）
      // 1. 板子（实体特征，Inverted=false）- 首先添加
      if ((boardAssemblyItem as any).geometricElements) {
        geometricElements.push(...(boardAssemblyItem as any).geometricElements);
        delete (boardAssemblyItem as any).geometricElements; // 清理临时属性
      }
      if ((boardAssemblyItem as any).shapeElements) {
        shapeElements.push(...(boardAssemblyItem as any).shapeElements);
        delete (boardAssemblyItem as any).shapeElements;
      }
      if ((boardAssemblyItem as any).curveSet2Ds) {
        curveSet2Ds.push(...(boardAssemblyItem as any).curveSet2Ds);
        delete (boardAssemblyItem as any).curveSet2Ds;
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
    // 2. 组件（实体特征，Inverted=false）- 其次添加
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
    // 3. 孔/过孔（切割特征，Inverted=true）- 然后减去
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
    // 4. 禁止区（切割特征，Inverted=true）- 最后减去
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

    // 如果同时有层数据和层叠结构，使用buildWithStackup方法
    if (boardData.layers && boardData.layerStackup && this.config.includeLayerStackup) {
      const layerBuilder = this.builders.get('layer');
      if (layerBuilder && typeof layerBuilder.buildWithStackup === 'function') {
        try {
          const layerItems = await layerBuilder.buildWithStackup({
            layers: boardData.layers,
            layerStackup: boardData.layerStackup
          });
          result.items.push(...layerItems);
        } catch (error) {
          console.warn('构建层叠结构时出错:', error);
          // 降级处理：只构建层数据
          await this.buildLayersOnly(boardData, result);
        }
      } else {
        // 如果不支持buildWithStackup，降级处理
        await this.buildLayersOnly(boardData, result);
      }
    } else {
      // 只有层数据，没有层叠结构
      await this.buildLayersOnly(boardData, result);
    }

    return result;
  }
  
  /**
   * 只构建层数据（不包含层叠结构）
   */
  private async buildLayersOnly(boardData: BoardData, result: LayerSystemAssembly): Promise<void> {
    // 构建物理层
    if (boardData.layers) {
      const layerBuilder = this.builders.get('layer');
      if (layerBuilder) {
        try {
          // LayerBuilder.build() 接受 LayerData[] 并返回 EDMDItem[]
          const layerItems = await layerBuilder.build(boardData.layers);
          if (Array.isArray(layerItems)) {
            result.items.push(...layerItems);
          } else {
            result.items.push(layerItems);
          }
        } catch (error) {
          console.warn('构建层数据时出错:', error);
          // 如果批量构建失败，尝试逐个构建
          for (const layer of boardData.layers) {
            try {
              const layerItem = await layerBuilder.build([layer]);
              if (Array.isArray(layerItem)) {
                result.items.push(...layerItem);
              } else {
                result.items.push(layerItem);
              }
            } catch (error) {
              console.warn(`构建层 ${layer.id} 时出错:`, error);
            }
          }
        }
      }
    }

    // 构建层区域（用于柔性板）
    if (boardData.layerZones && boardData.layerZones.length > 0) {
      for (const zone of boardData.layerZones) {
        const zoneBuilder = this.builders.get('layer-zone');
        if (zoneBuilder) {
          try {
            const zoneItem = await zoneBuilder.build(zone);
            result.items.push(zoneItem);
          } catch (error) {
            console.warn(`构建层区域时出错:`, error);
          }
        }
      }
    }
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