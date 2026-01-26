/**
 * 案例2：层和层堆叠
 * 
 * @description 演示层和层堆叠的建模方式，展示层和层堆叠在IDX中的结构
 * @author IDX导入导出项目
 */

import { ECADData, ECADBoard } from '../src/types/ecad/ecad.interface';
import { createBaseMetadata, createExampleRunner, shouldExecuteExample } from './utils/example-utils';
import { createBoardOutline, PCB_SIZES } from './utils/geometry-utils';
import { createCompleteFourLayerStructure, calculateStackupThickness } from './utils/layer-utils';

/**
 * 创建四层板的ECAD数据
 */
function createFourLayerBoardData(): ECADData {
    // 创建100mm x 80mm的矩形板
    const boardOutline = createBoardOutline(PCB_SIZES.STANDARD_SMALL.width, PCB_SIZES.STANDARD_SMALL.height);

    // 创建完整的四层板结构
    const layerStructure = createCompleteFourLayerStructure();
    
    // 获取主层堆叠
    const mainStackup = layerStructure.stackups[layerStructure.mainStackupId];
    if (!mainStackup) {
        throw new Error(`Main stackup not found: ${layerStructure.mainStackupId}`);
    }
    
    // 计算总厚度
    const totalThickness = calculateStackupThickness(layerStructure.layers, mainStackup);

    // 板子定义
    const board: ECADBoard = {
        name: 'Four Layer Board',
        description: 'A four-layer PCB with standard stackup',
        outline: boardOutline,
        stackupId: layerStructure.mainStackupId, // 使用层堆叠而不是简单厚度
    };

    // ECAD数据集
    const ecadData: ECADData = {
        metadata: createBaseMetadata(
            'Four Layer Board Example', 
            `案例2：层和层堆叠 - 四层板（总厚度${totalThickness.toFixed(2)}mm）`
        ),
        board,
        layers: layerStructure.layers,
        stackups: layerStructure.stackups,
        models: {},
        footprints: {},
        components: [],
        holes: [],
        constraints: [],
    };

    return ecadData;
}

// 创建案例执行器
const runExample = createExampleRunner(
    '02',
    'layer-and-layer-stackup',
    '演示层和层堆叠的建模方式，展示四层板（底层、内层1、内层2、顶层）及介电层结构',
    createFourLayerBoardData
);

// 如果直接运行此文件，执行案例
if (shouldExecuteExample(__filename, '02.layer-and-layer-stackup')) {
    runExample();
}