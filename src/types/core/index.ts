// ============= IDX协议核心类型导出入口 =============
// NOTE: 此文件导出所有核心类型，供其他模块使用

// 导出基础类型
export * from './common';

// 导出枚举类型（包含GeometryType和StandardGeometryType）
export * from './enums';

// 导出几何类型
export * from './geometry';

// 导出项目和消息类型（排除重复的几何类型）
export * from './items';
export * from './messages';

// 导出层相关类型
export * from './layers';

// 导出类型守卫函数
// 注意：消息类型判断函数已移动到 src/utils/message-utils.ts