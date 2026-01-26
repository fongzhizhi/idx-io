import { IDXWriteConfig } from '../../../types/exporter/writer/idx-writer.interface';

/** IDX 格式生成-默认配置 */
export const DefaultIDXWriteConfig: IDXWriteConfig = {
	enableComments: true,
	formatting: {
		prettyPrint: true,
	},
	numberFormatting: {
		decimalPlaces: 3,
		removeTrailingZeros: true,
	},
} as const;
