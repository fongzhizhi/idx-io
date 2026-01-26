/** IDX 模型构建器-ID前缀 */
export enum IDXBuilderIDPre {
	/** 层 */
	Layer = 'LAYER',
	/** 层堆叠 */
	LayerStack = 'LAYER_STACK',

	/** 坐标点 */
	Point = 'PT',
	/** 几何 */
	Geometry = 'GEO',
	/** 曲线集 */
	CurveSet = 'CS',

	/** 形状元素 */
	ShapeElement = 'SE',

	/** Third Item(传统方式) */
	ThirdItem = 'TI',
	/** 阶层(传统方式) */
	Stratum = 'TI_STRATUM',
	/** 层技术(传统方式) */
	StratumTechnology = 'TI_STRATUM_TECH',
	/** 元件(传统方式) */
	AssemblyComponent = 'TI_Component',
	/** 跨层特征(传统方式) */
	InterStratumFeature = 'TI_Feature',
	/** 禁止区域(传统方式) */
	KeepOut = 'TI_KEEPOUT',
	/** 保留区域(传统方式) */
	KeepIn = 'TI_KEEPIN',

	/** 模型 */
	Model = 'MODEL',

	/** 项目定义 */
	ItemSingle = 'IS',
	/** 项目实例 */
	ItemInstance = 'IT',
	/** 项目装配(实体) */
	ItemAssembly = 'IA',
}
