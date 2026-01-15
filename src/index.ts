// ============= IDX I/O 主入口 =============

// 导出主要类
export { IDXExporter } from './exporter';
export type { ExportSourceData } from './exporter';

// 导出类型
export * from './types/core';

// 导出构建器
export { BoardBuilder } from './exporter/builders/board-builder';
export type { BoardData } from './exporter/builders/board-builder';

// 导出写入器
export { XMLWriter } from './exporter/writers/xml-writer';
export { FileWriter } from './exporter/writers/file-writer';
export type { XMLWriterOptions } from './exporter/writers/xml-writer';
export type { FileWriterOptions, FileWriteResult } from './exporter/writers/file-writer';
