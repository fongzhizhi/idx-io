import { ECADData } from '../../types/ecad/ecad.interface';
import { IDXExportConfig, IDXExportResult, IDXFileMetadata, IDXStatistics } from '../../types/exporter/idx-exporter/idx-exporter.interface';
import { IDXBuilder } from '../builder/IDXBuilder';
import { IDXWriter } from '../writer/IDXWriter';
import { DefaultIDXExportConfig } from './config/idx-exporter.config';

/**
 * IDX 格式导出器
 * @description 将 ECAD 数据导出为 IDX文件或源码
 */
export class IDXExporter {
	// ============= 状态量 =============
	// ------------ 私有变量 ------------
	/** 配置 */
	readonly config = DefaultIDXExportConfig;
	/** 模型构建器 */
	private readonly builder: IDXBuilder;
	/** 格式生成器 */
	private readonly writer: IDXWriter;

	// ------------ 导出状态量 ------------

	/** IDX 格式导出器 */
	constructor(config?: Partial<IDXExportConfig>) {
		if (config) {
			this.config = {
				...DefaultIDXExportConfig,
				...config,
			};
		}
		const finalConfig = this.config;
		this.builder = new IDXBuilder(finalConfig.buildConfig);
		this.writer = new IDXWriter(finalConfig.writeConfig);
	}

	// ============= 构建相关 =============
	/** 导出 IDX 数据 */
	export(ecadData: ECADData): IDXExportResult {
		// # 构建 IDX 模型
		const dataSet = this.builder.build(ecadData);

		// # 生成 IDX 源码
		const idxSource = this.writer.serialize(dataSet);

		// # 组织导出结果
		const idxFile: IDXFileMetadata = {
			name: '',
			source: idxSource,
			timestamp: '',
			sequence: 0,
			designName: '',
		};
		const statistics: IDXStatistics = {
			layers: 0,
			totalItems: 0,
			components: 0,
			holes: 0,
			keepouts: 0,
			fileSize: 0,
			exportDuration: 0,
		};
		const exportResult: IDXExportResult = {
			success: true,
			file: idxFile,
			statistics,
			issues: [],
		};
		return exportResult;
	}
}
