// ============= 数据验证工具函数 =============
// DESIGN: 提供各种数据类型的验证函数
// BUSINESS: 确保输入数据的完整性和正确性

import { 
  ComponentData, 
  HoleData, 
  KeepoutData, 
  LayerData, 
  LayerStackupData,
  GeometryData 
} from '../types/exporter/idx-exporter';

/**
 * 检查是否为有效的组件数据
 */
export function isValidComponentData(data: any): data is ComponentData {
  return data && 
    typeof data.refDes === 'string' &&
    typeof data.partNumber === 'string' &&
    typeof data.packageName === 'string' &&
    data.position &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number' &&
    typeof data.position.rotation === 'number' &&
    data.dimensions &&
    typeof data.dimensions.width === 'number' &&
    typeof data.dimensions.height === 'number' &&
    typeof data.dimensions.thickness === 'number';
}

/**
 * 检查是否为有效的孔数据
 */
export function isValidHoleData(data: any): data is HoleData {
  return data &&
    typeof data.id === 'string' &&
    (data.type === 'plated' || data.type === 'non-plated') &&
    data.position &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number' &&
    typeof data.diameter === 'number' &&
    data.diameter > 0;
}

/**
 * 检查是否为有效的禁止区数据
 */
export function isValidKeepoutData(data: any): data is KeepoutData {
  return data &&
    typeof data.id === 'string' &&
    ['component', 'via', 'trace', 'testpoint', 'thermal', 'other'].includes(data.type) &&
    data.geometry &&
    ['rectangle', 'circle', 'polygon'].includes(data.geometry.type) &&
    Array.isArray(data.layers) &&
    data.layers.length > 0;
}

/**
 * 检查是否为有效的层数据
 */
export function isValidLayerData(data: any): data is LayerData {
  return data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.thickness === 'number' &&
    data.thickness > 0;
}

/**
 * 检查是否为有效的层叠结构数据
 */
export function isValidLayerStackupData(data: any): data is LayerStackupData {
  return data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.layers) &&
    data.layers.length > 0 &&
    data.layers.every((layer: any) => 
      typeof layer.layerId === 'string' &&
      typeof layer.position === 'number' &&
      typeof layer.thickness === 'number' &&
      layer.thickness > 0
    );
}

/**
 * 验证几何数据的完整性
 */
export function validateGeometry(geometry: GeometryData): boolean {
  switch (geometry.type) {
    case 'rectangle':
      return !!(geometry.center && 
        typeof geometry.width === 'number' && geometry.width > 0 &&
        typeof geometry.height === 'number' && geometry.height > 0);
    
    case 'circle':
      return !!(geometry.center && 
        typeof geometry.radius === 'number' && geometry.radius > 0);
    
    case 'polygon':
      return !!(geometry.points && 
        Array.isArray(geometry.points) && 
        geometry.points.length >= 3 &&
        geometry.points.every(p => 
          typeof p.x === 'number' && typeof p.y === 'number'
        ));
    
    default:
      return false;
  }
}