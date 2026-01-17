/**
 * 层堆叠结构构建器
 * 
 * 职责：
 * - 构建符合 IDX V4.5 协议的层堆叠结构
 * - 管理层实例的创建和排序
 * - 处理层边界属性（UpperBound 和 LowerBound）
 * - 确保正确的层引用关系
 * 
 * 根据需求 14.1-14.5：
 * - 层堆叠使用 ItemType="assembly" 和 geometryType="LAYER_STACKUP"
 * - 包含按顺序排列的层实例（从底部到顶部）
 * - 层实例引用 Layer Item
 * - 层实例包含边界属性
 * - 层堆叠包含 ReferenceName 属性
 */

import { EDMDItem, ItemType, EDMDIdentifier, EDMName, EDMDUserSimpleProperty } from '../../types/core';

/**
 * 层堆叠数据接口
 * 包含构建层堆叠结构所需的所有信息
 */
export interface LayerStackupData {
  /** 层堆叠唯一标识符 */
  id: string;
  
  /** 层堆叠名称 */
  name: string;
  
  /** 层堆叠标识符（包含版本、修订等） */
  identifier: EDMDIdentifier;
  
  /** 层列表（按从底部到顶部的顺序） */
  layers: LayerInstanceData[];
  
  /** 总厚度 */
  totalThickness: number;
  
  /** 用户属性 */
  userProperties?: EDMDUserSimpleProperty[];
  
  /** 可选：基线标记 */
  baseline?: boolean;
}

/**
 * 层实例数据接口
 * 包含层实例所需的信息
 */
export interface LayerInstanceData {
  /** 层实例 ID */
  instanceId: string;
  
  /** 引用的层 Item ID */
  layerItemId: string;
  
  /** 层名称 */
  layerName: string;
  
  /** 层在堆叠中的位置（从底部开始，0-based） */
  position: number;
  
  /** 层厚度 */
  thickness: number;
  
  /** 下边界（Z 坐标） */
  lowerBound: number;
  
  /** 上边界（Z 坐标） */
  upperBound: number;
  
  /** 层材料 */
  material?: string;
  
  /** 层类型 */
  layerType?: string;
}

/**
 * 层堆叠结构
 * 
 * 根据 IDX V4.5 协议第 55-57 页，层堆叠需要以下结构：
 * 1. Assembly Item - 顶层容器（包含层实例和 ReferenceName）
 * 2. Layer Instances - 每个层的实例（包含边界属性和层引用）
 * 3. Layer Items - 被引用的层定义
 */
export interface LayerStackupStructure {
  /** 层堆叠 assembly Item */
  stackupItem: EDMDItem;
  
  /** 层实例列表 */
  layerInstances: any[];
}

/**
 * 层堆叠结构构建器
 * 
 * 职责：
 * - 构建符合 IDX V4.5 协议的层堆叠结构
 * - 管理层实例的创建和排序逻辑
 * - 处理层边界属性和引用关系
 * 
 * 根据需求 14.1-14.5：
 * - 层堆叠使用 ItemType="assembly" 和 geometryType="LAYER_STACKUP"
 * - 层实例按从底部到顶部的顺序排列
 * - 层实例引用 Layer Item
 * - 层实例包含 UpperBound 和 LowerBound 属性
 * - 层堆叠包含 ReferenceName 属性
 */
export class LayerStackupBuilder {
  /**
   * 构建完整的层堆叠结构
   * 
   * @param stackupData 层堆叠数据
   * @returns 包含 assembly 和 instances 的完整结构
   */
  buildLayerStackup(stackupData: LayerStackupData): LayerStackupStructure {
    // 验证输入数据
    this.validateStackupData(stackupData);
    
    // 按位置排序层（从底部到顶部）
    const sortedLayers = this.sortLayersByPosition(stackupData.layers);
    
    // 创建层实例
    const layerInstances = this.createLayerInstances(sortedLayers);
    
    // 创建层堆叠 assembly Item
    const stackupItem = this.createStackupAssemblyItem(stackupData, layerInstances);
    
    return {
      stackupItem,
      layerInstances
    };
  }
  
  /**
   * 创建层堆叠 assembly Item
   * 
   * 根据需求 14.1：
   * - 使用 ItemType="assembly" 和 geometryType="LAYER_STACKUP"
   * - 包含 ReferenceName 属性
   * 
   * @param stackupData 层堆叠数据
   * @param layerInstances 层实例列表
   * @returns 层堆叠 assembly Item
   */
  private createStackupAssemblyItem(
    stackupData: LayerStackupData, 
    layerInstances: any[]
  ): EDMDItem {
    const stackupItem: EDMDItem = {
      id: stackupData.id,
      ItemType: ItemType.ASSEMBLY,
      geometryType: 'LAYER_STACKUP' as any,
      Name: stackupData.name,
      Description: this.generateStackupDescription(stackupData),
      Identifier: stackupData.identifier,
      ItemInstances: layerInstances,
      // 根据需求 14.5：添加 ReferenceName 属性
      ReferenceName: {
        SystemScope: 'ECAD',
        ObjectName: stackupData.name
      },
      UserProperties: stackupData.userProperties || []
    };
    
    // 添加基线标记（如果有）
    if (stackupData.baseline !== undefined) {
      stackupItem.BaseLine = stackupData.baseline;
    }
    
    return stackupItem;
  }
  
  /**
   * 创建层实例列表
   * 
   * 根据需求 14.2 和 14.3：
   * - 按从底部到顶部的顺序排列
   * - 通过 Item 属性引用 Layer Item
   * 
   * @param sortedLayers 排序后的层列表
   * @returns 层实例列表
   */
  private createLayerInstances(sortedLayers: LayerInstanceData[]): any[] {
    return sortedLayers.map((layer, index) => {
      return this.createLayerInstance(layer, index);
    });
  }
  
  /**
   * 创建单个层实例
   * 
   * 根据需求 14.3 和 14.4：
   * - 引用 Layer Item
   * - 包含 UpperBound 和 LowerBound 属性
   * 
   * @param layerData 层数据
   * @param index 层在堆叠中的索引
   * @returns 层实例对象
   */
  private createLayerInstance(layerData: LayerInstanceData, index: number): any {
    const instance: any = {
      id: layerData.instanceId,
      // 根据需求 14.3：引用 Layer Item
      Item: layerData.layerItemId,
      InstanceName: {
        SystemScope: 'ECAD',
        ObjectName: `Layer_${index + 1}_${layerData.layerName}`
      },
      // 根据需求 14.4：添加边界属性
      UserProperties: this.createLayerInstanceProperties(layerData)
    };
    
    return instance;
  }
  
  /**
   * 创建层实例的用户属性
   * 
   * 根据需求 14.4：
   * - 包含 UpperBound 和 LowerBound 定义
   * 
   * @param layerData 层数据
   * @returns 用户属性列表
   */
  private createLayerInstanceProperties(layerData: LayerInstanceData): EDMDUserSimpleProperty[] {
    const properties: EDMDUserSimpleProperty[] = [
      // UpperBound 属性
      {
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'UpperBound'
        },
        Value: layerData.upperBound.toString()
      },
      // LowerBound 属性
      {
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'LowerBound'
        },
        Value: layerData.lowerBound.toString()
      },
      // 层厚度属性
      {
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'Thickness'
        },
        Value: layerData.thickness.toString()
      },
      // 层位置属性
      {
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'Position'
        },
        Value: layerData.position.toString()
      }
    ];
    
    // 添加材料属性（如果有）
    if (layerData.material) {
      properties.push({
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'Material'
        },
        Value: layerData.material
      });
    }
    
    // 添加层类型属性（如果有）
    if (layerData.layerType) {
      properties.push({
        Key: {
          SystemScope: 'ECAD',
          ObjectName: 'LayerType'
        },
        Value: layerData.layerType
      });
    }
    
    return properties;
  }
  
  /**
   * 按位置排序层（从底部到顶部）
   * 
   * 根据需求 14.2：
   * - 层实例按从底部到顶部的顺序排列
   * 
   * @param layers 层列表
   * @returns 排序后的层列表
   */
  private sortLayersByPosition(layers: LayerInstanceData[]): LayerInstanceData[] {
    return [...layers].sort((a, b) => a.position - b.position);
  }
  
  /**
   * 生成层堆叠描述
   * 
   * @param stackupData 层堆叠数据
   * @returns 描述字符串
   */
  private generateStackupDescription(stackupData: LayerStackupData): string {
    const layerCount = stackupData.layers.length;
    const thickness = stackupData.totalThickness;
    
    return `${layerCount}层PCB层叠结构 - ${stackupData.name}, 总厚度: ${thickness}mm`;
  }
  
  /**
   * 验证层堆叠数据的完整性
   * 
   * @param stackupData 层堆叠数据
   * @throws Error 如果数据不完整或无效
   */
  private validateStackupData(stackupData: LayerStackupData): void {
    if (!stackupData.id) {
      throw new Error('Layer stackup ID is required');
    }
    
    if (!stackupData.name) {
      throw new Error('Layer stackup name is required');
    }
    
    if (!stackupData.identifier) {
      throw new Error('Layer stackup identifier is required');
    }
    
    if (!stackupData.layers || stackupData.layers.length === 0) {
      throw new Error('Layer stackup must contain at least one layer');
    }
    
    // 验证层数据
    stackupData.layers.forEach((layer, index) => {
      if (!layer.instanceId) {
        throw new Error(`Layer ${index} instance ID is required`);
      }
      
      if (!layer.layerItemId) {
        throw new Error(`Layer ${index} item ID is required`);
      }
      
      if (!layer.layerName) {
        throw new Error(`Layer ${index} name is required`);
      }
      
      if (layer.thickness <= 0) {
        throw new Error(`Layer ${index} thickness must be positive`);
      }
      
      if (layer.upperBound <= layer.lowerBound) {
        throw new Error(`Layer ${index} upper bound must be greater than lower bound`);
      }
    });
    
    // 验证层位置的唯一性
    const positions = stackupData.layers.map(layer => layer.position);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      throw new Error('Layer positions must be unique');
    }
  }
  
  /**
   * 从简单的层数据创建层堆叠数据
   * 
   * 这是一个辅助方法，用于从简单的层信息创建完整的层堆叠数据
   * 
   * @param stackupId 层堆叠 ID
   * @param stackupName 层堆叠名称
   * @param layers 简单层数据列表
   * @returns 完整的层堆叠数据
   */
  static createStackupDataFromLayers(
    stackupId: string,
    stackupName: string,
    layers: Array<{
      id: string;
      name: string;
      thickness: number;
      material?: string;
      layerType?: string;
    }>
  ): LayerStackupData {
    let currentZ = 0;
    const layerInstances: LayerInstanceData[] = [];
    
    layers.forEach((layer, index) => {
      const lowerBound = currentZ;
      const upperBound = currentZ + layer.thickness;
      
      layerInstances.push({
        instanceId: `${stackupId}_LAYER_${index + 1}_INSTANCE`,
        layerItemId: layer.id,
        layerName: layer.name,
        position: index,
        thickness: layer.thickness,
        lowerBound,
        upperBound,
        material: layer.material,
        layerType: layer.layerType
      });
      
      currentZ = upperBound;
    });
    
    const totalThickness = currentZ;
    
    return {
      id: stackupId,
      name: stackupName,
      identifier: {
        SystemScope: 'ECAD',
        Number: stackupId,
        Version: 1,
        Revision: 1,
        Sequence: 1
      },
      layers: layerInstances,
      totalThickness,
      baseline: true
    };
  }
}