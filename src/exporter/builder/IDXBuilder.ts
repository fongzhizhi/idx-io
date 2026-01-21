import { EDMDDataSet } from '../../types/core';
import { ECADData } from '../../types/ecad/ecad.interface';
import { IDXBuildConfig } from '../../types/exporter/builder/idx-builder.interface';
import { DefaultIDXWriteConfig } from '../writer/config/idx-writer.config';
import { DefaultIDXBuildConfig } from './config/idx-builder.config';

/**
 * IDX 模型构建器
 * @description 负责将 ECAD 数据组装构建为完整的 EDMDDataSet 数据
 */
export class IDXBuilder {
	// ============= 状态量 =============

	// ------------ 私有变量 ------------
	/** 配置 */
	private config = DefaultIDXBuildConfig;

	// ------------ 构建状态量 ------------
	/** ECAD 数据 */
	private ecadData: ECADData | undefined;

	/** IDX 模型构建器 */
	constructor(config?: IDXBuildConfig) {
		if (config) {
			this.config = config;
		}
	}

	// ============= 构建相关 =============
	/** 构建 EDMDDataSet */
	build(ecadData: ECADData): EDMDDataSet {
		// TODO: 待实现
		this.ecadData = ecadData;

		//
	}
}
