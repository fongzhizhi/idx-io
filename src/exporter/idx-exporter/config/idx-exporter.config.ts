import { IDXExportConfig } from '../../../types/exporter/idx-exporter/idx-exporter.interface';

/** IDX 模型导出-默认配置 */
export const DefaultIDXExportConfig: IDXExportConfig = {
	output: {
		designName: '',
	},
	collaboration: {
		creatorSystem: 'ECAD',
		creatorCompany: 'Company Name',
	},
	validation: {
		enabled: true,
	},
};
