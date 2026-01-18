// ============= IDX导出器类型系统入口 =============
// NOTE: 此文件导出所有类型定义，包括核心IDX类型和数据模型

// 导出核心IDX协议类型
export * from './core';

// 导出数据模型类型（作为主要定义）
export * from './export/exporter';

// 导出构建器类型，处理重名冲突
export * from './export/builder/via-builder';

// 从component-builder导出，排除重名的ComponentData（使用data-models版本）
export {
  ComponentGeometryType,
  ComponentLayer,
  ComponentElectricalProperties,
  ComponentThermalProperties,
  Component3DModel,
  ComponentPin,
  ProcessedComponentData,
  ComponentGeometryData
} from './export/builder/component-builder';

// 从layer-builder导出，排除重名的LayerData和LayerType（使用data-models版本）
export {
  LayerGeometryType,
  LayerStackupInput,
  ProcessedLayerData,
  ProcessedLayerStackupData,
  ProcessedLayerStackupEntry,
  LayerCategory
} from './export/builder/layer-builder';

// 从keepout-builder导出，重命名ShapeType以避免与core/geometry.ts冲突
export {
  KeepoutGeometryType,
  KeeninGeometryType,
  ConstraintType,
  ShapeType as BuilderShapeType,
  KeepoutData as BuilderKeepoutData,
  KeepoutShape,
  ProcessedKeepoutData,
  ProcessedKeepoutShape,
  KeepoutGeometryData
} from './export/builder/keepout-builder';

// 从board-builder导出，重命名GeometryData以避免与data-models冲突
export {
  ZAxisReference,
  BoardGeometryType,
  BoardData,
  ProcessedBoardData,
  GeometryData as BoardGeometryData,
  CircleInfo,
  BoardBuilderConfig,
  BoardBuilderContext
} from './export/builder/board-builder';