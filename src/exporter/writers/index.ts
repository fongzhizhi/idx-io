// ============= 写入器模块导出 =============
// DESIGN: 写入器导出，支持浏览器和Node.js环境
// NOTE: file-writer仅在Node.js环境中可用

// 导出XML写入器类
export { XMLWriter } from './xml-writer';
export { XMLWriterWithComments } from './xml-writer-with-comments';
export { CommentGenerator } from './comment-generator';

// 导出XML写入器接口和类型
export type { XMLWriterOptions } from './xml-writer';
export type { XMLWriterWithCommentsOptions } from './xml-writer-with-comments';

// Node.js环境专用导出
// 注意：这些导出仅在Node.js环境中可用，浏览器环境会报错
export { IDXFileWriter, exportToFile, exportBatch } from './file-writer';
export type { NodeExportResult, FileWriterOptions } from './file-writer';