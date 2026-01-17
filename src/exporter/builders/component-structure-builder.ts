import { EDMDItem, ItemType, EDMDIdentifier, EDMName, EDMDUserProperty } from '../../types/core';

/**
 * 组件数据接口
 * 包含构建组件三层结构所需的所有信息
 */
export interface ComponentData {
  /** 组件唯一标识符 */
  id: string;
  
  /** 组件名称 */
  name: string;
  
  /** 组件标识符（包含版本、修订等） */
  identifier: EDMDIdentifier;
  
  /** 封装名称 */
  packageName: EDMName;
  
  /** 用户属性（如 RefDes、PartNumber 等） */
  userProperties: EDMDUserProperty[];
  
  /** 形状 ID 列表 */
  shapeIds: string[];
  
  /** 装配到的目标（层或表面的 ReferenceName） */
  assembleToName: string;
  
  /** 变换矩阵 */
  transformation: EDMDTransformation2D;
  
  /** 可选：Z 偏移（IDX v4.5+） */
  zOffset?: number;
  
  /** 可选：基线标记 */
  baseline?: boolean;
}

/**
 * 2D 变换矩阵接口
 * 根据 IDX V4.5 协议，不使用 xsi:type，而是使用 TransformationType 元素
 */
export interface EDMDTransformation2D {
  /** 变换类型（固定为 'd2'） */
  TransformationType: 'd2';
  
  /** 旋转和缩放分量 */
  xx: number;
  xy: number;
  yx: number;
  yy: number;
  
  /** 平移分量（使用 foundation:Value 包装） */
  tx: { Value: number };
  ty: { Value: number };
}

/**
 * 组件三层结构
 * 
 * 根据 IDX V4.5 协议第 71-77 页，组件需要三层结构：
 * 1. Assembly Item - 顶层容器（包含 ItemInstance 和 AssembleToName）
 * 2. Single Item - 中间定义（包含 PackageName、用户属性和形状引用）
 * 3. Shape Elements - 底层几何
 */
export interface ComponentStructure {
  /** 顶层 assembly Item */
  assemblyItem: EDMDItem;
  
  /** 中间 single Item */
  singleItem: EDMDItem;
  
  /** 底层形状元素（如果需要创建） */
  shapeElements: any[];
}

/**
 * 组件结构构建器
 * 
 * 职责：
 * - 构建符合 IDX V4.5 协议的三层组件结构
 * - 管理 assembly、single 和 shape 之间的引用关系
 * - 处理组件的位置和变换
 * 
 * 根据需求 3.1-3.7：
 * - 顶层 Item 使用 ItemType="assembly" 和 geometryType="COMPONENT"
 * - 顶层 Item 包含 ItemInstance 和 AssembleToName，但不直接引用形状
 * - 中间 Item 使用 ItemType="single"，包含 PackageName、用户属性和形状引用
 * - ItemInstance 引用中间 single Item，包含变换矩阵
 */
export class ComponentStructureBuilder {
  /**
   * 构建完整的组件三层结构
   * 
   * @param component 组件数据
   * @returns 包含 assembly、single 和 shape 的完整结构
   */
  buildComponentStructure(component: ComponentData): ComponentStructure {
    // 生成 single Item 的 ID
    const singleItemId = `${component.id}_SINGLE`;
    
    // 创建中间 single Item（先创建，因为 assembly 需要引用它）
    const singleItem = this.createSingleItem(component, singleItemId);
    
    // 创建顶层 assembly Item
    const assemblyItem = this.createAssemblyItem(component, singleItemId);
    
    // 创建底层形状元素（如果需要）
    const shapeElements = this.createShapeElements(component);
    
    return {
      assemblyItem,
      singleItem,
      shapeElements
    };
  }
  
  /**
   * 创建顶层 assembly Item
   * 
   * 根据需求 3.2：
   * - 使用 ItemType="assembly" 和 geometryType="COMPONENT"
   * - 包含 ItemInstance 和 AssembleToName
   * - 不直接引用形状
   * 
   * @param component 组件数据
   * @param singleItemId 中间 single Item 的 ID
   * @returns 顶层 assembly Item
   */
  private createAssemblyItem(component: ComponentData, singleItemId: string): EDMDItem {
    // 创建 ItemInstance
    const itemInstance = this.createItemInstance(
      singleItemId,
      component.transformation,
      component.assembleToName,
      component.zOffset
    );
    
    // 构建 assembly Item
    const assemblyItem: EDMDItem = {
      id: component.id,
      ItemType: ItemType.ASSEMBLY,
      geometryType: 'COMPONENT' as any, // 使用 COMPONENT 几何类型
      Name: component.name,
      Identifier: component.identifier,
      AssembleToName: component.assembleToName,
      ItemInstances: [itemInstance],
      // 注意：不包含 Shape 属性（根据需求 3.3）
    };
    
    // 添加基线标记（如果有）
    if (component.baseline !== undefined) {
      assemblyItem.Baseline = {
        Value: component.baseline.toString()
      };
    }
    
    return assemblyItem;
  }
  
  /**
   * 创建中间 single Item
   * 
   * 根据需求 3.4：
   * - 使用 ItemType="single"
   * - 包含 PackageName、用户属性和形状引用
   * 
   * @param component 组件数据
   * @param singleItemId single Item 的 ID
   * @returns 中间 single Item
   */
  private createSingleItem(component: ComponentData, singleItemId: string): EDMDItem {
    // 构建 single Item
    const singleItem: EDMDItem = {
      id: singleItemId,
      ItemType: ItemType.SINGLE,
      Name: `${component.name}_Definition`,
      PackageName: component.packageName,
      UserProperties: component.userProperties,
      // 根据需求 4.1-4.4，形状引用应该使用元素文本内容，而不是 href 属性
      // 如果有多个形状，引用第一个（或者可以创建一个组合形状）
      Shape: component.shapeIds.length > 0 ? component.shapeIds[0] : undefined,
    };
    
    // 添加基线标记（如果有）
    if (component.baseline !== undefined) {
      singleItem.Baseline = {
        Value: component.baseline.toString()
      };
    }
    
    return singleItem;
  }
  
  /**
   * 创建底层形状元素
   * 
   * 根据需求 3.7：
   * - 使用 EDMDAssemblyComponent 或 ShapeElement 定义实际几何
   * 
   * 注意：这个方法目前返回空数组，因为形状元素通常已经在 Body 中定义
   * 如果需要动态创建形状元素，可以在这里实现
   * 
   * @param component 组件数据
   * @returns 形状元素数组
   */
  private createShapeElements(component: ComponentData): any[] {
    // 目前不创建新的形状元素，假设形状已经在 Body 中定义
    // 如果需要创建，可以在这里实现
    return [];
  }
  
  /**
   * 创建 ItemInstance
   * 
   * 根据需求 3.5 和 3.6：
   * - 引用中间 single Item
   * - 包含变换矩阵，定义组件在板上的位置和旋转
   * 
   * @param singleItemId 中间 single Item 的 ID
   * @param transformation 变换矩阵
   * @param assembleToName 装配到的目标
   * @param zOffset 可选的 Z 偏移
   * @returns ItemInstance 对象
   */
  private createItemInstance(
    singleItemId: string,
    transformation: EDMDTransformation2D,
    assembleToName: string,
    zOffset?: number
  ): any {
    const instanceId = `${singleItemId}_INSTANCE`;
    
    const instance: any = {
      id: instanceId,
      // 根据需求 4.1-4.4，Item 引用应该使用元素文本内容，不使用 # 前缀
      Item: singleItemId,
      InstanceName: {
        SystemScope: 'ECAD',
        ObjectName: 'Instance_1'
      },
      Transformation: transformation
    };
    
    // 添加 Z 偏移（如果有）
    if (zOffset !== undefined) {
      instance.zOffset = zOffset;
    }
    
    return instance;
  }
  
  /**
   * 从位置和旋转创建 2D 变换矩阵
   * 
   * 这是一个辅助方法，用于从简单的位置和旋转参数创建变换矩阵
   * 
   * @param x X 坐标
   * @param y Y 坐标
   * @param rotation 旋转角度（弧度）
   * @returns 2D 变换矩阵
   */
  static createTransformationFromPosition(
    x: number,
    y: number,
    rotation: number = 0
  ): EDMDTransformation2D {
    // 计算旋转矩阵分量
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    return {
      TransformationType: 'd2',
      xx: cos,
      xy: -sin,
      yx: sin,
      yy: cos,
      tx: { Value: x },
      ty: { Value: y }
    };
  }
  
  /**
   * 验证组件数据的完整性
   * 
   * @param component 组件数据
   * @throws Error 如果数据不完整或无效
   */
  static validateComponentData(component: ComponentData): void {
    if (!component.id) {
      throw new Error('Component ID is required');
    }
    
    if (!component.name) {
      throw new Error('Component name is required');
    }
    
    if (!component.identifier) {
      throw new Error('Component identifier is required');
    }
    
    if (!component.packageName) {
      throw new Error('Component package name is required');
    }
    
    if (!component.assembleToName) {
      throw new Error('Component assembleToName is required');
    }
    
    if (!component.transformation) {
      throw new Error('Component transformation is required');
    }
    
    if (!component.shapeIds || component.shapeIds.length === 0) {
      console.warn(`Component ${component.id} has no shape IDs`);
    }
  }
}
