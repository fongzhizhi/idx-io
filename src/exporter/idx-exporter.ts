import { ExportSourceData } from ".";
import { IDXExportConfig, ExportResult, SendInformationMessage, EDMDProcessInstructionSendInformation, SendChangesMessage, EDMDDataSet, EDMDHeader, GlobalUnit } from "../types/core";
import { BoardData, DatasetAssembler, BuilderRegistry, AssemblerConfig } from "./assemblers/dataset-assembler";
import { XMLWriter } from "./writers/xml-writer";
import { BuilderConfig, BuilderContext } from "./builders/base-builder";
import { BoardBuilder } from "./builders/board-builder";
import { ComponentBuilder } from "./builders/component-builder";
import { ViaBuilder } from "./builders/via-builder";
import { KeepoutBuilder } from "./builders/keepout-builder";

/**
 * 导出上下文实现
 */
class ExportContext implements BuilderContext {
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
  
  getStatistics() {
    return {
      totalItems: 0,
      components: 0,
      holes: 0,
      keepouts: 0,
      layers: 0,
      fileSize: 0,
      exportDuration: 0
    };
  }
  
  getIssues() {
    return [
      ...this.warnings.map(w => ({ type: 'warning' as const, ...w })),
      ...this.errors.map(e => ({ type: 'error' as const, ...e }))
    ];
  }
}

/**
 * 简单的构建器注册表实现
 */
class SimpleBuilderRegistry implements BuilderRegistry {
  private builders: Map<string, any> = new Map();
  
  constructor(private config: BuilderConfig, private context: BuilderContext) {
    // 注册默认构建器
    this.builders.set('board', new BoardBuilder(config, context));
    this.builders.set('component', new ComponentBuilder(config, context));
    this.builders.set('plated-hole', new ViaBuilder(config, context));
    this.builders.set('non-plated-hole', new ViaBuilder(config, context));
    this.builders.set('keepout', new KeepoutBuilder(config, context));
  }
  
  get(type: string): any {
    return this.builders.get(type);
  }
}

// src/exporter/idx-exporter.ts
export class IDXExporter {
  private config: IDXExportConfig;
  private assembler!: DatasetAssembler;
  private writer!: XMLWriter;

  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.initializeComponents();
  }

  /**
   * 初始化组件
   */
  private initializeComponents(): void {
    // 创建XML写入器
    this.writer = new XMLWriter({
      prettyPrint: true,
      encoding: 'UTF-8'
    });
  }

  /**
   * 主要导出方法
   */
  async export(data: ExportSourceData): Promise<ExportResult> {
    const context = new ExportContext();
    
    try {
      // 1. 验证和转换输入数据
      const validatedData = this.validateData(data);
      
      // 2. 构建IDX数据结构
      const dataset = await this.buildDataset(validatedData, context);
      
      // 3. 写入文件
      const xmlContent = this.writer.serialize(dataset);
      
      return {
        success: true,
        files: [{
          type: 'baseline' as any,
          name: 'export.idx',
          path: 'export.idx',
          timestamp: new Date().toISOString(),
          designName: this.config.output.designName,
          sequence: 1
        }],
        statistics: context.getStatistics(),
        issues: context.getIssues()
      };
    } catch (error) {
      return this.handleExportError(error, context);
    }
  }

  /**
   * 创建基线消息
   */
  createBaseline(boardData: BoardData): SendInformationMessage {
    // 构建Header
    const header = this.buildHeader('Baseline');
    
    // 构建Body - 这里需要实际的组装器
    const context = new ExportContext();
    const builderConfig: BuilderConfig = {
      useSimplified: this.config.geometry.useSimplified,
      defaultUnit: this.config.geometry.defaultUnit,
      creatorSystem: this.config.collaboration.creatorSystem,
      precision: this.config.geometry.precision
    };
    
    const builderRegistry = new SimpleBuilderRegistry(builderConfig, context);
    const assemblerConfig: AssemblerConfig = {
      useSimplified: this.config.geometry.useSimplified,
      includeLayerStackup: this.config.collaboration.includeLayerStackup
    };
    
    this.assembler = new DatasetAssembler(builderRegistry, assemblerConfig);
    
    // 构建ProcessInstruction
    const instruction: EDMDProcessInstructionSendInformation = {
      id: this.generateId('INSTRUCTION'),
      instructionType: 'SendInformation'
    };

    return {
      Header: header,
      Body: { Items: [] }, // 临时空实现
      ProcessInstruction: instruction
    };
  }

  /**
   * 创建变更消息
   */
  createChangeMessage(changeData: any): SendChangesMessage {
    // 实现变更消息构建逻辑
    throw new Error('变更消息功能暂未实现');
  }

  /**
   * 验证输入数据
   */
  private validateData(data: ExportSourceData): ExportSourceData {
    if (!data.board) {
      throw new Error('缺少板子数据');
    }
    return data;
  }

  /**
   * 构建数据集
   */
  private async buildDataset(data: ExportSourceData, context: ExportContext): Promise<EDMDDataSet> {
    const builderConfig: BuilderConfig = {
      useSimplified: this.config.geometry.useSimplified,
      defaultUnit: this.config.geometry.defaultUnit,
      creatorSystem: this.config.collaboration.creatorSystem,
      precision: this.config.geometry.precision
    };
    
    const builderRegistry = new SimpleBuilderRegistry(builderConfig, context);
    const assemblerConfig: AssemblerConfig = {
      useSimplified: this.config.geometry.useSimplified,
      includeLayerStackup: this.config.collaboration.includeLayerStackup
    };
    
    this.assembler = new DatasetAssembler(builderRegistry, assemblerConfig);
    
    // 构建头部
    const header: EDMDHeader = {
      CreatorSystem: this.config.collaboration.creatorSystem,
      CreatorCompany: this.config.collaboration.creatorCompany,
      GlobalUnitLength: this.config.geometry.defaultUnit,
      CreationDateTime: new Date().toISOString(),
      ModifiedDateTime: new Date().toISOString()
    };
    
    // 构建Body
    const body = await this.assembler.assembleBaselineBody(data.board);
    
    // 构建数据集
    const dataset: EDMDDataSet = {
      Header: header,
      Body: body,
      ProcessInstruction: {
        id: 'INSTRUCTION_001',
        instructionType: 'SendInformation'
      }
    };
    
    return dataset;
  }

  /**
   * 构建头部
   */
  private buildHeader(type: string): EDMDHeader {
    return {
      CreatorSystem: this.config.collaboration.creatorSystem,
      CreatorCompany: this.config.collaboration.creatorCompany,
      GlobalUnitLength: this.config.geometry.defaultUnit,
      CreationDateTime: new Date().toISOString(),
      ModifiedDateTime: new Date().toISOString(),
      Description: `IDX ${type} - ${this.config.output.designName}`
    };
  }

  /**
   * 生成ID
   */
  private generateId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理导出错误
   */
  private handleExportError(error: any, context: ExportContext): ExportResult {
    return {
      success: false,
      files: [],
      statistics: context.getStatistics(),
      issues: [
        ...context.getIssues(),
        {
          type: 'error',
          code: 'EXPORT_ERROR',
          message: error.message || String(error)
        }
      ]
    };
  }

  /**
   * 合并配置
   */
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
      },
      validation: {
        enabled: config.validation?.enabled || false,
        strictness: config.validation?.strictness || 'normal'
      }
    };
  }
}