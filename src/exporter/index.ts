// ============= IDX导出器主入口 =============

import { IDXExportConfig, ExportResult, GlobalUnit, EDMDDataSet, EDMDHeader } from '../types/core';
import { BoardBuilder, BoardData } from './builders/board-builder';
import { BuilderConfig, BuilderContext } from './builders/base-builder';

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
  
  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
  }
  
  /**
   * 主要导出方法
   */
  async export(data: ExportSourceData): Promise<ExportResult> {
    const context = new ExportContextImpl();
    const startTime = Date.now();
    
    try {
      // 构建数据集
      const dataset = await this.buildDataset(data, context);
      
      // 这里应该调用XML写入器，暂时返回模拟结果
      const exportDuration = Date.now() - startTime;
      
      return {
        success: true,
        files: [{
          type: 'baseline' as any,
          name: this.config.output.designName,
          path: `${this.config.output.directory}/${this.config.output.designName}.idx`,
          timestamp: new Date().toISOString(),
          designName: this.config.output.designName,
          sequence: 1
        }],
        statistics: {
          totalItems: 1,
          components: data.components?.length || 0,
          holes: data.holes?.length || 0,
          keepouts: data.keepouts?.length || 0,
          layers: 0,
          fileSize: 0,
          exportDuration
        },
        issues: [
          ...context.getWarnings().map(w => ({ type: 'warning' as const, ...w })),
          ...context.getErrors().map(e => ({ type: 'error' as const, ...e }))
        ]
      };
    } catch (error: any) {
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
          exportDuration: Date.now() - startTime
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
