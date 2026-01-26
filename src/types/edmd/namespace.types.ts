/** IDX 命名空间 */
export enum IDXNameSpace {
	/**
	 * 基础数据结构命名空间
	 * 包含核心元素: EDMDDataSet, Header, Body, Item, ShapeElement 等
	 */
	Foundation = 'foundation',
	/**
	 * 产品数据管理命名空间
	 * 包含: ItemType, Identifier, Transformation, Stratum, AssemblyComponent 等
	 */
	PDM = 'pdm',
	/**
	 * 2D几何命名空间
	 * 包含: CartesianPoint, PolyLine, CurveSet2d, Arc, Circle, Ellipse 等
	 */
	D2 = 'd2',
	/**
	 * 属性定义命名空间
	 * 包含: EDMDUserSimpleProperty, EDMDLengthProperty 等
	 */
	Property = 'property',
	/**
	 * 计算与处理指令命名空间
	 * 包含: EDMDProcessInstructionSendInformation, EDMDProcessInstructionSendChanges 等
	 */
	Computational = 'computational',
	/**
	 * 管理与权限命名空间
	 * 包含: RoleOnItemInstance, User 等权限管理元素
	 */
	Administration = 'administration',
	/**
	 * XML Schema 实例命名空间
	 * 用于 XML Schema 验证，标准 XML 命名空间，非 IDX 专有
	 * 包含: type, schemaLocation 等属性
	 */
	XSI = 'xsi',
}

/**
 * IDX 命名空间 URI 映射表
 *
 * 映射每个命名空间前缀到其标准 URI。
 * 这些 URI 是固定的，由 prostep ivip 协会定义。
 */
export const IDXNameSpaceLinks: Record<IDXNameSpace, string> = {
	[IDXNameSpace.Foundation]: 'http://www.prostep.org/EDMD/Foundation',
	[IDXNameSpace.PDM]: 'http://www.prostep.org/EDMD/PDM',
	[IDXNameSpace.D2]: 'http://www.prostep.org/EDMD/2D',
	[IDXNameSpace.Property]: 'http://www.prostep.org/EDMD/Property',
	[IDXNameSpace.Computational]: 'http://www.prostep.org/EDMD/Computational',
	[IDXNameSpace.Administration]: 'http://www.prostep.org/EDMD/Administration',
	[IDXNameSpace.XSI]: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

/**
 * IDX-Foundation-命名空间标签枚举
 * 包含核心数据结构元素，位于 foundation 命名空间
 */
export enum IDXFoundationTag {
	/** 数据集根元素，包含 Header、Body 和 ProcessInstruction 三个主要部分 */
	EDMDDataSet = 'EDMDDataSet',
	/** 头部信息，包含创建者、时间戳、单位等元数据 */
	Header = 'Header',
	/** EDMD 头标识 */
	EDMDHeader = 'EDMDHeader',
	/** 数据体，包含所有几何元素、项目和形状定义 */
	Body = 'Body',
	/** EDMD 数据体标识 */
	EDMDDataSetBody = 'EDMDDataSetBody',
	/** 设计指令, 定义文件的类型和意图 */
	ProcessInstruction = 'ProcessInstruction',
	/** 设计项目元素，表示 PCB 上的各种组件（板、元件、孔等） */
	Item = 'Item',
	/** 形状元素，定义项目的几何形状 */
	ShapeElement = 'ShapeElement',
	/** 曲线集合，定义 2D 或 2.5D 几何形状 */
	InterStratumFeature = 'InterStratumFeature',
	/** 2D 曲线集合，定义 2.5D 几何的 Z 轴范围 */
	CurveSet2d = 'CurveSet2d',
	/** 2D 笛卡尔坐标点 */
	CartesianPoint = 'CartesianPoint',
	/** 名称元素，用于标识各种对象 */
	Name = 'Name',
	/** 描述元素，提供对象的文本描述 */
	Description = 'Description',
	/** 系统作用域，定义对象的唯一命名空间 */
	SystemScope = 'SystemScope',
	/** 对象名称，在系统作用域内的唯一标识 */
	ObjectName = 'ObjectName',
	/** 全局长度单位设置 */
	GlobalUnitLength = 'GlobalUnitLength',
	/** 创建日期时间 */
	CreationDateTime = 'CreationDateTime',
	/** 修改日期时间 */
	ModifiedDateTime = 'ModifiedDateTime',
	/** 创建者姓名 */
	CreatorName = 'CreatorName',
	/** 创建者公司 */
	CreatorCompany = 'CreatorCompany',
	/** 创建者系统 */
	CreatorSystem = 'CreatorSystem',
	/** 后处理器信息 */
	PostProcessor = 'PostProcessor',
	/** 后处理器版本 */
	PostProcessorVersion = 'PostProcessorVersion',
	/** 创建者 */
	Creator = 'Creator',
	/** 标识符编号 */
	Number = 'Number',
	/** 版本号，通常从1开始 */
	Version = 'Version',
	/** 修订号 */
	Revision = 'Revision',
	/** 序列号，每次变更递增 */
	Sequence = 'Sequence',
	/** 层 */
	Stratum = 'Stratum',
	/** 装配组件 */
	AssemblyComponent = 'AssemblyComponent',
	/** 禁布区 */
	KeepOut = 'KeepOut',
	/** 保留区 */
	KeepIn = 'KeepIn',
	/** 层技术 */
	StratumTechnology = 'StratumTechnology',
	/** 功能性项目形状 */
	FunctionalItemShape = 'FunctionalItemShape',
	/** 3D模型 */
	Model3D = 'Model3D',
}

/**
 * IDX-PDM-命名空间标签枚举
 * 包含产品数据管理元素，位于 pdm 命名空间
 */
export enum IDXPDMTag {
	/** 项目引用(注意命名空间, 不是 IDXFoundationTag 的 Item) */
	Item = 'Item',
	/** 项目类型，可以是 "assembly" 或 "single" */
	ItemType = 'ItemType',
	/** 唯一标识符，包含系统作用域、编号、版本、修订和序列号 */
	Identifier = 'Identifier',
	/** 编号，标识符的一部分 */
	Number = 'Number',
	/** 版本号，标识符的一部分 */
	Version = 'Version',
	/** 修订号，标识符的一部分 */
	Revision = 'Revision',
	/** 序列号，标识符的一部分，用于变更追踪 */
	Sequence = 'Sequence',
	/** 项目实例，表示项目中一个具体实例 */
	ItemInstance = 'ItemInstance',
	/** 实例名称 */
	InstanceName = 'InstanceName',
	/** 包名称，用于组件封装标识 */
	PackageName = 'PackageName',
	/** 形状引用，指向形状元素 */
	Shape = 'Shape',
	/** 变换矩阵，定义位置、旋转和缩放 */
	Transformation = 'Transformation',
	/** 变换类型，可以是 "d2" 或 "d3" */
	TransformationType = 'TransformationType',
	/** 基线标记，表示该项目是否属于基线 */
	BaseLine = 'BaseLine',
	/** 装配到名称，用于定义项目相对于层或表面的位置 */
	AssembleToName = 'AssembleToName',
	/** 参考名称，用于其他项目引用 */
	ReferenceName = 'ReferenceName',
	/** 层定义，表示 PCB 层 */
	Stratum = 'Stratum',
	/** 层类型，如 DesignLayerStratum */
	StratumType = 'StratumType',
	/** 层表面指定，如 PrimarySurface */
	StratumSurfaceDesignation = 'StratumSurfaceDesignation',
	/** 层技术定义 */
	StratumTechnology = 'StratumTechnology',
	/** 技术类型，如 Design 或 Documentation */
	TechnologyType = 'TechnologyType',
	/** 层用途，如 OtherSignal、SolderMask、SilkScreen 等 */
	LayerPurpose = 'LayerPurpose',
	/** 形状描述类型，如 GeometricModel */
	ShapeDescriptionType = 'ShapeDescriptionType',
	/** 形状元素类型，如 FeatureShapeElement、PartMountingFeature 等 */
	ShapeElementType = 'ShapeElementType',
	/** 装配组件，表示 PCB 上的组件 */
	ShapeElement = 'ShapeElement',
	/** 定义形状，指向曲线集合 */
	DefiningShape = 'DefiningShape',
	/** 组件类型，如 Board、Component 等 */
	AssemblyComponentType = 'AssemblyComponentType',
	/** 跨层特征，定义跨多个层的几何形状 */
	InterStratumFeatureType = 'InterStratumFeatureType',
	/** 模型标识 */
	ModelIdentifier = 'ModelIdentifier',
	/** 目的，用于 KeepOut 和 KeepIn 定义 */
	Purpose = 'Purpose',
	/** 功能区类型 */
	FunctionalItemShapeType = 'FunctionalItemShapeType',
	/** MCAD格式 */
	MCADFormat = 'MCADFormat',
	/** MCAD格式版本 */
	ModelVersion = 'ModelVersion',
	/** 模型位置（相对路径） */
	ModelLocation = 'ModelLocation',
	/** MCAD格式版本 */
	MCADFormatVersion = 'MCADFormatVersion',
	/** 变换参考（坐标系参考） */
	TransformationReference = 'TransformationReference',
	/** 实例用户区域层名称（用于Other Outline映射） */
	InstanceUserAreaLayerName = 'InstanceUserAreaLayerName',
	/** 反转标记，用于布尔运算（false=添加，true=减去） */
	Inverted = 'Inverted',
	/** 弯曲元素，用于柔性板弯曲区域 */
	Bend = 'Bend',
	/** 弯曲类型，如 CircularBendType */
	BendType = 'BendType',
	/** 弯曲线，定义弯曲轴线 */
	BendLine = 'BendLine',
	/** 内侧，定义弯曲的内侧方向 */
	InnerSide = 'InnerSide',
	/** 内半径，弯曲的内侧半径 */
	InnerRadius = 'InnerRadius',
	/** 内角度，弯曲的角度 */
	InnerAngle = 'InnerAngle',
	/** 弯曲序列号，定义弯曲的应用顺序 */
	bendSequenceNumber = 'bendSequenceNumber',
	/** 包引脚定义（用于元件引脚位置） */
	PackagePin = 'PackagePin',
	/** 3D模型引用 */
	EDMD3DModel = 'EDMD3DModel',
	/** 矩阵偏移量 */
	XX = 'xx',
	/** 矩阵偏移量 */
	XY = 'xy',
	/** 矩阵偏移量 */
	XZ = 'xz',
	/** 矩阵偏移量 */
	YX = 'yx',
	/** 矩阵偏移量 */
	YY = 'yy',
	/** 矩阵偏移量 */
	YZ = 'yz',
	/** 矩阵偏移量 */
	ZX = 'zx',
	/** 矩阵偏移量 */
	ZY = 'zy',
	/** 矩阵偏移量 */
	ZZ = 'zz',
	/** 矩阵偏移量 */
	TX = 'tx',
	/** 矩阵偏移量 */
	TY = 'ty',
	/** 矩阵偏移量 */
	TZ = 'tz',

	/** EDMD 形状元素标识 */
	EDMDShapeElement = 'EDMDShapeElement',
	/** EDMD 层标识 */
	EDMDStratum = 'EDMDStratum',
	/** EDMD 层技术标识 */
	EDMDStratumTechnology = 'EDMDStratumTechnology',
	/** EDMD 装配组件标识 */
	EDMDAssemblyComponent = 'EDMDAssemblyComponent',
	/** EDMD 层间特征标识 */
	EDMDInterStratumFeature = 'EDMDInterStratumFeature',
	/** EDMD 禁止区标识 */
	EDMDKeepOut = 'EDMDKeepOut',
	/** EDMD 允许区标识 */
	EDMDKeepIn = 'EDMDKeepIn',
	/** EDMD 功能性项目形状标识 */
	EDMDFunctionalItemShape = 'EDMDFunctionalItemShape',
	/** EDMD 3D模型标识 */
	EDMDModel3D = 'EDMDModel3D',
}

/**
 * IDX-D2-命名空间标签枚举
 * 包含 2D 几何元素，位于 d2 命名空间
 */
export enum IDXD2Tag {
	/** X 坐标 */
	X = 'X',
	/** Y 坐标 */
	Y = 'Y',
	/** Z 坐标 */
	Z = 'Z',
	/** 下边界，定义曲线集合的 Z 轴起始位置 */
	LowerBound = 'LowerBound',
	/** 上边界，定义曲线集合的 Z 轴结束位置 */
	UpperBound = 'UpperBound',
	/** 详细几何模型元素，指向具体的几何元素 */
	DetailedGeometricModelElement = 'DetailedGeometricModelElement',
	/** 多段线，由一系列点定义的折线 */
	PolyLine = 'PolyLine',
	/** 点，多段线中的点 */
	Point = 'Point',
	/** 点1 */
	Point1 = 'Point1',
	/** 点2 */
	Point2 = 'Point2',
	/** 点3 */
	Point3 = 'Point3',
	/** 厚度，多段线的宽度（如用于走线或铣削路径） */
	Thickness = 'Thickness',
	/** 圆弧 */
	Arc = 'Arc',
	/** 圆（三点式） */
	Circle3Point = 'Circle3Point',
	/** 圆（圆心直径式） */
	CircleCenter = 'CircleCenter',
	/** 椭圆 */
	Ellipse = 'Ellipse',
	/** 抛物线 */
	Parabola = 'Parabola',
	/** B样条曲线 */
	BSplineCurve = 'BSplineCurve',
	/** 复合曲线，由多条曲线组合而成 */
	CompositeCurve = 'CompositeCurve',
	/** 偏移曲线 */
	OffsetCurve = 'OffsetCurve',
	/** 修剪曲线 */
	TrimmedCurve = 'TrimmedCurve',
	/** 直线，由点和向量定义 */
	Line = 'Line',
	/** 向量，定义直线的方向 */
	Vector = 'Vector',
	/** 起点 */
	StartPoint = 'StartPoint',
	/** 中点 */
	MidPoint = 'MidPoint',
	/** 终点 */
	EndPoint = 'EndPoint',
	/** 圆心点 */
	CenterPoint = 'CenterPoint',
	/** 直径 */
	Diameter = 'Diameter',
	/** 椭圆长半轴长度 */
	SemiMajorAxis = 'SemiMajorAxis',
	/** 椭圆短半轴长度 */
	SemiMinorAxis = 'SemiMinorAxis',
	/** 控制点 */
	ControlPoint = 'ControlPoint',
	/** 阶数 */
	Degree = 'Degree',
	/** 是否闭合曲线 */
	ClosedCurve = 'ClosedCurve',
	/** 是否自相交 */
	SelfIntersect = 'SelfIntersect',
	/** 曲线形式 */
	CurveForm = 'CurveForm',
	/** 曲线元素 */
	Curve = 'Curve',

	/** EDMD 坐标点标识 */
	EDMDCartesianPoint = 'EDMDCartesianPoint',
	/** EDMD 多段线标识 */
	EDMDPolyLine = 'EDMDPolyLine',
	/** EDMD Arc标识 */
	EDMDArc = 'EDMDArc',
	/** EDMD 圆（圆心直径式）标识 */
	EDMDCircleCenter = 'EDMDCircleCenter',
	/** EDMD 圆（三点式）标识 */
	EDMDCircle3Point = 'EDMDCircle3Point',
	/** EDMD 椭圆标识 */
	EDMDEllipse = 'EDMDEllipse',
	/** EDMD B样条曲线标识 */
	EDMDBSplineCurve = 'EDMDBSplineCurve',
	/** EDMD 复合曲线标识 */
	EDMDCompositeCurve = 'EDMDCompositeCurve',
	/** EDMD 直线标识 */
	EDMDLine = 'EDMDLine',

	/** EDMD 曲线集标识 */
	EDMDCurveSet2d = 'EDMDCurveSet2d',
}

/**
 * IDX-Property-命名空间标签枚举
 * 包含属性定义元素，位于 property 命名空间
 */
export enum IDXPropertyTag {
	/** 简单用户属性 */
	EDMDUserSimpleProperty = 'EDMDUserSimpleProperty',
	/** 长度属性 */
	EDMDLengthProperty = 'EDMDLengthProperty',
	/** 逻辑属性（布尔值） */
	EDMDLogicProperty = 'EDMDLogicProperty',
	/** 通用属性 */
	EDMDProperty = 'EDMDProperty',
	/** 键，属性键名 */
	Key = 'Key',
	/** 值，属性值 */
	Value = 'Value',
	/** 属性是否已更改 */
	IsChanged = 'IsChanged',
	/** 属性是否为新属性 */
	IsNew = 'IsNew',
	/** 属性是否持久化 */
	Persistent = 'Persistent',
	/** 属性是否源自原始创建者 */
	IsOriginator = 'IsOriginator',
	/** 属性是否已更改（属性级别） */
	IsAttributeChanged = 'IsAttributeChanged',
}

/**
 * IDX-Computational-命名空间标签枚举
 * 包含计算与处理指令元素，位于 computational 命名空间
 */
export enum IDXComputationalTag {
	/** 处理指令-发送信息（基线） */
	SendInformation = 'EDMDProcessInstructionSendInformation',
	/** 处理指令-发送变更（变更提议或响应） */
	SendChanges = 'EDMDProcessInstructionSendChanges',
	/** 处理指令-请求信息 */
	RequestForInformation = 'EDMDProcessInstructionRequestForInformation',
	/** 执行者，发起操作的用户或系统 */
	Actor = 'Actor',
	/** 变更集合 */
	Changes = 'Changes',
	/** 单个变更定义 */
	Change = 'Change',
	/** 新项目引用 */
	NewItem = 'NewItem',
	/** 前驱项目引用 */
	PredecessorItem = 'PredecessorItem',
	/** 事务记录 */
	EDMDTransaction = 'EDMDTransaction',
	/** 删除的实例名称 */
	DeletedInstanceName = 'DeletedInstanceName',
}

/**
 * IDX-Administration-命名空间标签枚举
 * 包含管理与权限元素，位于 administration 命名空间
 */
export enum IDXAdministrationTag {
	/** 项目实例上的角色定义 */
	RoleOnItemInstance = 'RoleOnItemInstance',
	/** 角色名称 */
	RoleName = 'RoleName',
	/** 角色类型，如 owner */
	RoleType = 'RoleType',
	/** 角色类别，如 Mechanical、Electrical */
	Category = 'Category',
	/** 功能，如 Design */
	Function = 'Function',
	/** 上下文，指向项目实例 */
	Context = 'Context',
}

/**
 * IDX-XSI-命名空间标签枚举
 * XML Schema Instance 命名空间，位于 xsi 命名空间
 * 参考：W3C XML Schema Part 1: Structures (https://www.w3.org/TR/xmlschema-1/)
 * 注意：这些主要用于属性，不是元素
 */
export enum IDXXSITag {
	/** XML Schema Instance 类型属性，用于指定元素的具体类型 */
	type = 'type',
	/** XML Schema 位置属性，指定用于验证的 XML Schema 文件位置 */
	schemaLocation = 'schemaLocation',
	/** nil 属性，表示元素为空 */
	nil = 'nil',
}

/**
 * 所有 IDX 标签的联合类型
 * 用于类型安全的标签引用
 */
export type IDXTag = IDXFoundationTag | IDXPDMTag | IDXD2Tag | IDXPropertyTag | IDXComputationalTag | IDXAdministrationTag | IDXXSITag;

/** IDX 处理指令类型 */
export type IDXProcessInstruction = IDXComputationalTag.SendInformation | IDXComputationalTag.SendChanges | IDXComputationalTag.RequestForInformation;
