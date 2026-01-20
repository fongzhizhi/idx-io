import { GlobalUnit } from '../../core/base.types';

/** IDX 模型构建配置 */
export interface IDXBuildConfig {
	/** 是否使用简化表示法(geometryType) */
	useSimplified: boolean;
	/** 全局单位 */
	unit: GlobalUnit;
	/** 几何精度(小数位数) */
	precision: number;
}
