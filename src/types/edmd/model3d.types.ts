import { EDMDObject, EDMDTransformation } from "./base.types";

/**
 * 3D模型对象 (IDXv4.0+)
 *
 * @remarks
 * 用于关联外部3D CAD模型到IDX组件
 * 一个Model3D可以被多个组件引用
 * REF: Section 6.2.1.3, Page 78-79
 */
export interface EDMDModel3D extends EDMDObject {
  /** 3D模型标识符（必选） - 文件名、URL或PDM系统ID */
  ModelIdentifier: string;
  /** MCAD格式类型（必选） */
  MCADFormat: string;
  /** 模型版本/配置ID（可选） */
  ModelVersion?: string;
  /** 模型存储位置（可选） - 相对路径或URL */
  ModelLocation?: string;
  /** MCAD格式版本（可选） */
  MCADFormatVersion?: string;
  /** 对齐变换矩阵（可选） */
  Transformation?: EDMDTransformation;
  /** 变换参考（可选） - 替代Transformation，使用MCAD坐标系对齐 */
  TransformationReference?: string;
}