/** IDX 格式生成器-配置 */
export type IDXWriterConfig = Partial<{
	/**
	 * 自定义命名空间表(非官方规范命名空间)
	 * @example {'foundation': 'http://www.prostep.org/EDMD/Foundation'}
	 */
	namespaces: Record<string, string>;
	/** 是否启用注释 */
	enableComments: boolean;
	/** 格式化配置 */
	formatting: IDXWriterFormatting;
}>;

/** IDX 格式生成器-格式化配置 */
export type IDXWriterFormatting = Partial<{
	/** 美化输出 */
	prettyPrint: boolean;
}>;
