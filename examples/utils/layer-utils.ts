/**
 * 层和层堆叠工具函数
 * 
 * @description 为案例提供标准的层和层堆叠创建功能
 * @author IDX导入导出项目
 */

import { ECADLayer, ECADLayerStackup, ECADLayerType } from '../../src/types/ecad/ecad.interface';

/**
 * 层定义配置
 */
export interface LayerConfig {
    /** 层ID */
    id: string;
    /** 层名称 */
    name: string;
    /** 层类型 */
    type: ECADLayerType;
    /** 层厚度（mm） */
    thickness: number;
    /** 材料名称（可选） */
    material?: string;
    /** 层颜色（可选） */
    color?: string;
}

/**
 * 创建标准四层板的层定义
 * 
 * @returns 四层板的层定义映射
 */
export function createStandardFourLayers(): Record<string, ECADLayer> {
    const layerConfigs: LayerConfig[] = [
        {
            id: 'TOP',
            name: 'Top Layer',
            type: ECADLayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper',
            color: 'Red'
        },
        {
            id: 'INNER1',
            name: 'Inner Layer 1',
            type: ECADLayerType.POWER_GROUND,
            thickness: 0.035,
            material: 'Copper',
            color: 'Blue'
        },
        {
            id: 'INNER2',
            name: 'Inner Layer 2',
            type: ECADLayerType.POWER_GROUND,
            thickness: 0.035,
            material: 'Copper',
            color: 'Green'
        },
        {
            id: 'BOTTOM',
            name: 'Bottom Layer',
            type: ECADLayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper',
            color: 'Blue'
        }
    ];
    
    const layers: Record<string, ECADLayer> = {};
    
    layerConfigs.forEach(config => {
        layers[config.id] = {
            id: config.id,
            name: config.name,
            type: config.type,
            thickness: config.thickness,
            ...(config.material && { material: config.material }),
            ...(config.color && { color: config.color }),
        };
    });
    
    return layers;
}

/**
 * 创建标准四层板的介电层
 * 
 * @returns 介电层定义映射
 */
export function createStandardDielectricLayers(): Record<string, ECADLayer> {
    const dielectricConfigs: LayerConfig[] = [
        {
            id: 'DIELECTRIC1',
            name: 'Dielectric 1',
            type: ECADLayerType.DIELECTRIC,
            thickness: 0.2,
            material: 'FR4'
        },
        {
            id: 'CORE',
            name: 'Core',
            type: ECADLayerType.DIELECTRIC,
            thickness: 1.2,
            material: 'FR4'
        },
        {
            id: 'DIELECTRIC2',
            name: 'Dielectric 2',
            type: ECADLayerType.DIELECTRIC,
            thickness: 0.2,
            material: 'FR4'
        }
    ];
    
    const layers: Record<string, ECADLayer> = {};
    
    dielectricConfigs.forEach(config => {
        layers[config.id] = {
            id: config.id,
            name: config.name,
            type: config.type,
            thickness: config.thickness,
            ...(config.material && { material: config.material }),
        };
    });
    
    return layers;
}

/**
 * 创建标准四层板的层堆叠
 * 
 * @returns 层堆叠定义映射
 */
export function createStandardFourLayerStackup(): Record<string, ECADLayerStackup> {
    // 层顺序：从底到顶
    const layerOrder = [
        'BOTTOM',      // 底层信号层
        'DIELECTRIC2', // 介电层2
        'INNER2',      // 内层2（电源/地）
        'CORE',        // 核心介电层
        'INNER1',      // 内层1（电源/地）
        'DIELECTRIC1', // 介电层1
        'TOP'          // 顶层信号层
    ];
    
    const stackup: ECADLayerStackup = {
        id: 'MAIN_STACKUP',
        name: 'Main Layer Stackup',
        description: 'Standard 4-layer PCB stackup',
        layerIds: layerOrder,
    };
    
    return {
        [stackup.id]: stackup
    };
}

/**
 * 创建完整的四层板层结构
 * 
 * @returns 包含所有层和层堆叠的对象
 */
export function createCompleteFourLayerStructure() {
    const signalLayers = createStandardFourLayers();
    const dielectricLayers = createStandardDielectricLayers();
    const stackups = createStandardFourLayerStackup();
    
    // 合并所有层
    const allLayers = {
        ...signalLayers,
        ...dielectricLayers
    };
    
    return {
        layers: allLayers,
        stackups: stackups,
        mainStackupId: 'MAIN_STACKUP'
    };
}

/**
 * 获取层的显示名称
 * 
 * @param layerId 层ID
 * @returns 层的显示名称
 */
export function getLayerDisplayName(layerId: string): string {
    const layerNames: Record<string, string> = {
        'TOP': '顶层',
        'INNER1': '内层1',
        'INNER2': '内层2',
        'BOTTOM': '底层',
        'DIELECTRIC1': '介电层1',
        'CORE': '核心层',
        'DIELECTRIC2': '介电层2'
    };
    
    return layerNames[layerId] || layerId;
}

/**
 * 计算层堆叠的总厚度
 * 
 * @param layers 层定义映射
 * @param stackup 层堆叠定义
 * @returns 总厚度（mm）
 */
export function calculateStackupThickness(layers: Record<string, ECADLayer>, stackup: ECADLayerStackup): number {
    let totalThickness = 0;
    
    stackup.layerIds.forEach(layerId => {
        const layer = layers[layerId];
        if (layer) {
            totalThickness += layer.thickness;
        }
    });
    
    return totalThickness;
}