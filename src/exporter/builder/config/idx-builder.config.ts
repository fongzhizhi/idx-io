import { GlobalUnit } from '../../../types/core';
import { IDXBuildConfig } from '../../../types/exporter/builder/idx-builder.interface';

/** IDX 模型构建-默认配置 */
export const DefaultIDXBuildConfig: IDXBuildConfig = {
	useSimplified: true,
	unit: GlobalUnit.UNIT_MM,
	precision: 3,
	includeNonCollaborative: false,
	includeHistory: false,
	systemScope: '',
};
