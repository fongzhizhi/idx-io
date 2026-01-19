import { IDXWriterConfig } from './idx-writer.types';

/** IDX 格式生成器-默认配置 */
export const DefaultIDXWriterConfig: IDXWriterConfig = {
	enableComments: true,
	formatting: {
		prettyPrint: true,
	},
} as const;
