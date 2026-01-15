// ============= 文件写入器 =============
// DESIGN: 负责将XML字符串写入文件系统
// NOTE: 支持文件路径验证、目录创建、命名模式等功能

import * as fs from 'fs';
import * as path from 'path';
import { IDXFileMetadata, IDXFileType } from '../../types/core';

/**
 * 文件写入器配置选项
 */
export interface FileWriterOptions {
  /** 输出目录 */
  outputDirectory: string;
  
  /** 设计名称 */
  designName: string;
  
  /** 文件命名模式 */
  namingPattern?: string;
  
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  
  /** 文件编码 */
  encoding?: BufferEncoding;
  
  /** 是否创建目录 */
  createDirectory?: boolean;
}

/**
 * 文件写入结果
 */
export interface FileWriteResult {
  /** 写入的文件路径 */
  filePath: string;
  
  /** 文件大小（字节） */
  fileSize: number;
  
  /** 写入时间戳 */
  timestamp: string;
  
  /** 文件元数据 */
  metadata: IDXFileMetadata;
}

/**
 * 文件写入器类
 * 
 * @remarks
 * 负责将XML内容写入文件系统，支持自定义命名模式和目录管理
 * 
 * @example
 * ```typescript
 * const writer = new FileWriter({
 *   outputDirectory: './output',
 *   designName: 'MyBoard'
 * });
 * 
 * const result = await writer.writeFile(xmlContent, 'baseline');
 * console.log(`文件已写入: ${result.filePath}`);
 * ```
 */
export class FileWriter {
  private options: Required<FileWriterOptions>;
  
  constructor(options: FileWriterOptions) {
    this.options = {
      outputDirectory: options.outputDirectory,
      designName: options.designName,
      namingPattern: options.namingPattern || '{designName}_{type}.idx',
      overwrite: options.overwrite ?? true,
      encoding: options.encoding ?? 'utf8',
      createDirectory: options.createDirectory ?? true
    };
    
    // 验证配置
    this.validateOptions();
  }
  
  /**
   * 写入IDX文件
   * 
   * @param content - XML内容
   * @param fileType - 文件类型
   * @param sequence - 序列号（可选）
   * @returns 写入结果
   */
  async writeFile(
    content: string, 
    fileType: IDXFileType, 
    sequence: number = 1
  ): Promise<FileWriteResult> {
    try {
      // 生成文件路径
      const fileName = this.generateFileName(fileType, sequence);
      const filePath = path.join(this.options.outputDirectory, fileName);
      
      // 确保目录存在
      if (this.options.createDirectory) {
        await this.ensureDirectoryExists(this.options.outputDirectory);
      }
      
      // 检查文件是否已存在
      if (!this.options.overwrite && await this.fileExists(filePath)) {
        throw new FileWriteError(
          `文件已存在且不允许覆盖: ${filePath}`,
          { filePath, fileType }
        );
      }
      
      // 写入文件
      await fs.promises.writeFile(filePath, content, this.options.encoding);
      
      // 获取文件信息
      const stats = await fs.promises.stat(filePath);
      const timestamp = new Date().toISOString();
      
      // 创建文件元数据
      const metadata: IDXFileMetadata = {
        type: fileType,
        name: fileName,
        path: filePath,
        timestamp,
        designName: this.options.designName,
        sequence
      };
      
      return {
        filePath,
        fileSize: stats.size,
        timestamp,
        metadata
      };
      
    } catch (error: any) {
      if (error instanceof FileWriteError) {
        throw error;
      }
      
      throw new FileWriteError(
        `文件写入失败: ${error.message}`,
        { originalError: error, fileType }
      );
    }
  }
  
  /**
   * 批量写入多个文件
   * 
   * @param files - 文件内容数组
   * @returns 写入结果数组
   */
  async writeFiles(files: Array<{
    content: string;
    type: IDXFileType;
    sequence?: number;
  }>): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];
    
    for (const file of files) {
      const result = await this.writeFile(
        file.content, 
        file.type, 
        file.sequence
      );
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * 检查输出目录是否可写
   */
  async checkOutputDirectory(): Promise<boolean> {
    try {
      // 确保目录存在
      if (this.options.createDirectory) {
        await this.ensureDirectoryExists(this.options.outputDirectory);
      }
      
      // 检查目录是否可写
      await fs.promises.access(
        this.options.outputDirectory, 
        fs.constants.W_OK
      );
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取输出目录信息
   */
  async getOutputDirectoryInfo(): Promise<{
    exists: boolean;
    writable: boolean;
    files: string[];
  }> {
    try {
      const exists = await this.directoryExists(this.options.outputDirectory);
      
      if (!exists) {
        return { exists: false, writable: false, files: [] };
      }
      
      const writable = await this.checkOutputDirectory();
      const files = await fs.promises.readdir(this.options.outputDirectory);
      
      return { exists, writable, files };
    } catch {
      return { exists: false, writable: false, files: [] };
    }
  }
  
  /**
   * 清理输出目录中的旧文件
   * 
   * @param pattern - 文件名模式（可选）
   * @param maxAge - 最大文件年龄（毫秒，可选）
   */
  async cleanupFiles(pattern?: RegExp, maxAge?: number): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.options.outputDirectory);
      const deletedFiles: string[] = [];
      
      for (const file of files) {
        const filePath = path.join(this.options.outputDirectory, file);
        
        // 检查文件名模式
        if (pattern && !pattern.test(file)) {
          continue;
        }
        
        // 检查文件年龄
        if (maxAge) {
          const stats = await fs.promises.stat(filePath);
          const age = Date.now() - stats.mtime.getTime();
          if (age < maxAge) {
            continue;
          }
        }
        
        // 删除文件
        await fs.promises.unlink(filePath);
        deletedFiles.push(filePath);
      }
      
      return deletedFiles;
    } catch (error: any) {
      throw new FileWriteError(
        `清理文件失败: ${error.message}`,
        { originalError: error }
      );
    }
  }
  
  /**
   * 生成文件名
   */
  private generateFileName(fileType: IDXFileType, sequence: number): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
    
    let fileName = this.options.namingPattern
      .replace('{designName}', this.options.designName)
      .replace('{type}', fileType)
      .replace('{sequence}', sequence.toString().padStart(3, '0'))
      .replace('{timestamp}', timestamp);
    
    // 确保文件扩展名正确
    if (!fileName.endsWith('.idx') && !fileName.endsWith('.idz')) {
      fileName += '.idx';
    }
    
    return fileName;
  }
  
  /**
   * 验证配置选项
   */
  private validateOptions(): void {
    if (!this.options.outputDirectory) {
      throw new FileWriteError('输出目录不能为空');
    }
    
    if (!this.options.designName) {
      throw new FileWriteError('设计名称不能为空');
    }
    
    if (!this.options.namingPattern) {
      throw new FileWriteError('文件命名模式不能为空');
    }
    
    // 验证命名模式包含必要的占位符
    if (!this.options.namingPattern.includes('{designName}')) {
      throw new FileWriteError('文件命名模式必须包含 {designName} 占位符');
    }
  }
  
  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // 目录不存在，创建它
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
  
  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 检查目录是否存在
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}

/**
 * 文件写入错误
 */
export class FileWriteError extends Error {
  constructor(
    message: string,
    public context?: { 
      originalError?: Error; 
      filePath?: string; 
      fileType?: IDXFileType;
    }
  ) {
    super(message);
    this.name = 'FileWriteError';
  }
}