// ============= IDX导出器主入口 =============
// DESIGN: 集中管理IDX导出功能，支持浏览器和Node.js环境
// BUSINESS: 将PCB设计数据转换为IDX格式，支持协作和制造流程

import { IDXExportConfig, ExportResult, GlobalUnit, EDMDDataSet, EDMDHeader, IDXFileType } from '../types/core';
import { 
  ComponentData, 
  HoleData, 
  KeepoutData, 
  LayerData, 
  LayerStackupData,
  ExtendedExportSourceData,
  BrowserExportResult,
  XMLCommentConfig
} from '../types/exporter/idx-exporter';
import { BoardBuilder } from './builders/BoardBuilder';
import { ComponentBuilder } from './builders/ComponentBuilder';
import { ViaBuilder } from './builders/ViaBuilder';
import { KeepoutBuilder } from './builders/KeepoutBuilder';
import { LayerBuilder } from './builders/LayerBuilder';
import { BuilderConfig, BuilderContext } from './builders/BaseBuilder';
import { XMLWriter } from './writers/xml-writer';
import { XMLWriterWithComments, XMLWriterWithCommentsOptions } from './writers/xml-writer-with-comments';
import { DatasetAssembler, BoardData, BuilderRegistry, AssemblerConfig, ComponentData as AssemblerComponentData, HoleData as AssemblerHoleData, KeepoutData as AssemblerKeepoutData, LayerData as AssemblerLayerData, LayerStackupData as AssemblerLayerStackupData } from './assemblers/dataset-assembler';

/**
 * 导出上下文实现
 * 
 * @remarks
 * DESIGN: 实现BuilderContext接口，管理导出过程中的状态和错误
 * PERFORMANCE: 使用Map优化序列号生成性能
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
 * 构建器注册表实现
 * 
 * @remarks
 * DESIGN: 实现BuilderRegistry接口，管理所有类型的构建器实例
 * BUSINESS: 支持板、组件、过孔、禁止区、层等所有IDX元素类型
 */
class BuilderRegistryImpl implements BuilderRegistry {
  private builders: Map<string, any> = new Map();
  
  constructor(private config: BuilderConfig, private context: BuilderContext) {
    // DESIGN: 注册所有构建器，支持动态扩展
    this.builders.set('board', new BoardBuilder(config, context));
    this.builders.set('component', new ComponentBuilder(config, context));
    this.builders.set('plated-hole', new ViaBuilder(config, context));
    this.builders.set('non-plated-hole', new ViaBuilder(config, context));
    this.builders.set('keepout', new KeepoutBuilder(config, context));
    this.builders.set('layer', new LayerBuilder(config, context));
  }
  
  get(type: string): any {
    return this.builders.get(type);
  }
}

/**
 * IDX导出器主类 - 浏览器版本
 * 
 * @remarks
 * DESIGN: 专为浏览器环境设计的IDX导出器，返回XML内容而非写入文件
 * BUSINESS: 支持PCB设计数据的IDX格式导出，满足协作和制造需求
 * PERFORMANCE: 支持大型设计的高效导出，包含性能监控
 * 
 * @example
 * ```typescript
 * // TEST_CASE: Basic IDX export
 * // TEST_INPUT: Valid board data with components
 * // TEST_EXPECT: Returns successful BrowserExportResult with XML content
 * const exporter = new IDXExporter();
 * const result = await exporter.export(boardData);
 * assert(result.success === true);
 * assert(result.xmlContent.includes('<?xml'));
 * ```
 */
export class IDXExporter {
  private config: IDXExportConfig;
  private xmlWriter: XMLWriter | XMLWriterWithComments;
  private commentConfig: XMLCommentConfig;
  
  constructor(config: Partial<IDXExportConfig> = {}, commentConfig: XMLCommentConfig = {}) {
    this.config = this.mergeConfig(config);
    this.commentConfig = this.mergeCommentConfig(commentConfig);
    
    // DESIGN: 根据注释配置选择XML写入器
    if (this.commentConfig.enabled) {
      const writerOptions: XMLWriterWithCommentsOptions = {
        prettyPrint: true,
        encoding: 'UTF-8',
        enableComments: this.commentConfig.enabled,
        includeFileHeader: this.commentConfig.includeFileHeader,
        includeItemComments: this.commentConfig.includeItemComments,
        includeGeometryComments: this.commentConfig.includeGeometryComments,
        includeSectionComments: this.commentConfig.includeSectionComments
      };
      this.xmlWriter = new XMLWriterWithComments(writerOptions);
    } else {
      this.xmlWriter = new XMLWriter({
        prettyPrint: true,
        encoding: 'UTF-8'
      });
    }
  }
  
  /**
   * 主要导出方法 - 返回XML内容而不是写入文件
   * 
   * @param data - 导出源数据，使用ExtendedExportSourceData格式
   * @returns 浏览器导出结果，包含XML内容和统计信息
   * 
   * @remarks
   * BUSINESS: 支持完整的PCB设计数据导出，包括组件、孔、禁止区等
   * PERFORMANCE: 包含详细的性能统计信息
   * 
   * @example
   * ```typescript
   * // TEST_CASE: Export with board data
   * // TEST_INPUT: ExtendedExportSourceData format
   * // TEST_EXPECT: Successfully exports with full feature support
   * const boardData: ExtendedExportSourceData = {
   *   board: { id: 'PCB001', name: 'Main Board', outline: {...} },
   *   components: [...],
   *   holes: [...],
   *   keepouts: [...]
   * };
   * const result = await exporter.export(boardData);
   * assert(result.success === true);
   * ```
   */
  async export(data: ExtendedExportSourceData): Promise<BrowserExportResult> {
    const context = new ExportContextImpl();
    const startTime = Date.now();
    
    try {
      // ============= 数据集构建阶段 =============
      const dataset = await this.buildDataset(data, context);
      
      // ============= XML序列化阶段 =============
      // PERFORMANCE: 大型设计可能产生MB级XML，需要优化内存使用
      const xmlContent = this.xmlWriter.serialize(dataset);
      
      // ============= 结果生成阶段 =============
      const fileName = this.generateFileName(IDXFileType.BASELINE);
      
      const exportDuration = Date.now() - startTime;
      const xmlSize = new Blob([xmlContent]).size;
      
      return {
        success: true,
        xmlContent,
        fileName,
        files: [{
          type: IDXFileType.BASELINE,
          name: fileName,
          path: '', // DESIGN: 浏览器环境下无实际路径
          timestamp: new Date().toISOString(),
          designName: this.config.output.designName,
          sequence: 1
        }],
        statistics: {
          totalItems: dataset.Body.Items.length,
          components: this.countItemsByGeometryType(dataset, 'COMPONENT'),
          holes: this.countItemsByGeometryType(dataset, 'HOLE_PLATED') + 
                 this.countItemsByGeometryType(dataset, 'HOLE_NON_PLATED') + 
                 this.countItemsByGeometryType(dataset, 'FILLED_VIA'),
          keepouts: this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_ROUTE') + 
                   this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_COMPONENT') + 
                   this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_VIA') + 
                   this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_TESTPOINT') + 
                   this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_THERMAL') + 
                   this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA_OTHER'),
          layers: this.countItemsByGeometryType(dataset, 'LAYER'),
          fileSize: xmlSize,
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
  
  /**
   * 生成下载用的Blob对象
   * 
   * @param xmlContent - XML内容字符串
   * @returns Blob对象，用于浏览器下载
   * 
   * @remarks
   * DESIGN: 设置正确的MIME类型，确保浏览器正确处理
   */
  createDownloadBlob(xmlContent: string): Blob {
    return new Blob([xmlContent], { 
      type: 'application/xml;charset=utf-8' 
    });
  }
  
  /**
   * 生成下载链接
   * 
   * @param xmlContent - XML内容字符串
   * @returns 下载URL，需要在使用后调用URL.revokeObjectURL释放
   * 
   * @remarks
   * PERFORMANCE: 记得释放URL对象，避免内存泄漏
   */
  createDownloadUrl(xmlContent: string): string {
    const blob = this.createDownloadBlob(xmlContent);
    return URL.createObjectURL(blob);
  }
  
  /**
   * 设置注释配置
   * 
   * @param commentConfig - 新的注释配置
   * 
   * @remarks
   * DESIGN: 动态更新XML写入器，支持运行时配置变更
   */
  setCommentConfig(commentConfig: XMLCommentConfig): void {
    this.commentConfig = this.mergeCommentConfig(commentConfig);
    
    // DESIGN: 重新创建XML写入器以应用新配置
    if (this.commentConfig.enabled) {
      const writerOptions: XMLWriterWithCommentsOptions = {
        prettyPrint: true,
        encoding: 'UTF-8',
        enableComments: this.commentConfig.enabled,
        includeFileHeader: this.commentConfig.includeFileHeader,
        includeItemComments: this.commentConfig.includeItemComments,
        includeGeometryComments: this.commentConfig.includeGeometryComments,
        includeSectionComments: this.commentConfig.includeSectionComments
      };
      this.xmlWriter = new XMLWriterWithComments(writerOptions);
    } else {
      this.xmlWriter = new XMLWriter({
        prettyPrint: true,
        encoding: 'UTF-8'
      });
    }
  }
  
  /**
   * 获取当前注释配置
   * 
   * @returns 当前注释配置的副本
   */
  getCommentConfig(): XMLCommentConfig {
    return { ...this.commentConfig };
  }
  
  /**
   * 启用或禁用注释
   * 
   * @param enabled - 是否启用注释
   */
  setCommentsEnabled(enabled: boolean): void {
    this.setCommentConfig({ ...this.commentConfig, enabled });
  }
  
  /**
   * 生成文件名
   * 
   * @param fileType - IDX文件类型
   * @returns 包含时间戳的文件名
   * 
   * @remarks
   * DESIGN: 使用ISO时间戳确保文件名唯一性
   */
  private generateFileName(fileType: IDXFileType): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
    
    return `${this.config.output.designName}_${fileType}_${timestamp}.idx`;
  }
  
  /**
   * 按几何类型统计项目数量
   * 
   * @param dataset - IDX数据集
   * @param geometryTypePrefix - 几何类型前缀
   * @returns 匹配的项目数量
   */
  private countItemsByGeometryType(dataset: EDMDDataSet, geometryTypePrefix: string): number {
    return dataset.Body.Items.filter(item => 
      item.geometryType && item.geometryType.startsWith(geometryTypePrefix)
    ).length;
  }
  
  /**
   * 转换组件数据为DatasetAssembler格式
   * 
   * @param components - 新格式组件数据
   * @returns DatasetAssembler格式组件数据
   */
  private convertToAssemblerComponents(components?: ComponentData[]): AssemblerComponentData[] | undefined {
    if (!components) return undefined;
    
    return components.map(comp => ({
      refDes: comp.refDes,
      partNumber: comp.partNumber,
      packageName: comp.packageName,
      position: {
        x: comp.position.x,
        y: comp.position.y,
        z: comp.position.z,
        rotation: comp.position.rotation
      },
      dimensions: comp.dimensions,
      layer: comp.layer,
      isMechanical: comp.isMechanical,
      electrical: comp.electrical,
      thermal: comp.thermal,
      model3D: comp.model3D,
      pins: comp.pins,
      properties: comp.properties
    }));
  }
  
  /**
   * 转换孔数据为DatasetAssembler格式
   * 
   * @param holes - 新格式孔数据
   * @returns DatasetAssembler格式孔数据
   */
  private convertToAssemblerHoles(holes?: HoleData[]): AssemblerHoleData[] | undefined {
    if (!holes) return undefined;
    
    return holes.map(hole => ({
      id: hole.id,
      name: hole.id,
      position: hole.position,
      diameter: hole.diameter,
      viaType: this.mapToAssemblerViaType(hole.type, hole.viaType),
      startLayer: hole.startLayer || 'L1',
      endLayer: hole.endLayer || 'L4',
      padDiameter: hole.padDiameter,
      antiPadDiameter: hole.antiPadDiameter,
      netName: hole.netName,
      properties: hole.properties
    }));
  }
  
  /**
   * 映射孔类型到DatasetAssembler格式
   */
  private mapToAssemblerViaType(type: 'plated' | 'non-plated', viaType?: string): 'plated' | 'non-plated' | 'filled' | 'micro' {
    if (viaType) {
      switch (viaType) {
        case 'through': return 'plated';
        case 'blind': return 'plated';
        case 'buried': return 'plated';
        case 'micro': return 'micro';
        default: return type;
      }
    }
    return type;
  }
  
  /**
   * 转换禁止区数据为DatasetAssembler格式
   * 
   * @param keepouts - 新格式禁止区数据
   * @returns DatasetAssembler格式禁止区数据
   */
  private convertToAssemblerKeepouts(keepouts?: KeepoutData[]): AssemblerKeepoutData[] | undefined {
    if (!keepouts) return undefined;
    
    return keepouts.map(keepout => ({
      id: keepout.id,
      name: keepout.id,
      constraintType: this.mapToAssemblerConstraintType(keepout.type),
      purpose: keepout.purpose || 'other',
      shape: {
        type: keepout.geometry.type,
        points: keepout.geometry.points || [],
        radius: keepout.geometry.radius
      },
      height: keepout.height ? {
        min: keepout.height.min,
        max: keepout.height.max === 'infinity' ? 'infinity' : keepout.height.max
      } : undefined,
      layer: keepout.layers[0] || 'ALL',
      enabled: keepout.enabled !== false,
      properties: keepout.properties
    }));
  }
  
  /**
   * 映射禁止区类型到DatasetAssembler格式
   */
  private mapToAssemblerConstraintType(type: string): 'route' | 'component' | 'via' | 'testpoint' | 'thermal' | 'other' {
    switch (type) {
      case 'trace': return 'route';
      case 'component': return 'component';
      case 'via': return 'via';
      case 'testpoint': return 'testpoint';
      case 'thermal': return 'thermal';
      default: return 'other';
    }
  }
  
  /**
   * 转换层数据为DatasetAssembler格式
   * 
   * @param layers - 新格式层数据
   * @returns DatasetAssembler格式层数据
   */
  private convertToAssemblerLayers(layers?: LayerData[]): AssemblerLayerData[] | undefined {
    if (!layers) return undefined;
    
    return layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      thickness: layer.thickness,
      material: layer.material,
      copperWeight: layer.copperWeight,
      dielectricConstant: layer.dielectricConstant,
      properties: layer.properties
    }));
  }
  
  /**
   * 转换层叠结构数据为DatasetAssembler格式
   * 
   * @param layerStackup - 新格式层叠结构数据
   * @returns DatasetAssembler格式层叠结构数据
   */
  private convertToAssemblerLayerStackup(layerStackup?: LayerStackupData): AssemblerLayerStackupData | undefined {
    if (!layerStackup) return undefined;
    
    return {
      id: layerStackup.id,
      name: layerStackup.name,
      totalThickness: layerStackup.totalThickness,
      layers: layerStackup.layers.map(layer => ({
        layerId: layer.layerId,
        position: layer.position,
        thickness: layer.thickness
      }))
    };
  }
  
  /**
   * 构建IDX数据集
   * 
   * @param data - 导出源数据
   * @param context - 导出上下文
   * @returns IDX数据集
   * 
   * @remarks
   * BUSINESS: 直接使用ExtendedExportSourceData格式，提供完整的数据支持
   * DESIGN: 使用组装器模式，支持不同类型的数据集构建
   */
  private async buildDataset(data: ExtendedExportSourceData, context: ExportContextImpl): Promise<EDMDDataSet> {
    // DESIGN: 直接使用ExtendedExportSourceData格式
    const normalizedData = data;
    
    const builderConfig: BuilderConfig = {
      useSimplified: this.config.geometry.useSimplified,
      defaultUnit: this.config.geometry.defaultUnit,
      creatorSystem: this.config.collaboration.creatorSystem,
      precision: this.config.geometry.precision
    };
    
    // DESIGN: 创建构建器注册表，支持所有IDX元素类型
    const builderRegistry = new BuilderRegistryImpl(builderConfig, context);
    
    // DESIGN: 创建组装器配置
    const assemblerConfig: AssemblerConfig = {
      useSimplified: this.config.geometry.useSimplified,
      includeLayerStackup: this.config.collaboration.includeLayerStackup
    };
    
    // DESIGN: 创建数据集组装器
    const assembler = new DatasetAssembler(builderRegistry, assemblerConfig);
    
    // ============= 头部构建 =============
    const header: EDMDHeader = {
      CreatorSystem: this.config.collaboration.creatorSystem,
      CreatorCompany: this.config.collaboration.creatorCompany,
      GlobalUnitLength: this.config.geometry.defaultUnit,
      CreationDateTime: new Date().toISOString(),
      ModifiedDateTime: new Date().toISOString()
    };
    
    // ============= 数据合并 =============
    // DESIGN: 使用简化的数据结构，所有数据都在board中
    const enrichedBoardData: BoardData = {
      ...normalizedData.board,
      components: this.convertToAssemblerComponents(normalizedData.board.components),
      holes: this.convertToAssemblerHoles(normalizedData.board.holes),
      keepouts: this.convertToAssemblerKeepouts(normalizedData.board.keepouts),
      layers: this.convertToAssemblerLayers(normalizedData.board.layers),
      layerStackup: this.convertToAssemblerLayerStackup(normalizedData.board.layerStackup)
    };
    
    // ============= 主体构建 =============
    const body = await assembler.assembleBaselineBody(enrichedBoardData);
    
    // ============= 数据集构建 =============
    const dataset: EDMDDataSet = {
      Header: header,
      Body: body,
      ProcessInstruction: {
        id: 'INSTRUCTION_001',
        instructionType: 'SendInformation',
        Actor: this.config.collaboration.creatorSystem,
        Description: 'Initial board baseline'
      } as any
    };
    
    return dataset;
  }

  
  /**
   * 合并配置选项
   * 
   * @param config - 部分配置选项
   * @returns 完整的配置对象
   * 
   * @remarks
   * DESIGN: 提供合理的默认值，确保配置的完整性
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
  
  /**
   * 合并注释配置选项
   * 
   * @param config - 部分注释配置选项
   * @returns 完整的注释配置对象
   * 
   * @remarks
   * DESIGN: 默认启用所有注释类型，提供最佳的可读性
   */
  private mergeCommentConfig(config: XMLCommentConfig): XMLCommentConfig {
    return {
      enabled: config.enabled ?? true,
      includeFileHeader: config.includeFileHeader ?? true,
      includeItemComments: config.includeItemComments ?? true,
      includeGeometryComments: config.includeGeometryComments ?? true,
      includeSectionComments: config.includeSectionComments ?? true
    };
  }
}

// ============= 导出类型和接口 =============

// DESIGN: 导出核心类型，保持API的一致性
export { GlobalUnit } from '../types/core';
export type { IDXExportConfig, ExportResult } from '../types/core';

// DESIGN: 导出新的数据模型类型
export type { 
  ComponentData,
  HoleData,
  KeepoutData,
  LayerData,
  LayerStackupData,
  ExtendedExportSourceData,
  ExtendedBoardData,
  Position3D,
  Dimensions3D,
  PinData,
  GeometryData,
  LayerType,
  LayerStackupEntry,
  BrowserExportResult,
  XMLCommentConfig
} from '../types/exporter/idx-exporter';
