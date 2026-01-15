import { ExportSourceData } from ".";
import { IDXExportConfig, ExportResult, SendInformationMessage, EDMDProcessInstructionSendInformation, SendChangesMessage } from "../types/core";
import { BaseBuilder } from "./builders/base-builder";
import { BoardData } from "./builders/board-builder";

// src/exporter/idx-exporter.ts
export class IDXExporter {
  private config: IDXExportConfig;
  private builders: Map<string, BaseBuilder>;
  private assembler: DatasetAssembler;
  private writer: IDXWriter;
  private validators: ValidatorChain;

  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.initializeComponents();
  }

  /**
   * 主要导出方法
   */
  async export(data: ExportSourceData): Promise<ExportResult> {
    const context = new ExportContext(this.config);
    
    try {
      // 1. 验证和转换输入数据
      const validatedData = await this.validators.validate(data);
      
      // 2. 通过适配器转换数据
      const idxData = await this.adapter.adapt(validatedData);
      
      // 3. 构建IDX数据结构
      const dataset = await this.buildDataset(idxData, context);
      
      // 4. 写入文件
      const files = await this.writer.write(dataset, context);
      
      return {
        success: true,
        files,
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
    
    // 构建Body
    const body = this.assembler.assembleBaselineBody(boardData);
    
    // 构建ProcessInstruction
    const instruction: EDMDProcessInstructionSendInformation = {
      id: this.generateId('INSTRUCTION'),
      instructionType: 'SendInformation'
    };

    return {
      Header: header,
      Body: body,
      ProcessInstruction: instruction
    };
  }

  /**
   * 创建变更消息
   */
  createChangeMessage(changeData: ChangeData): SendChangesMessage {
    // 实现变更消息构建逻辑
  }
}