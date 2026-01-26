/**
 * 案例1：简单板子
 * 
 * @description 展示IDX基本结构的简单矩形板，厚度为1.6mm，无其他项目
 * @author IDX导入导出项目
 */

import { ECADData, ECADBoard } from '../src/types/ecad/ecad.interface';
import { createBaseMetadata, createExampleRunner, shouldExecuteExample } from './utils/example-utils';
import { createBoardOutline, PCB_SIZES } from './utils/geometry-utils';

/**
 * 创建简单板子的ECAD数据
 */
function createSimpleBoardData(): ECADData {
    // 创建100mm x 80mm的矩形板
    const boardOutline = createBoardOutline(PCB_SIZES.STANDARD_SMALL.width, PCB_SIZES.STANDARD_SMALL.height);

    // 板子定义
    const board: ECADBoard = {
        name: 'Simple Board',
        description: 'A simple rectangular PCB board',
        outline: boardOutline,
        thickness: 1.6, // 1.6mm厚度
    };

    // ECAD数据集
    const ecadData: ECADData = {
        metadata: createBaseMetadata('Simple Board Example', '案例1：简单板子 - 展示IDX基本结构'),
        board,
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
    '01',
    'simple-board',
    '展示IDX基本结构的简单矩形板，厚度为1.6mm，无其他项目',
    createSimpleBoardData
);

// 如果直接运行此文件，执行案例
if (shouldExecuteExample(__filename, '01.simple-board')) {
    runExample();
}