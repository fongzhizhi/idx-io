import { IDXBuildConfig } from '../builder/idx-builder.interface';
import { IDXWriteConfig } from '../writer/idx-writer.interface';

// ============= 导出配置接口 =============
/**
 * IDX 格式导出-配置
 *
 * @remarks
 * 控制IDX文件生成的各种选项
 */
export interface IDXExportConfig {
	/** 输出配置 */
	output: IDXExportOutputConfig;
	/** 协作选项 */
	collaboration: IDXExportCollaborateOptions;
	/** 验证选项 */
	validation: IDXExportValidateOptions;
	/** 模型构建配置 */
	buildConfig?: IDXBuildConfig;
	/** 格式生成配置 */
	writeConfig?: IDXWriteConfig;
}

/** IDX 格式导出-输出配置 */
export interface IDXExportOutputConfig {
	/** 设计名称（用于文件名生成） */
	designName: string;
	/** 输出目录 */
	directory?: string;
}

/** IDX 格式导出-协作选项 */
export interface IDXExportCollaborateOptions {
	/** 创建者系统名称 */
	creatorSystem: string;
	/** 创建者公司 */
	creatorCompany: string;
}

/** IDX 格式导出-输出配置 */
export interface IDXExportValidateOptions {
	/** 是否在导出时验证数据 */
	enabled: boolean;
}

// ============= 导出结果接口 =============
/**
 * IDX导出结果
 *
 * @remarks
 * 包含导出操作的结果和统计信息
 */
export interface IDXExportResult {
	/** 是否成功 */
	success: boolean;
	/** 导出的文件信息 */
	file: IDXFileMetadata;
	/** 统计信息 */
	statistics: IDXStatistics;
	/** 错误和警告 */
	issues: IDXError[];
	/** 验证结果 */
	validation?: IDXValidation;
}

/**
 * IDX文件元数据
 *
 * @remarks
 * 包含文件类型、名称和路径信息
 */
export interface IDXFileMetadata {
	/** 文件名（不包含扩展名） */
	name: string;
	/** 文件源码(与path互斥) */
	source?: string;
	/** 完整文件路径(与source互斥) */
	path?: string;
	/** 创建时间戳 */
	timestamp: string;
	/** 序列号 */
	sequence: number;
	/** 设计名称 */
	designName: string;
}

/** IDX统计信息 */
export interface IDXStatistics {
	/** 层数量 */
	layers: number;
	/** 项目总数 */
	totalItems: number;
	/** 组件数量 */
	components: number;
	/** 孔数量 */
	holes: number;
	/** 保持区域数量 */
	keepouts: number;
	/** 文件大小（字节） */
	fileSize: number;
	/** 导出耗时（毫秒） */
	exportDuration: number;
}

/** IDX错误信息 */
export interface IDXError {
	type: 'error' | 'warning' | 'info';
	code: string;
	message: string;
	itemId?: string;
}

/** IDX验证结果 */
export interface IDXValidation {
	passed: boolean;
	errors: string[];
	warnings: string[];
}
