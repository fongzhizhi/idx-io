/**
 * 案例工具函数
 * 
 * @description 为所有案例提供通用的配置和工具函数
 * @author IDX导入导出项目
 */

import { IDXBuilder } from '../../src/exporter/builder/IDXBuilder';
import { IDXWriter } from '../../src/exporter/writer/IDXWriter';
import { ECADData } from '../../src/types/ecad/ecad.interface';
import { GlobalUnit } from '../../src/types/edmd/base.types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 案例输出配置
 */
export interface ExampleConfig {
    /** 案例名称（用于文件名） */
    name: string;
    /** 案例描述 */
    description: string;
    /** 输出目录，默认为 'outputs' */
    outputDir?: string;
    /** 是否显示详细输出信息 */
    verbose?: boolean;
}

/**
 * IDX生成结果
 */
export interface IDXGenerationResult {
    /** 传统建模方式的IDX内容 */
    traditional: string;
    /** 简化建模方式的IDX内容 */
    simplified: string;
    /** 传统建模文件路径 */
    traditionalPath: string;
    /** 简化建模文件路径 */
    simplifiedPath: string;
}

/**
 * 生成IDX文件的通用函数
 * 
 * @param ecadData ECAD数据
 * @param config 案例配置
 * @returns 生成结果
 */
export function generateIDXFiles(ecadData: ECADData, config: ExampleConfig): IDXGenerationResult {
    const { name, description, outputDir = 'outputs', verbose = true } = config;
    
    if (verbose) {
        console.log(`=== ${description} ===`);
    }
    
    try {
        // 确保输出目录存在
        const fullOutputDir = path.resolve(outputDir);
        if (!fs.existsSync(fullOutputDir)) {
            fs.mkdirSync(fullOutputDir, { recursive: true });
        }
        
        // 生成传统建模方式
        if (verbose) {
            console.log('生成传统建模方式...');
        }
        const traditionalBuilder = new IDXBuilder({
            useSimplified: false,
            systemScope: 'ECADSYSTEM',
        });
        const traditionalDataSet = traditionalBuilder.build(ecadData);
        const traditionalWriter = new IDXWriter();
        const traditionalIDX = traditionalWriter.serialize(traditionalDataSet);
        
        // 生成简化建模方式
        if (verbose) {
            console.log('生成简化建模方式...');
        }
        const simplifiedBuilder = new IDXBuilder({
            useSimplified: true,
            systemScope: 'ECADSYSTEM',
        });
        const simplifiedDataSet = simplifiedBuilder.build(ecadData);
        const simplifiedWriter = new IDXWriter();
        const simplifiedIDX = simplifiedWriter.serialize(simplifiedDataSet);
        
        // 生成文件路径
        const traditionalPath = path.join(fullOutputDir, `${name}.trad.idx`);
        const simplifiedPath = path.join(fullOutputDir, `${name}.simp.idx`);
        
        // 写入文件
        fs.writeFileSync(traditionalPath, traditionalIDX, 'utf-8');
        fs.writeFileSync(simplifiedPath, simplifiedIDX, 'utf-8');
        
        if (verbose) {
            console.log(`✓ 传统建模文件已生成: ${traditionalPath}`);
            console.log(`✓ 简化建模文件已生成: ${simplifiedPath}`);
            
            // 显示文件信息
            const traditionalStats = fs.statSync(traditionalPath);
            const simplifiedStats = fs.statSync(simplifiedPath);
            console.log(`\n文件信息:`);
            console.log(`传统建模文件大小: ${traditionalStats.size} bytes`);
            console.log(`简化建模文件大小: ${simplifiedStats.size} bytes`);
            
            // 显示预览
            console.log('\n=== 传统建模方式预览 ===');
            console.log(traditionalIDX.substring(0, 600) + '...');
            
            console.log('\n=== 简化建模方式预览 ===');
            console.log(simplifiedIDX.substring(0, 600) + '...');
            
            console.log(`\n🎉 ${description}执行完成！`);
        }
        
        return {
            traditional: traditionalIDX,
            simplified: simplifiedIDX,
            traditionalPath,
            simplifiedPath,
        };
        
    } catch (error) {
        console.error(`❌ 执行${description}时出错:`, error);
        throw error;
    }
}

/**
 * 创建基础的ECAD元数据
 * 
 * @param designName 设计名称
 * @param description 描述
 * @returns ECAD元数据
 */
export function createBaseMetadata(designName: string, description: string) {
    return {
        designName,
        revision: '1.0',
        creator: {
            name: 'IDX Example',
            company: 'Example Company',
            system: 'IDX Builder',
            version: '1.0.0',
        },
        timestamps: {
            created: new Date().toISOString(),
        },
        globalUnit: GlobalUnit.UNIT_MM,
        description,
    };
}

/**
 * 检查案例是否可以直接运行
 * 
 * @param filename 当前文件名（通常是 __filename 或 process.argv[1]）
 * @param targetName 目标案例名称（如 '01.simple-board'）
 * @returns 是否应该执行
 */
export function shouldExecuteExample(filename: string, targetName: string): boolean {
    // 检查是否直接运行此文件
    const isDirectRun = require.main === module || 
                       (process.argv[1]?.includes(targetName));
    return isDirectRun;
}

/**
 * 打印案例开始信息
 * 
 * @param caseNumber 案例编号
 * @param caseName 案例名称
 * @param description 案例描述
 */
export function printCaseHeader(caseNumber: string, caseName: string, description: string) {
    console.log('='.repeat(60));
    console.log(`案例${caseNumber}：${caseName}`);
    console.log(`描述：${description}`);
    console.log('='.repeat(60));
}

/**
 * 创建标准的案例执行函数
 * 
 * @param caseNumber 案例编号
 * @param caseName 案例名称
 * @param description 案例描述
 * @param createECADData 创建ECAD数据的函数
 * @returns 执行函数
 */
export function createExampleRunner(
    caseNumber: string,
    caseName: string,
    description: string,
    createECADData: () => ECADData
) {
    return function runExample() {
        printCaseHeader(caseNumber, caseName, description);
        
        const ecadData = createECADData();
        const config: ExampleConfig = {
            name: `${caseNumber}.${caseName.toLowerCase().replace(/\s+/g, '-')}`,
            description: `案例${caseNumber}：${caseName}`,
        };
        
        return generateIDXFiles(ecadData, config);
    };
}