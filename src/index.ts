// ============= IDX I/O 主入口 - 浏览器版本 =============

// 导出主要类
export { IDXExporter } from './exporter/IDXExporter';

// 导出类型
export * from './types/core';
export * from './types/exporter/idx-exporter';

// 导出工具函数
export * from './utils';

// 导出构建器
export { BoardBuilder } from './exporter/builders/BoardBuilder';
export type { BoardData } from './types';

// 导出写入器（仅XML写入器，适用于浏览器环境）
export { XMLWriter } from './exporter/writers/xml-writer';
export type { XMLWriterOptions } from './exporter/writers/xml-writer';
