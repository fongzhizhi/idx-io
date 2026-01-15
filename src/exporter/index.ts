// ============= IDX导出器主入口 =============

import { IDXExportConfig, ExportResult, GlobalUnit, EDMDDataSet, EDMDHeader, IDXFileType } from '../types/core';
import { BoardBuilder, BoardData } from './builders/board-builder';
import { BuilderConfig, BuilderContext } from './builders/base-builder';
import { XMLWriter } from './writers/xml-writer';
import { FileWriter } from './writers/file-writer';

/**
 * 导出源数据接口
 */
export interface ExportSourceData {
  board: BoardData;
  components?: any[];
  holes?: any[];
  keepouts?: any[];
}

/**
 * 导出上下文实现
 */
class ExportContextImpl implements BuilderContext {
  private sequences: Map<string, number> = new Map();
  private warnings: Array<{ code: string; message: string; itemId?: string }> = [];
  private errors: Array<{ code: string; message: string; itemId?: string }> = [];
  
  getNextSequence(type: string): number {
    const current = this.sequences.get(type) || 0;
    const next = current + 1;
    this.sequences.set(type, next);
    return next;
  }
  
  addWarning(code: string, message: string, itemId?: string): void {
    this.warnings.push({ code, message, itemId });
  }
  
  addError(code: string, message: string, itemId?: string): void {
    this.errors.push({ code, message, itemId });
  }
  
  generateId(type: string, identifier?: string): string {
    const seq = this.getNextSequence(type);
    if (identifier) {
      return `${type}_${identifier}_${seq.toString().padStart(3, '0')}`;
    }
    return `${type}_${Date.now()}_${seq.toString().padStart(3, '0')}`;
  }
  
  getWarnings() {
    return this.warnings;
  }
  
  getErrors() {
    return this.errors;
  }
}

/**
 * IDX导出器主类
 */
export class IDXExporter {
  private config: IDXExportConfig;
  private xmlWriter: XMLWriter;
  private fileWriter: FileWriter;
  
  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
    
    // 初始化写入器
    this.xmlWriter = new XMLWriter({
      prettyPrint: true,
      encoding: 'UTF-8'
    });
    
    this.fileWriter = new FileWriter({
      outputDirectory: this.config.output.directory,
      designName: this.config.output.designName,
      namingPattern: this.config.output.namingPattern,
      overwrite: true
    });
  }
  
  /**
   * 主要导出方法
   */
  async export(data: ExportSourceData): Promise<ExportResult> {
    const context = new ExportContextImpl();
    const startTime = Date.now();
    
    try {
      // 1. 验证输出目录
      const canWrite = await this.fileWriter.checkOutputDirectory();
      if (!canWrite) {
        throw new Error(`无法写入输出目录: ${this.config.output.directory}`);
      }
      
      // 2. 构建数据集
      const dataset = await this.buildDataset(data, context);
      
      // 3. 序列化为XML
      const xmlContent = this.xmlWriter.serialize(dataset);
      
      // 4. 写入文件
      const writeResult = await this.fileWriter.writeFile(
        xmlContent, 
        IDXFileType.BASELINE
      );
      
      const exportDuration = Date.now() - startTime;
      
      return {
        success: true,
        files: [writeResult.metadata],
        statistics: {
          totalItems: dataset.Body.Items.length,
          components: data.components?.length || 0,
          holes: data.holes?.length || 0,
          keepouts: data.keepouts?.length || 0,
          layers: 0,
          fileSize: writeResult.fileSize,
          exportDuration
        },
        issues: [
          ...context.getWarnings().map(w => ({ type: 'warning' as const, ...w })),
          ...context.getErrors().map(e => ({ type: 'error' as const, ...e }))
        ]
      };
    } catch (error: any) {
      const exportDuration = Date.now() - startTime;
      
      return {
        success: false,
        files: [],
        statistics: {
          totalItems: 0,
          components: 0,
          holes: 0,
          keepouts: 0,
          layers: 0,
          fileSize: 0,
          exportDuration
        },
        issues: [{
          type: 'error',
          code: 'EXPORT_FAILED',
          message: error.message
        }]
      };
    }
  }
  
  private async buildDataset(data: ExportSourceData, context: ExportContextImpl): Promise<EDMDDataSet> {
    const builderConfig: BuilderConfig = {
      useSimplified: this.config.geometry.useSimplified,
      defaultUnit: this.config.geometry.defaultUnit,
      creatorSystem: this.config.collaboration.creatorSystem,
      precision: this.config.geometry.precision
    };
    
    // 构建板子
    const boardBuilder = new BoardBuilder(builderConfig, context);
    const boardItem = await boardBuilder.build(data.board);
    
    // 构建头部
    const header: EDMDHeader = {
      CreatorSystem: this.config.collaboration.creatorSystem,
      CreatorCompany: this.config.collaboration.creatorCompany,
      GlobalUnitLength: this.config.geometry.defaultUnit,
      CreationDateTime: new Date().toISOString(),
      ModifiedDateTime: new Date().toISOString()
    };
    
    // 构建数据集
    const dataset: EDMDDataSet = {
      Header: header,
      Body: {
        Items: [boardItem]
      },
      ProcessInstruction: {
        id: 'INSTRUCTION_001',
        instructionType: 'SendInformation'
      }
    };
    
    return dataset;
  }
  
  private mergeConfig(config: Partial<IDXExportConfig>): IDXExportConfig {
    return {
      output: {
        directory: config.output?.directory || './output',
        designName: config.output?.designName || 'design',
        compress: config.output?.compress || false,
        namingPattern: config.output?.namingPattern || '{designName}_{type}.idx'
      },
      protocolVersion: config.protocolVersion || '4.5',
      geometry: {
        useSimplified: config.geometry?.useSimplified !== false,
        defaultUnit: config.geometry?.defaultUnit || GlobalUnit.UNIT_MM,
        precision: config.geometry?.precision || 6
      },
      collaboration: {
        creatorSystem: config.collaboration?.creatorSystem || 'IDX-IO',
        creatorCompany: config.collaboration?.creatorCompany || '',
        includeNonCollaborative: config.collaboration?.includeNonCollaborative || false,
        includeLayerStackup: config.collaboration?.includeLayerStackup || false
      }
    };
  }
}

// 导出类型和接口
export { GlobalUnit } from '../types/core';
export type { IDXExportConfig, ExportResult } from '../types/core';
