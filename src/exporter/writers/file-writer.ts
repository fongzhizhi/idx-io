// ============= Node.js文件写入器 =============
// DESIGN: 专门用于Node.js环境的IDX文件写入器
// BUSINESS: 支持本地测试、开发和服务器端导出

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { IDXExporter, XMLCommentConfig } from '../index';
import { ExtendedExportSourceData } from '../../types/data-models';
import { IDXExportConfig, ExportResult, IDXFileType } from '../../types/core';

/**
 * Node.js文件导出结果接口
 */
export interface NodeExportResult extends ExportResult {
  /** 生成的文件路径 */
  filePath: string;
  /** XML内容字符串 */
  xmlContent: string;
  /** 建议的文件名 */
  fileName: string;
}

/**
 * 文件写入选项
 */
export interface FileWriterOptions {
  /** 输出目录 */
  outputDirectory?: string;
  /** 是否创建目录（如果不存在） */
  createDirectory?: boolean;
  /** 文件编码 */
  encoding?: BufferEncoding;
  /** 是否覆盖现有文件 */
  overwrite?: boolean;
  /** 文件名前缀 */
  filePrefix?: string;
  /** 文件名后缀 */
  fileSuffix?: string;
}

/**
 * Node.js环境下的IDX文件写入器
 * 
 * @remarks
 * 专门为Node.js环境设计的IDX导出器，支持直接写入文件系统
 * 适用于服务器端应用、本地测试和开发工具
 * 
 * @example
 * ```typescript
 * const fileWriter = new IDXFileWriter({
 *   output: {
 *     directory: './output',
 *     designName: 'MyBoard'
 *   }
 * });
 * 
 * const result = await fileWriter.exportToFile(boardData, {
 *   outputDirectory: './exports',
 *   createDirectory: true
 * });
 * 
 * console.log(`文件已保存到: ${result.filePath}`);
 * ```
 */
export class IDXFileWriter {
  private exporter: IDXExporter;
  private defaultOptions: FileWriterOptions;
  
  constructor(
    config: Partial<IDXExportConfig> = {},
    commentConfig: XMLCommentConfig = {},
    fileOptions: FileWriterOptions = {}
  ) {
    // 确保输出目录配置
    const exportConfig = {
      ...config,
      output: {
        directory: './output',
        designName: 'design',
        compress: false,
        namingPattern: '{designName}_{type}_{timestamp}.idx',
        ...config.output
      }
    };
    
    this.exporter = new IDXExporter(exportConfig, commentConfig);
    
    this.defaultOptions = {
      outputDirectory: exportConfig.output.directory,
      createDirectory: true,
      encoding: 'utf8',
      overwrite: true,
      filePrefix: '',
      fileSuffix: '',
      ...fileOptions
    };
  }
  
  /**
   * 导出数据并保存到文件
   * 
   * @param data - 导出源数据
   * @param options - 文件写入选项
   * @returns Node.js导出结果
   */
  async exportToFile(
    data: ExtendedExportSourceData,
    options: FileWriterOptions = {}
  ): Promise<NodeExportResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 1. 使用IDXExporter生成XML内容
      const browserResult = await this.exporter.export(data);
      
      if (!browserResult.success) {
        return {
          ...browserResult,
          filePath: '',
          xmlContent: '',
          fileName: ''
        };
      }
      
      // 2. 生成文件名和路径
      const fileName = this.generateFileName(browserResult.fileName, mergedOptions);
      const outputDir = mergedOptions.outputDirectory || './output';
      const filePath = join(outputDir, fileName);
      
      // 3. 创建目录（如果需要）
      if (mergedOptions.createDirectory && !existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      // 4. 检查文件是否存在
      if (!mergedOptions.overwrite && existsSync(filePath)) {
        return {
          success: false,
          filePath,
          xmlContent: browserResult.xmlContent,
          fileName,
          files: [],
          statistics: browserResult.statistics,
          issues: [{
            type: 'error',
            code: 'FILE_EXISTS',
            message: `文件已存在: ${filePath}，设置 overwrite: true 以覆盖`
          }]
        };
      }
      
      // 5. 写入文件
      writeFileSync(filePath, browserResult.xmlContent, mergedOptions.encoding);
      
      // 6. 返回结果
      return {
        success: true,
        filePath,
        xmlContent: browserResult.xmlContent,
        fileName,
        files: [{
          type: IDXFileType.BASELINE,
          name: fileName,
          path: filePath,
          timestamp: new Date().toISOString(),
          designName: this.getDesignName(),
          sequence: 1
        }],
        statistics: {
          ...browserResult.statistics,
          fileSize: Buffer.byteLength(browserResult.xmlContent, mergedOptions.encoding)
        },
        issues: browserResult.issues
      };
      
    } catch (error: any) {
      return {
        success: false,
        filePath: '',
        xmlContent: '',
        fileName: '',
        files: [],
        statistics: {
          totalItems: 0,
          components: 0,
          holes: 0,
          keepouts: 0,
          layers: 0,
          fileSize: 0,
          exportDuration: 0
        },
        issues: [{
          type: 'error',
          code: 'FILE_WRITE_ERROR',
          message: `文件写入失败: ${error.message}`
        }]
      };
    }
  }
  
  /**
   * 批量导出多个设计
   * 
   * @param designs - 设计数据数组
   * @param options - 文件写入选项
   * @returns 批量导出结果
   */
  async exportBatch(
    designs: Array<{ name: string; data: ExtendedExportSourceData }>,
    options: FileWriterOptions = {}
  ): Promise<{
    success: boolean;
    results: NodeExportResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalSize: number;
    };
  }> {
    const results: NodeExportResult[] = [];
    let successful = 0;
    let failed = 0;
    let totalSize = 0;
    
    for (const design of designs) {
      try {
        // 为每个设计创建单独的子目录
        const designOptions = {
          ...options,
          outputDirectory: options.outputDirectory 
            ? join(options.outputDirectory, design.name)
            : join('./output', design.name)
        };
        
        const result = await this.exportToFile(design.data, designOptions);
        results.push(result);
        
        if (result.success) {
          successful++;
          totalSize += result.statistics.fileSize;
        } else {
          failed++;
        }
      } catch (error: any) {
        failed++;
        results.push({
          success: false,
          filePath: '',
          xmlContent: '',
          fileName: '',
          files: [],
          statistics: {
            totalItems: 0,
            components: 0,
            holes: 0,
            keepouts: 0,
            layers: 0,
            fileSize: 0,
            exportDuration: 0
          },
          issues: [{
            type: 'error',
            code: 'BATCH_EXPORT_ERROR',
            message: `批量导出失败 (${design.name}): ${error.message}`
          }]
        });
      }
    }
    
    return {
      success: failed === 0,
      results,
      summary: {
        total: designs.length,
        successful,
        failed,
        totalSize
      }
    };
  }
  
  /**
   * 导出到指定文件路径
   * 
   * @param data - 导出源数据
   * @param filePath - 完整文件路径
   * @returns Node.js导出结果
   */
  async exportToPath(
    data: ExtendedExportSourceData,
    filePath: string
  ): Promise<NodeExportResult> {
    const dir = dirname(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'export.idx';
    
    return this.exportToFile(data, {
      outputDirectory: dir,
      createDirectory: true,
      overwrite: true,
      filePrefix: '',
      fileSuffix: ''
    });
  }
  
  /**
   * 获取导出器配置
   */
  getExporterConfig(): IDXExportConfig {
    return this.exporter['config']; // 访问私有配置
  }
  
  /**
   * 获取注释配置
   */
  getCommentConfig(): XMLCommentConfig {
    return this.exporter.getCommentConfig();
  }
  
  /**
   * 设置注释配置
   */
  setCommentConfig(config: XMLCommentConfig): void {
    this.exporter.setCommentConfig(config);
  }
  
  /**
   * 启用或禁用注释
   */
  setCommentsEnabled(enabled: boolean): void {
    this.exporter.setCommentsEnabled(enabled);
  }
  
  /**
   * 生成文件名
   */
  private generateFileName(baseName: string, options: FileWriterOptions): string {
    const prefix = options.filePrefix || '';
    const suffix = options.fileSuffix || '';
    
    // 移除原有扩展名
    const nameWithoutExt = baseName.replace(/\.idx$/, '');
    
    return `${prefix}${nameWithoutExt}${suffix}.idx`;
  }
  
  /**
   * 获取设计名称
   */
  private getDesignName(): string {
    const config = this.getExporterConfig();
    return config.output.designName;
  }
  
  /**
   * 创建输出目录
   */
  static createOutputDirectory(path: string): boolean {
    try {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error(`创建目录失败: ${path}`, error);
      return false;
    }
  }
  
  /**
   * 检查文件是否存在
   */
  static fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }
  
  /**
   * 生成唯一文件名（避免冲突）
   */
  static generateUniqueFileName(basePath: string, baseName: string): string {
    let counter = 1;
    let fileName = baseName;
    
    while (existsSync(join(basePath, fileName))) {
      const nameWithoutExt = baseName.replace(/\.idx$/, '');
      fileName = `${nameWithoutExt}_${counter}.idx`;
      counter++;
    }
    
    return fileName;
  }
}

/**
 * 便捷的导出函数
 * 
 * @param data - 导出源数据
 * @param filePath - 文件路径
 * @param config - 导出配置
 * @param commentConfig - 注释配置
 * @returns 导出结果
 */
export async function exportToFile(
  data: ExtendedExportSourceData,
  filePath: string,
  config: Partial<IDXExportConfig> = {},
  commentConfig: XMLCommentConfig = {}
): Promise<NodeExportResult> {
  const fileWriter = new IDXFileWriter(config, commentConfig);
  return fileWriter.exportToPath(data, filePath);
}

/**
 * 便捷的批量导出函数
 * 
 * @param designs - 设计数据数组
 * @param outputDir - 输出目录
 * @param config - 导出配置
 * @param commentConfig - 注释配置
 * @returns 批量导出结果
 */
export async function exportBatch(
  designs: Array<{ name: string; data: ExtendedExportSourceData }>,
  outputDir: string = './output',
  config: Partial<IDXExportConfig> = {},
  commentConfig: XMLCommentConfig = {}
): Promise<{
  success: boolean;
  results: NodeExportResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
  };
}> {
  const fileWriter = new IDXFileWriter(config, commentConfig);
  return fileWriter.exportBatch(designs, { outputDirectory: outputDir });
}