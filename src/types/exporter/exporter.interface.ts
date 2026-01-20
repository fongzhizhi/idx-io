import { GlobalUnit } from '../core/base.types';

// ------------ 文件相关类型 ------------
/**
 * IDX文件类型
 *
 * @remarks
 * 定义IDX文件的类型和用途
 */
export enum IDXFileType {
	BASELINE = 'baseline',
	CHANGE = 'change',
	RESPONSE = 'response',
	CLEARANCE = 'clearance',
}

/**
 * IDX文件元数据
 *
 * @remarks
 * 包含文件类型、名称和路径信息
 */
export interface IDXFileMetadata {
	/** 文件类型 */
	type: IDXFileType;
	/** 文件名（不包含扩展名） */
	name: string;
	/** 完整文件路径 */
	path: string;
	/** 创建时间戳 */
	timestamp: string;
	/** 设计名称 */
	designName: string;
	/** 序列号 */
	sequence: number;
}

/**
 * IDX文件压缩选项
 *
 * @remarks
 * IDX支持使用.idz扩展名的压缩文件
 * REF: Section 5.5.2
 */
export interface CompressionOptions {
	/** 是否启用压缩 */
	enabled: boolean;
	/** 压缩算法（默认deflate） */
	algorithm: 'deflate' | 'gzip';
	/** 压缩级别 1-9 */
	level: number;
}

// ------------ 导出配置类型 ------------
/**
 * IDX导出配置
 *
 * @remarks
 * 控制IDX文件生成的各种选项
 */
export interface IDXExportConfig {
	/** 输出文件配置 */
	output: {
		/** 输出目录 */
		directory: string;
		/** 设计名称（用于文件名生成） */
		designName: string;
		/** 是否生成压缩文件 (.idz) */
		compress: boolean;
		/** 压缩选项 */
		compression?: CompressionOptions;
		/** 文件命名模式 */
		namingPattern: string; // 例如: "{designName}_{type}_{sequence:03d}.idx"
	};

	/** 协议版本 */
	protocolVersion: '4.0' | '4.5';

	/** 几何表示方式 */
	geometry: {
		/** 是否使用简化表示法（geometryType） */
		useSimplified: boolean;
		/** 默认单位 */
		defaultUnit: GlobalUnit;
		/** 几何精度（小数位数） */
		precision: number;
	};

	/** 协作选项 */
	collaboration: {
		/** 创建者系统名称 */
		creatorSystem: string;
		/** 创建者公司 */
		creatorCompany: string;
		/** 是否包含非协作项目（如走线） */
		includeNonCollaborative: boolean;
		/** 是否包含层堆叠信息 */
		includeLayerStackup: boolean;
	};

	/** 验证选项 */
	validation: {
		/** 是否在导出时验证数据 */
		enabled: boolean;
		/** 验证严格级别 */
		strictness: 'strict' | 'normal' | 'lenient';
	};
}

// ------------ 导出结果类型 ------------
/**
 * IDX导出结果
 *
 * @remarks
 * 包含导出操作的结果和统计信息
 */
export interface ExportResult {
	/** 是否成功 */
	success: boolean;

	/** 导出的文件信息 */
	files: IDXFileMetadata[];

	/** 统计信息 */
	statistics: {
		/** 项目总数 */
		totalItems: number;
		/** 组件数量 */
		components: number;
		/** 孔数量 */
		holes: number;
		/** 保持区域数量 */
		keepouts: number;
		/** 层数量 */
		layers: number;
		/** 文件大小（字节） */
		fileSize: number;
		/** 导出耗时（毫秒） */
		exportDuration: number;
	};

	/** 错误和警告 */
	issues: Array<{
		type: 'error' | 'warning' | 'info';
		code: string;
		message: string;
		itemId?: string;
	}>;

	/** 验证结果 */
	validation?: {
		passed: boolean;
		errors: string[];
		warnings: string[];
	};
}
