import { GlobalUnit } from '../../edmd/base.types';

/** IDX 模型构建配置 */
export interface IDXBuildConfig {
	/** 是否使用简化模型 */
	useSimplified: boolean;
	/** 全局单位 */
	unit: GlobalUnit;
	/** 几何精度(小数位数) */
	precision: number;
	/** 是否包含非协作数据 */
	includeNonCollaborative: boolean;
	/** 是否生成历史记录 */
	includeHistory: boolean;
	/** 系统范围标识符 */
	systemScope: string;
}
