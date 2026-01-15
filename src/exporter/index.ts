// ============= IDX导出器主入口 =============

import { IDXExportConfig, ExportResult, GlobalUnit, EDMDDataSet, EDMDHeader, IDXFileType } from '../types/core';
import { 
  ComponentData as NewComponentData, 
  HoleData as NewHoleData, 
  KeepoutData as NewKeepoutData, 
  LayerData as NewLayerData, 
  LayerStackupData as NewLayerStackupData,
  ExtendedExportSourceData
} from '../types/data-models';
import { BoardBuilder } from './builders/board-builder';
import { ComponentBuilder } from './builders/component-builder';
import { ViaBuilder } from './builders/via-builder';
import { KeepoutBuilder } from './builders/keepout-builder';
import { LayerBuilder } from './builders/layer-builder';
import { BuilderConfig, BuilderContext } from './builders/base-builder';
import { XMLWriter } from './writers/xml-writer';
import { DatasetAssembler, BoardData, BuilderRegistry, AssemblerConfig } from './assemblers/dataset-assembler';

/**
 * 组件数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 ComponentData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface ComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: {
    x: number;
    y: number;
    z?: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  layer: string;
  isMechanical?: boolean;
  electrical?: any;
  thermal?: any;
  model3D?: any;
  pins?: any[];
  properties?: Record<string, any>;
}

/**
 * 孔数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 HoleData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface HoleData {
  id: string;
  name?: string;
  position: { x: number; y: number };
  diameter: number;
  viaType: 'plated' | 'non-plated' | 'filled' | 'micro';
  startLayer: string;
  endLayer: string;
  padDiameter?: number;
  antiPadDiameter?: number;
  netName?: string;
  properties?: Record<string, any>;
}

/**
 * 禁止区数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 KeepoutData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface KeepoutData {
  id: string;
  name?: string;
  constraintType: 'route' | 'component' | 'via' | 'testpoint' | 'thermal' | 'other';
  purpose: any;
  shape: {
    type: 'rectangle' | 'circle' | 'polygon';
    points: Array<{ x: number; y: number }>;
    radius?: number;
  };
  height?: {
    min: number;
    max: number | 'infinity';
  };
  layer: string;
  enabled?: boolean;
  properties?: Record<string, any>;
}

/**
 * 层数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 LayerData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface LayerData {
  id: string;
  name: string;
  type: 'SIGNAL' | 'PLANE' | 'SOLDERMASK' | 'SILKSCREEN' | 'DIELECTRIC' | 'OTHERSIGNAL';
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  properties?: Record<string, any>;
}

/**
 * 层叠结构数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 LayerStackupData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface LayerStackupData {
  id: string;
  name: string;
  totalThickness?: number;
  layers: Array<{
    layerId: string;
    position: number;
    thickness: number;
  }>;
}

/**
 * 导出源数据接口
 * @deprecated 使用 ../types/data-models.ts 中的 ExtendedExportSourceData 接口
 * @remarks 保留此接口以维持向后兼容性
 */
export interface ExportSourceData {
  board: BoardData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
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
 * 构建器注册表实现
 */
class BuilderRegistryImpl implements BuilderRegistry {
  private builders: Map<string, any> = new Map();
  
  constructor(private config: BuilderConfig, private context: BuilderContext) {
    // 注册所有构建器
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
 * 浏览器导出结果接口
 */
export interface BrowserExportResult extends ExportResult {
  /** XML内容字符串 */
  xmlContent: string;
  /** 建议的文件名 */
  fileName: string;
}

/**
 * IDX导出器主类 - 浏览器版本
 */
export class IDXExporter {
  private config: IDXExportConfig;
  private xmlWriter: XMLWriter;
  
  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
    
    // 初始化XML写入器
    this.xmlWriter = new XMLWriter({
      prettyPrint: true,
      encoding: 'UTF-8'
    });
  }
  
  /**
   * 主要导出方法 - 返回XML内容而不是写入文件
   */
  async export(data: ExportSourceData): Promise<BrowserExportResult> {
    const context = new ExportContextImpl();
    const startTime = Date.now();
    
    try {
      // 1. 构建数据集
      const dataset = await this.buildDataset(data, context);
      
      // 2. 序列化为XML
      const xmlContent = this.xmlWriter.serialize(dataset);
      
      // 3. 生成文件名
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
          path: '', // 浏览器环境下无实际路径
          timestamp: new Date().toISOString(),
          designName: this.config.output.designName,
          sequence: 1
        }],
        statistics: {
          totalItems: dataset.Body.Items.length,
          components: this.countItemsByGeometryType(dataset, 'COMPONENT'),
          holes: this.countItemsByGeometryType(dataset, 'VIA') + this.countItemsByGeometryType(dataset, 'HOLE_NON_PLATED'),
          keepouts: this.countItemsByGeometryType(dataset, 'KEEPOUT_AREA'),
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
   */
  createDownloadBlob(xmlContent: string): Blob {
    return new Blob([xmlContent], { 
      type: 'application/xml;charset=utf-8' 
    });
  }
  
  /**
   * 生成下载链接
   */
  createDownloadUrl(xmlContent: string): string {
    const blob = this.createDownloadBlob(xmlContent);
    return URL.createObjectURL(blob);
  }
  
  /**
   * 生成文件名
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
   */
  private countItemsByGeometryType(dataset: EDMDDataSet, geometryTypePrefix: string): number {
    return dataset.Body.Items.filter(item => 
      item.geometryType && item.geometryType.startsWith(geometryTypePrefix)
    ).length;
  }
  
  private async buildDataset(data: ExportSourceData, context: ExportContextImpl): Promise<EDMDDataSet> {
    const builderConfig: BuilderConfig = {
      useSimplified: this.config.geometry.useSimplified,
      defaultUnit: this.config.geometry.defaultUnit,
      creatorSystem: this.config.collaboration.creatorSystem,
      precision: this.config.geometry.precision
    };
    
    // 创建构建器注册表
    const builderRegistry = new BuilderRegistryImpl(builderConfig, context);
    
    // 创建组装器配置
    const assemblerConfig: AssemblerConfig = {
      useSimplified: this.config.geometry.useSimplified,
      includeLayerStackup: this.config.collaboration.includeLayerStackup
    };
    
    // 创建数据集组装器
    const assembler = new DatasetAssembler(builderRegistry, assemblerConfig);
    
    // 构建头部
    const header: EDMDHeader = {
      CreatorSystem: this.config.collaboration.creatorSystem,
      CreatorCompany: this.config.collaboration.creatorCompany,
      GlobalUnitLength: this.config.geometry.defaultUnit,
      CreationDateTime: new Date().toISOString(),
      ModifiedDateTime: new Date().toISOString()
    };
    
    // 合并数据到BoardData结构中以保持向后兼容性
    const enrichedBoardData: BoardData = {
      ...data.board,
      components: data.components || data.board.components,
      holes: data.holes || data.board.holes,
      keepouts: data.keepouts || data.board.keepouts,
      layers: data.layers || data.board.layers,
      layerStackup: data.layerStackup || data.board.layerStackup
    };
    
    // 使用组装器构建Body
    const body = await assembler.assembleBaselineBody(enrichedBoardData);
    
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

// 导出类型和接口
export { GlobalUnit } from '../types/core';
export type { IDXExportConfig, ExportResult } from '../types/core';

// 导出新的数据模型类型（推荐使用）
export type { 
  ComponentData as NewComponentData,
  HoleData as NewHoleData,
  KeepoutData as NewKeepoutData,
  LayerData as NewLayerData,
  LayerStackupData as NewLayerStackupData,
  ExtendedExportSourceData,
  ExtendedBoardData,
  Position3D,
  Dimensions3D,
  PinData,
  GeometryData,
  LayerType,
  LayerStackupEntry
} from '../types/data-models';
