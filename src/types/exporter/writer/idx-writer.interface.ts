/** IDX 格式生成配置 */
export type IDXWriteConfig = Partial<{
	/**
	 * 自定义命名空间表(非官方规范命名空间)
	 * @example {'foundation': 'http://www.prostep.org/EDMD/Foundation'}
	 */
	namespaces: Record<string, string>;
	/** 是否启用注释 */
	enableComments: boolean;
	/** 格式化配置 */
	formatting: IDXWriterFormatting;
	/** 数字格式化配置 */
	numberFormatting: IDXWriterNumberFormatting;
}>;

/** IDX 格式生成器-格式化配置 */
export type IDXWriterFormatting = Partial<{
	/** 美化输出 */
	prettyPrint: boolean;
}>;

/** IDX 格式生成器-数字格式化配置 */
export type IDXWriterNumberFormatting = Partial<{
	/** 小数位数，默认3位 */
	decimalPlaces: number;
	/** 是否移除尾随零，默认true */
	removeTrailingZeros: boolean;
}>;
