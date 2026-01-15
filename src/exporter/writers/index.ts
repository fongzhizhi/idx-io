// ============= 写入器模块导出 =============
// DESIGN: 浏览器环境下的写入器导出
// NOTE: 仅包含XML序列化功能，适用于浏览器环境

// 导出XML写入器类
export { XMLWriter } from './xml-writer';
export { XMLWriterWithComments } from './xml-writer-with-comments';
export { CommentGenerator } from './comment-generator';

// 导出XML写入器接口和类型
export type { XMLWriterOptions } from './xml-writer';
export type { XMLWriterWithCommentsOptions } from './xml-writer-with-comments';