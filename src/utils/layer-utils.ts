// ============= 层相关工具函数 =============
// DESIGN: 提供层叠结构计算和操作的工具函数
// BUSINESS: 支持PCB层叠结构的分析和处理

import { LayerStackupData, LayerType } from '../types/exporter/idx-exporter';

/**
 * 计算层叠结构的总厚度
 */
export function calculateStackupThickness(stackup: LayerStackupData): number {
  return stackup.layers.reduce((total, layer) => total + layer.thickness, 0);
}

/**
 * 获取层在层叠结构中的Z位置
 */
export function getLayerZPosition(stackup: LayerStackupData, layerId: string): number | undefined {
  let zPosition = 0;
  
  for (const layer of stackup.layers) {
    if (layer.layerId === layerId) {
      return zPosition + layer.thickness / 2; // 返回层中心的Z位置
    }
    zPosition += layer.thickness;
  }
  
  return undefined;
}

/**
 * 创建默认的层叠结构（4层板）
 */
export function createDefault4LayerStackup(): LayerStackupData {
  return {
    id: 'STACKUP_4L_DEFAULT',
    name: '4-Layer Standard',
    totalThickness: 1.6,
    description: 'Standard 4-layer PCB stackup',
    boardType: 'rigid',
    layers: [
      { layerId: 'L1_TOP', position: 1, thickness: 0.035, material: 'Copper' },
      { layerId: 'D1_PREPREG', position: 2, thickness: 0.2, material: 'FR4' },
      { layerId: 'L2_GND', position: 3, thickness: 0.035, material: 'Copper' },
      { layerId: 'CORE', position: 4, thickness: 1.065, material: 'FR4' },
      { layerId: 'L3_PWR', position: 5, thickness: 0.035, material: 'Copper' },
      { layerId: 'D2_PREPREG', position: 6, thickness: 0.2, material: 'FR4' },
      { layerId: 'L4_BOTTOM', position: 7, thickness: 0.035, material: 'Copper' }
    ],
    impedanceControl: {
      singleEnded: 50,
      differential: 100,
      tolerance: 10
    }
  };
}