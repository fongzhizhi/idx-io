import { create } from 'xmlbuilder2';
import { XMLBuilder, XMLWriterOptions } from 'xmlbuilder2/lib/interfaces';
import {
	isIDXNameSpace,
	XsiTypeAttrName,
	PropAttrChanedAttrName,
	PropValueAttrName,
	getIDXFoundationTagName,
	getIDXPDMTagName,
	getIDXD2TagName,
	getIDXPropertyTagName,
	getIDXComputationalTagName,
	getIDXTagName,
} from '../../edmd/utils/idx-namespace.utils';
import {
	EDMDObject,
	EDMDIdentifier,
	EDMDName,
	EDMDUserSimpleProperty,
	EDMDTransformation,
	EDMDCartesianPoint,
	UserSimpleProperty,
} from '../../types/edmd/base.types';
import { EDMDDataSet, EDMDHistory } from '../../types/edmd/dataset.types';
import {
	EDMDGeometry,
	EDMDPolyLine,
	EDMDLine,
	EDMDArc,
	EDMDCircleCenter,
	EDMDCircle3Point,
	EDMDEllipse,
	EDMDBSplineCurve,
	EDMDCompositeCurve,
	EDMDCurveSet2D,
} from '../../types/edmd/geometry.types';
import { EDMDItemSingle, EDMPackagePin, EDMDItemAssembly, EDMDItemInstance, ItemType, EDMDGeometryType } from '../../types/edmd/item.types';
import {
	IDXFoundationTag,
	IDXNameSpaceLinks,
	IDXD2Tag,
	IDXPropertyTag,
	IDXPDMTag,
	IDXComputationalTag,
	IDXTag,
	IDXNameSpace,
} from '../../types/edmd/namespace.types';
import {
	EDMDAssemblyComponent,
	EDMDFunctionalItemShape,
	EDMDInterStratumFeature,
	EDMDKeepIn,
	EDMDKeepOut,
	EDMDShapeElement,
	EDMDStratum,
	EDMDStratumTechnology,
	EDMDThirdItem,
	EDMDThirdItemType,
} from '../../types/edmd/shape-element.types';
import { EDMDModel3D } from '../../types/edmd/model3d.types';
import { LayerDefinition, LayerStackupDefinition } from '../../types/edmd/layer.types';
import { IDXWriteConfig } from '../../types/exporter/writer/idx-writer.interface';
import { iterateArr } from '../../utils/array.utils';
import { isValidNumber } from '../../utils/number.utils';
import { iterateObject, toBoolean, isValidBool, toString } from '../../utils/object.utils';
import { DefaultIDXWriteConfig } from './config/idx-writer.config';

/** IDX 格式生成器 */
export class IDXWriter {
	// ============= 状态量 =============
	// ------------ 私有变量 ------------
	/** 配置 */
	private config = DefaultIDXWriteConfig;

	// ------------ 序列化状态量 ------------
	/** 数据集 */
	private dataset: EDMDDataSet | undefined;
	/** 文档根节点 */
	private doc: XMLBuilder | undefined;
	/** 数据集节点 */
	private datasetEle: XMLBuilder | undefined;
	/** 数据体节点 */
	private bodyEle: XMLBuilder | undefined;

	/** IDX 格式生成器 */
	constructor(config?: IDXWriteConfig) {
		if (config) {
			this.config = config;
		}
	}

	/** IDX格式序列化 */
	serialize(dataset: EDMDDataSet): string {
		// # IDX 初始化
		if (!dataset) {
			return '';
		}
		this.dataset = dataset;
		this.createDoc();

		// # 构建 IDX
		this.building();

		// # 序列化
		const idxSource = this.createIDXSource();

		// # 内存回收
		this.memoryCycle();

		return idxSource;
	}

	// ============= 私有化工具函数 =============
	/** 创建分区节点注释 */
	private createSectionComment(sectionName: string, sectionDesc?: string) {
		const sectionDescFull = sectionDesc ? `: ${sectionDesc}` : '';
		return `=============${sectionName}${sectionDescFull}=============`;
	}

	// ============= 序列化流程相关 =============
	/** 创建 IDX 文档 */
	private createDoc() {
		const doc = create({
			version: '1.0',
			encoding: 'utf-8',
		});
		this.doc = doc;
	}

	/** 构建 IDX */
	private building() {
		// # 构建 EDMDDataSet
		this.buildEDMDDataSet();

		// ## 构建 HEADER
		this.buildHeader();

		// ## 构建 Body
		this.buildBody();

		// ## 构建 ProcessInstruction
		this.buildProcessInstruction();

		// ## 构建历史记录
		this.buildHistories();
	}

	/** 构建 EDMDDataSet */
	private buildEDMDDataSet() {
		const doc = this.doc;
		if (!doc) {
			return;
		}
		const namespaces = this.config.namespaces;

		const dataSetTagName = getIDXFoundationTagName(IDXFoundationTag.EDMDDataSet);
		const dataSetNameSpaces = IDXNameSpaceLinks;

		// # 构建节点
		const datasetEle = doc.ele(dataSetTagName, dataSetNameSpaces);

		// # 添加自定义命名空间
		iterateObject(namespaces, (url, nameSpace) => {
			if (isIDXNameSpace(nameSpace)) {
				// WARN: 自定义命名空间与官方命名空间重名
				return;
			}
			// TODO: 检测 url 的合法性
			doc.att(nameSpace, url);
		});

		this.datasetEle = datasetEle;
	}

	/** 生成 IDX 源码 */
	private createIDXSource(): string {
		const doc = this.doc;
		if (!doc) {
			return '';
		}
		const formatting = this.config.formatting;

		const prettyPrint = toBoolean(formatting?.prettyPrint);
		const idxWriterOpts: XMLWriterOptions = {
			prettyPrint,
		};

		return doc.end(idxWriterOpts);
	}

	/** 内存回收 */
	private memoryCycle() {
		this.dataset = undefined;
		this.doc = undefined;
		this.datasetEle = undefined;
		this.bodyEle = undefined;
	}

	// ============= 序列化 Header =============
	/** 构建 Header */
	private buildHeader() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const { enableComments } = this.config;

		// # 构建节点
		if (enableComments) {
			const headerComment = this.createSectionComment(
				'文件头',
				'提供文件元数据和全局上下文'
			);
			datasetEle.com(headerComment);
		}
		const headerTagName = getIDXFoundationTagName(IDXFoundationTag.Header);
		const headerAttrs: Record<string, string> = {
			[XsiTypeAttrName]: getIDXFoundationTagName(IDXFoundationTag.EDMDHeader),
		};
		const headerElement = datasetEle.ele(headerTagName, headerAttrs);

		// # 创建元数据信息
		const Header = dataset.Header;

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.Description)).txt(
			toString(Header.Description)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.CreatorName)).txt(
			toString(Header.CreatorName)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.CreatorCompany)).txt(
			toString(Header.CreatorCompany)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.CreatorSystem)).txt(
			toString(Header.CreatorSystem)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.Creator)).txt(toString(Header.Creator));

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.PostProcessor)).txt(
			toString(Header.PostProcessor)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.PostProcessorVersion)).txt(
			toString(Header.PostProcessorVersion)
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.GlobalUnitLength)).txt(
			Header.GlobalUnitLength
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.CreationDateTime)).txt(
			Header.CreationDateTime
		);

		headerElement.ele(getIDXFoundationTagName(IDXFoundationTag.ModifiedDateTime)).txt(
			Header.ModifiedDateTime
		);
	}

	// ============= 序列化 Body =============
	/** 构建 Body */
	private buildBody() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const { enableComments } = this.config;

		// # 构建节点
		if (enableComments) {
			const bodyComment = this.createSectionComment(
				'数据体',
				'具体的EDMD交换数据, 如板子、层堆叠、元件、孔、禁止区等'
			);
			datasetEle.com(bodyComment);
		}
		const bodyTagName = getIDXFoundationTagName(IDXFoundationTag.Body);
		const bodyAttrs: Record<string, string> = {
			[XsiTypeAttrName]: getIDXFoundationTagName(IDXFoundationTag.EDMDDataSetBody),
		};
		const bodyEle = datasetEle.ele(bodyTagName, bodyAttrs);
		this.bodyEle = bodyEle;

		// # 构建数据体（按照IDX层次结构顺序）

		// ## 构建坐标点
		this.buildCartesianPoints();

		// ## 构建几何元素
		this.buildGeometries();

		// ## 构建曲线集
		this.buildCurveSets();

		// ## 构建形状元素
		this.buildShapeElements();

		// ## 构建传统方式Third Item层次
		this.buildThirdItems();

		// ## 构建物理层和构建层堆叠
		this.buildLayersAndLayersStackup();

		// ## 构建3D模型
		this.buildModels3D();

		// ## 构建封装
		this.buildPackages();

		// ## 构建项目定义
		this.buildItemsSingle();

		// ## 构建项目实例和装配
		this.buildItemsAssembly();
	}

	// ------------ 构建通用数据 ------------
	/** 构建基础属性 */
	private buildBasicAttr(baseObj: EDMDObject): Record<string, string> {
		const baseAttrs: Record<string, string> = {};
		if (!baseObj) {
			return baseAttrs;
		}
		const { id, IsAttributeChanged } = baseObj;

		baseAttrs.id = id;

		if (isValidBool(IsAttributeChanged)) {
			baseAttrs[PropAttrChanedAttrName] = toString(IsAttributeChanged);
		}

		return baseAttrs;
	}

	/** 构建基础数据 */
	private buildBasicData(targetEle: XMLBuilder, baseObj: EDMDObject) {
		if (!baseObj || !targetEle) {
			return;
		}
		const { Name, Description, UserProperties } = baseObj;

		if (Name) {
			targetEle.ele(getIDXFoundationTagName(IDXFoundationTag.Name)).txt(Name);
		}
		if (Description) {
			targetEle.ele(getIDXFoundationTagName(IDXFoundationTag.Description)).txt(
				Description
			);
		}
		this.buildUserProperties(targetEle, UserProperties);
	}

	/** 构建属性值 */
	private buildPropValue(targetEle: XMLBuilder, value: number | boolean | string) {
		targetEle.ele(PropValueAttrName).txt(toString(value));
	}

	/** 构建长度属性值（带xsi:type声明） */
	private buildLengthProperty(targetEle: XMLBuilder, value: number) {
		targetEle.att(XsiTypeAttrName, getIDXPropertyTagName(IDXPropertyTag.EDMDLengthProperty));
		this.buildPropValue(targetEle, value);
	}

	// ------------ 构建几何 ------------
	/** 批量构建坐标点 */
	private buildCartesianPoints() {
		const points = this.dataset?.Body?.Points;
		const bodyEle = this.bodyEle;
		if (!points || !bodyEle || points.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const pointsComment = this.createSectionComment('坐标点', '几何坐标点');
			bodyEle.com(pointsComment);
		}

		iterateArr(points, point => {
			this.buildCartesianPoint(point);
		});
	}

	/** 构建坐标点 */
	private buildCartesianPoint(point: EDMDCartesianPoint) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) {
			return;
		}
		const { X, Y } = point;

		// # 构建节点
		const pointTagName = getIDXFoundationTagName(IDXFoundationTag.CartesianPoint);

		// ## 构建属性
		const pointAttrs: Record<string, string> = {
			...this.buildBasicAttr(point),
			[XsiTypeAttrName]: getIDXD2TagName(IDXD2Tag.EDMDCartesianPoint),
		};

		const pointEle = bodyEle.ele(pointTagName, pointAttrs);

		// ## 构建基础数据
		this.buildBasicData(pointEle, point);

		// ## 创建坐标
		const xEle = pointEle.ele(getIDXD2TagName(IDXD2Tag.X));
		this.buildLengthProperty(xEle, X);

		const yEle = pointEle.ele(getIDXD2TagName(IDXD2Tag.Y));
		this.buildLengthProperty(yEle, Y);
	}

	/** 批量构建几何元素 */
	private buildGeometries() {
		const geometries = this.dataset?.Body?.Geometries;
		const bodyEle = this.bodyEle;
		if (!geometries || !bodyEle || geometries.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const geometriesComment = this.createSectionComment(
				'几何元素',
				'2D几何轮廓定义'
			);
			bodyEle.com(geometriesComment);
		}

		iterateArr(geometries, geometry => {
			this.buildGeometry(geometry);
		});
	}

	/** 构建几何元素 */
	private buildGeometry(geometry: EDMDGeometry) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) {
			return;
		}

		// # 根据几何类型分发构建
		const geometryType = geometry.type;
		switch (geometryType) {
			case IDXD2Tag.EDMDPolyLine:
				this.buildPolyLine(geometry);
				break;
			case IDXD2Tag.EDMDLine:
				this.buildLine(geometry);
				break;
			case IDXD2Tag.EDMDArc:
				this.buildArc(geometry);
				break;
			case IDXD2Tag.EDMDCircleCenter:
				this.buildCircleCenter(geometry);
				break;
			case IDXD2Tag.EDMDCircle3Point:
				this.buildCircle3Point(geometry);
				break;
			case IDXD2Tag.EDMDEllipse:
				this.buildEllipse(geometry);
				break;
			case IDXD2Tag.EDMDBSplineCurve:
				this.buildBSplineCurve(geometry);
				break;
			case IDXD2Tag.EDMDCompositeCurve:
				this.buildCompositeCurve(geometry);
				break;
			default:
				console.warn(
					`Unsupported geometry type: ${JSON.stringify(geometry)}`
				);
				break;
		}
	}

	/** 构建多段线 */
	private buildPolyLine(polyLine: EDMDPolyLine) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, Thickness, Points } = polyLine;

		// # 构建节点
		const polyLineTagName = getIDXD2TagName(IDXD2Tag.PolyLine);

		// ## 构建属性
		const polyLineAttrs: Record<string, string> = {
			...this.buildBasicAttr(polyLine),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const polyLineEle = bodyEle.ele(polyLineTagName, polyLineAttrs);

		// ## 构建基础数据
		this.buildBasicData(polyLineEle, polyLine);

		// ## 构建厚度
		if (Thickness && isValidNumber(Thickness)) {
			const thicknessEle = polyLineEle.ele(getIDXD2TagName(IDXD2Tag.Thickness));
			this.buildLengthProperty(thicknessEle, Thickness);
		}

		// ## 构建点序列
		iterateArr(Points, pointId => {
			polyLineEle.ele(getIDXD2TagName(IDXD2Tag.Point)).txt(pointId);
		});
	}

	/** 构建线段 */
	private buildLine(line: EDMDLine) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, Point, Vector } = line;

		// # 构建节点
		const lineTagName = getIDXD2TagName(IDXD2Tag.Line);

		// ## 构建属性
		const lineAttrs: Record<string, string> = {
			...this.buildBasicAttr(line),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const lineEle = bodyEle.ele(lineTagName, lineAttrs);

		// ## 构建基础数据
		this.buildBasicData(lineEle, line);

		// ## 构建坐标点
		lineEle.ele(getIDXD2TagName(IDXD2Tag.Point)).txt(Point);
		lineEle.ele(getIDXD2TagName(IDXD2Tag.Vector)).txt(Vector);
	}

	/** 构建圆弧 */
	private buildArc(arc: EDMDArc) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, StartPoint, MidPoint, EndPoint } = arc;

		// # 构建节点
		const arcTagName = getIDXD2TagName(IDXD2Tag.Arc);

		// ## 构建属性
		const arcAttrs: Record<string, string> = {
			...this.buildBasicAttr(arc),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const arcEle = bodyEle.ele(arcTagName, arcAttrs);

		// ## 构建基础数据
		this.buildBasicData(arcEle, arc);

		// ## 构建坐标点
		arcEle.ele(getIDXD2TagName(IDXD2Tag.StartPoint)).txt(StartPoint);
		arcEle.ele(getIDXD2TagName(IDXD2Tag.MidPoint)).txt(MidPoint);
		arcEle.ele(getIDXD2TagName(IDXD2Tag.EndPoint)).txt(EndPoint);
	}

	/** 构建圆心式圆 */
	private buildCircleCenter(circle: EDMDCircleCenter) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, CenterPoint, Diameter } = circle;

		// # 构建节点
		const circleTagName = getIDXD2TagName(IDXD2Tag.CircleCenter);

		// ## 构建属性
		const circleAttrs: Record<string, string> = {
			...this.buildBasicAttr(circle),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const circleEle = bodyEle.ele(circleTagName, circleAttrs);

		// ## 构建基础数据
		this.buildBasicData(circleEle, circle);

		// ## 构建圆心点
		circleEle.ele(getIDXD2TagName(IDXD2Tag.CenterPoint)).txt(CenterPoint);

		// ## 构建直径
		const diameterEle = circleEle.ele(getIDXD2TagName(IDXD2Tag.Diameter));
		this.buildLengthProperty(diameterEle, Diameter);
	}

	/** 构建三点式圆 */
	private buildCircle3Point(circle: EDMDCircle3Point) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, Point1, Point2, Point3 } = circle;

		// # 构建节点
		const circleTagName = getIDXD2TagName(IDXD2Tag.Circle3Point);

		// ## 构建属性
		const circleAttrs: Record<string, string> = {
			...this.buildBasicAttr(circle),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const circleEle = bodyEle.ele(circleTagName, circleAttrs);

		// ## 构建基础数据
		this.buildBasicData(circleEle, circle);

		// ## 构建三个点
		circleEle.ele(getIDXD2TagName(IDXD2Tag.Point1)).txt(Point1);
		circleEle.ele(getIDXD2TagName(IDXD2Tag.Point2)).txt(Point2);
		circleEle.ele(getIDXD2TagName(IDXD2Tag.Point3)).txt(Point3);
	}

	/** 构建椭圆 */
	private buildEllipse(ellipse: EDMDEllipse) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, CenterPoint, SemiMajorAxis, SemiMinorAxis } = ellipse;

		// # 构建节点
		const ellipseTagName = getIDXD2TagName(IDXD2Tag.Ellipse);

		// ## 构建属性
		const ellipseAttrs: Record<string, string> = {
			...this.buildBasicAttr(ellipse),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const ellipseEle = bodyEle.ele(ellipseTagName, ellipseAttrs);

		// ## 构建基础数据
		this.buildBasicData(ellipseEle, ellipse);

		// ## 构建中心点
		ellipseEle.ele(getIDXD2TagName(IDXD2Tag.CenterPoint)).txt(CenterPoint);

		// ## 构建长半轴
		const semiMajorAxisEle = ellipseEle.ele(getIDXD2TagName(IDXD2Tag.SemiMajorAxis));
		this.buildLengthProperty(semiMajorAxisEle, SemiMajorAxis);

		// ## 构建短半轴
		const semiMinorAxisEle = ellipseEle.ele(getIDXD2TagName(IDXD2Tag.SemiMinorAxis));
		this.buildLengthProperty(semiMinorAxisEle, SemiMinorAxis);
	}

	/** 构建B样条曲线 */
	private buildBSplineCurve(bSpline: EDMDBSplineCurve) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, ControlPoints, Degree, ClosedCurve, SelfIntersect, CurveForm } = bSpline;

		// # 构建节点
		const bSplineTagName = getIDXD2TagName(IDXD2Tag.BSplineCurve);

		// ## 构建属性
		const bSplineAttrs: Record<string, string> = {
			...this.buildBasicAttr(bSpline),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const bSplineEle = bodyEle.ele(bSplineTagName, bSplineAttrs);

		// ## 构建基础数据
		this.buildBasicData(bSplineEle, bSpline);

		// ## 构建控制点
		iterateArr(ControlPoints, pointId => {
			bSplineEle.ele(getIDXD2TagName(IDXD2Tag.ControlPoint)).txt(pointId);
		});

		// ## 构建阶数
		bSplineEle.ele(getIDXD2TagName(IDXD2Tag.Degree)).txt(toString(Degree));

		// 构建可选数据
		const closedCurve = ClosedCurve;
		if (isValidBool(closedCurve)) {
			bSplineEle.ele(getIDXD2TagName(IDXD2Tag.ClosedCurve)).txt(
				toString(closedCurve)
			);
		}
		const selfIntersect = SelfIntersect;
		if (isValidBool(selfIntersect)) {
			bSplineEle.ele(getIDXD2TagName(IDXD2Tag.SelfIntersect)).txt(
				toString(selfIntersect)
			);
		}
		const curveForm = CurveForm;
		if (curveForm) {
			bSplineEle.ele(getIDXD2TagName(IDXD2Tag.CurveForm)).txt(curveForm);
		}
	}

	/** 构建复合曲线 */
	private buildCompositeCurve(compositeCurve: EDMDCompositeCurve) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type, Curves } = compositeCurve;

		// # 构建节点
		const compositeTagName = getIDXD2TagName(IDXD2Tag.CompositeCurve);

		// ## 构建属性
		const compositeAttrs: Record<string, string> = {
			...this.buildBasicAttr(compositeCurve),
			[XsiTypeAttrName]: getIDXD2TagName(type),
		};

		const compositeEle = bodyEle.ele(compositeTagName, compositeAttrs);

		// ## 构建曲线序列
		iterateArr(Curves, curveId => {
			compositeEle.ele(getIDXD2TagName(IDXD2Tag.Curve)).txt(curveId);
		});

		// ## 构建基础数据
		this.buildBasicData(compositeEle, compositeCurve);
	}

	/** 批量构建曲线集 */
	private buildCurveSets() {
		const curveSets = this.dataset?.Body?.CurveSets;
		const bodyEle = this.bodyEle;
		if (!curveSets || !bodyEle || curveSets.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const curveSetsComment = this.createSectionComment(
				'曲线集',
				'2.5D几何的Z轴范围定义'
			);
			bodyEle.com(curveSetsComment);
		}

		iterateArr(curveSets, curveSet => {
			this.buildCurveSet(curveSet);
		});
	}

	/** 构建曲线集 */
	private buildCurveSet(curveSet: EDMDCurveSet2D) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { LowerBound, UpperBound, ShapeDescriptionType, DetailedGeometricModelElements } = curveSet;

		// # 构建节点
		const curveSetTagName = getIDXFoundationTagName(IDXFoundationTag.CurveSet2d);

		// ## 构建属性
		const curveSetAttrs: Record<string, string> = {
			...this.buildBasicAttr(curveSet),
			[XsiTypeAttrName]: getIDXD2TagName(IDXD2Tag.EDMDCurveSet2d),
		};

		const curveSetEle = bodyEle.ele(curveSetTagName, curveSetAttrs);

		// ## 构建基础数据
		this.buildBasicData(curveSetEle, curveSet);

		// ## 构建形状描述类型
		curveSetEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeDescriptionType)).txt(ShapeDescriptionType);

		// ## 构建下边界
		const lowerBoundEle = curveSetEle.ele(getIDXD2TagName(IDXD2Tag.LowerBound));
		this.buildLengthProperty(lowerBoundEle, LowerBound);

		// ## 构建上边界
		const upperBoundEle = curveSetEle.ele(getIDXD2TagName(IDXD2Tag.UpperBound));
		this.buildLengthProperty(upperBoundEle, UpperBound);

		// ## 构建几何元素引用
		iterateArr(DetailedGeometricModelElements, geometryId => {
			curveSetEle.ele(getIDXD2TagName(IDXD2Tag.DetailedGeometricModelElement)).txt(
				geometryId
			);
		});
	}

	// ------------ 构建形状元素 ------------
	/** 批量构建形状元素 */
	private buildShapeElements() {
		const shapeElements = this.dataset?.Body?.ShapeElements;
		const bodyEle = this.bodyEle;
		if (!shapeElements || !bodyEle || shapeElements.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const shapeElementsComment = this.createSectionComment(
				'形状元素',
				'连接曲线集和项目定义'
			);
			bodyEle.com(shapeElementsComment);
		}

		iterateArr(shapeElements, shapeElement => {
			this.buildShapeElement(shapeElement);
		});
	}

	/** 构建形状元素 */
	private buildShapeElement(shapeElement: EDMDShapeElement) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElementType, Inverted, DefiningShape } = shapeElement;

		// # 构建节点
		const shapeElementTagName = getIDXFoundationTagName(IDXFoundationTag.ShapeElement);

		// ## 构建属性
		const shapeElementAttrs: Record<string, string> = {
			...this.buildBasicAttr(shapeElement),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDShapeElement),
		};

		const shapeElementEle = bodyEle.ele(shapeElementTagName, shapeElementAttrs);

		// ## 构建基础数据
		this.buildBasicData(shapeElementEle, shapeElement);

		// ## 构建形状元素类型
		shapeElementEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElementType)).txt(ShapeElementType);

		// ## 构建反转标记（布尔运算）
		shapeElementEle.ele(getIDXPDMTagName(IDXPDMTag.Inverted)).txt(toString(Inverted));

		// ## 构建定义形状（引用曲线集）
		shapeElementEle.ele(getIDXPDMTagName(IDXPDMTag.DefiningShape)).txt(DefiningShape);
	}

	// ------------ 构建传统Third Item层次 ------------
	/** 批量构建传统Third Item层次 */
	private buildThirdItems() {
		const thirdItems = this.dataset?.Body?.ThirdItems;
		const bodyEle = this.bodyEle;
		if (!thirdItems || !bodyEle || thirdItems.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const thirdItemsComment = this.createSectionComment(
				'传统Third Item层次',
				'传统建模方式的中间对象层'
			);
			bodyEle.com(thirdItemsComment);
		}

		iterateArr(thirdItems, thirdItem => {
			this.buildThirdItem(thirdItem);
		});
	}

	/** 构建传统Third Item */
	private buildThirdItem(thirdItem: EDMDThirdItem) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { type } = thirdItem;

		switch (type) {
			case IDXPDMTag.EDMDStratum:
				this.buildStratum(thirdItem);
				break;
			case IDXPDMTag.EDMDAssemblyComponent:
				this.buildAssemblyComponent(thirdItem);
				break;
			case IDXPDMTag.EDMDInterStratumFeature:
				this.buildInterStratumFeature(thirdItem);
				break;
			case IDXPDMTag.EDMDKeepOut:
				this.buildKeepOut(thirdItem);
				break;
			case IDXPDMTag.EDMDKeepIn:
				this.buildKeepIn(thirdItem);
				break;
			case IDXPDMTag.EDMDFunctionalItemShape:
				this.buildFunctionalItemShape(thirdItem);
				break;
			case IDXPDMTag.EDMDStratumTechnology:
				this.buildStratumTechnology(thirdItem);
				break;
			default:
				console.warn(
					`Unknown third item type: ${JSON.stringify(thirdItem)}`
				);
				break;
		}
	}

	/** 构建层（Stratum） */
	private buildStratum(stratum: EDMDStratum) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElements, StratumType, StratumSurfaceDesignation, StratumTechnology } = stratum;

		// # 构建节点
		const stratumTagName = getIDXFoundationTagName(IDXFoundationTag.Stratum);

		// ## 构建属性
		const stratumAttrs: Record<string, string> = {
			...this.buildBasicAttr(stratum),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDStratum),
		};

		const stratumEle = bodyEle.ele(stratumTagName, stratumAttrs);

		// ## 构建基础数据
		this.buildBasicData(stratumEle, stratum);

		// ## 构建形状元素引用
		iterateArr(ShapeElements, shapeElementId => {
			stratumEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(shapeElementId);
		});

		// ## 构建层类型
		stratumEle.ele(getIDXPDMTagName(IDXPDMTag.StratumType)).txt(StratumType);

		// ## 构建层表面指定（可选）
		if (StratumSurfaceDesignation) {
			stratumEle.ele(getIDXPDMTagName(IDXPDMTag.StratumSurfaceDesignation)).txt(
				StratumSurfaceDesignation
			);
		}

		// ## 构建层技术引用（可选）
		if (StratumTechnology) {
			stratumEle.ele(getIDXPDMTagName(IDXPDMTag.StratumTechnology)).txt(
				StratumTechnology
			);
		}
	}

	/** 构建组件（AssemblyComponent） */
	private buildAssemblyComponent(assemblyComponent: EDMDAssemblyComponent) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElement, AssemblyComponentType } = assemblyComponent;

		// # 构建节点
		const assemblyComponentTagName = getIDXFoundationTagName(IDXFoundationTag.AssemblyComponent);

		// ## 构建属性
		const assemblyComponentAttrs: Record<string, string> = {
			...this.buildBasicAttr(assemblyComponent),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDAssemblyComponent),
		};

		const assemblyComponentEle = bodyEle.ele(assemblyComponentTagName, assemblyComponentAttrs);

		// ## 构建基础数据
		this.buildBasicData(assemblyComponentEle, assemblyComponent);

		// ## 构建形状元素引用
		assemblyComponentEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(ShapeElement);

		// ## 构建组件类型
		assemblyComponentEle.ele(getIDXPDMTagName(IDXPDMTag.AssemblyComponentType)).txt(
			AssemblyComponentType
		);
	}

	/** 构建跨层特征（InterStratumFeature） */
	private buildInterStratumFeature(interStratumFeature: EDMDInterStratumFeature) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElement, InterStratumFeatureType, Stratum } = interStratumFeature;

		// # 构建节点
		const interStratumFeatureTagName = getIDXFoundationTagName(IDXFoundationTag.InterStratumFeature);

		// ## 构建属性
		const interStratumFeatureAttrs: Record<string, string> = {
			...this.buildBasicAttr(interStratumFeature),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDInterStratumFeature),
		};

		const interStratumFeatureEle = bodyEle.ele(interStratumFeatureTagName, interStratumFeatureAttrs);

		// ## 构建基础数据
		this.buildBasicData(interStratumFeatureEle, interStratumFeature);

		// ## 构建形状元素引用
		interStratumFeatureEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(ShapeElement);

		// ## 构建跨层特征类型
		interStratumFeatureEle.ele(getIDXPDMTagName(IDXPDMTag.InterStratumFeatureType)).txt(
			InterStratumFeatureType
		);

		// ## 构建关联层引用
		interStratumFeatureEle.ele(getIDXPDMTagName(IDXPDMTag.Stratum)).txt(Stratum);
	}

	/** 构建禁布区（KeepOut） */
	private buildKeepOut(keepOut: EDMDKeepOut) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElement, Purpose } = keepOut;

		// # 构建节点
		const keepOutTagName = getIDXFoundationTagName(IDXFoundationTag.KeepOut);

		// ## 构建属性
		const keepOutAttrs: Record<string, string> = {
			...this.buildBasicAttr(keepOut),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDKeepOut),
		};

		const keepOutEle = bodyEle.ele(keepOutTagName, keepOutAttrs);

		// ## 构建基础数据
		this.buildBasicData(keepOutEle, keepOut);

		// ## 构建形状元素引用
		keepOutEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(ShapeElement);

		// ## 构建禁布目的
		keepOutEle.ele(getIDXPDMTagName(IDXPDMTag.Purpose)).txt(Purpose);
	}

	/** 构建保留区（KeepIn） */
	private buildKeepIn(keepIn: EDMDKeepIn) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElement, Purpose } = keepIn;

		// # 构建节点
		const keepInTagName = getIDXFoundationTagName(IDXFoundationTag.KeepIn);

		// ## 构建属性
		const keepInAttrs: Record<string, string> = {
			...this.buildBasicAttr(keepIn),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDKeepIn),
		};

		const keepInEle = bodyEle.ele(keepInTagName, keepInAttrs);

		// ## 构建基础数据
		this.buildBasicData(keepInEle, keepIn);

		// ## 构建形状元素引用
		keepInEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(ShapeElement);

		// ## 构建保留目的
		keepInEle.ele(getIDXPDMTagName(IDXPDMTag.Purpose)).txt(Purpose);
	}

	/** 构建功能区（FunctionalItemShape） */
	private buildFunctionalItemShape(functionalItemShape: EDMDFunctionalItemShape) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { ShapeElement, FunctionalItemShapeType } = functionalItemShape;

		// # 构建节点
		const functionalItemShapeTagName = getIDXFoundationTagName(IDXFoundationTag.FunctionalItemShape);

		// ## 构建属性
		const functionalItemShapeAttrs: Record<string, string> = {
			...this.buildBasicAttr(functionalItemShape),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDFunctionalItemShape),
		};

		const functionalItemShapeEle = bodyEle.ele(functionalItemShapeTagName, functionalItemShapeAttrs);

		// ## 构建基础数据
		this.buildBasicData(functionalItemShapeEle, functionalItemShape);

		// ## 构建形状元素引用
		functionalItemShapeEle.ele(getIDXPDMTagName(IDXPDMTag.ShapeElement)).txt(ShapeElement);

		// ## 构建功能区类型
		functionalItemShapeEle.ele(getIDXPDMTagName(IDXPDMTag.FunctionalItemShapeType)).txt(
			FunctionalItemShapeType
		);
	}

	/** 构建层技术（StratumTechnology） */
	private buildStratumTechnology(stratumTechnology: EDMDStratumTechnology) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { TechnologyType, LayerPurpose } = stratumTechnology;

		// # 构建节点
		const stratumTechnologyTagName = getIDXFoundationTagName(IDXFoundationTag.StratumTechnology);

		// ## 构建属性
		const stratumTechnologyAttrs: Record<string, string> = {
			...this.buildBasicAttr(stratumTechnology),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDStratumTechnology),
		};

		const stratumTechnologyEle = bodyEle.ele(stratumTechnologyTagName, stratumTechnologyAttrs);

		// ## 构建基础数据
		this.buildBasicData(stratumTechnologyEle, stratumTechnology);

		// ## 构建技术类型
		stratumTechnologyEle.ele(getIDXPDMTagName(IDXPDMTag.TechnologyType)).txt(TechnologyType);

		// ## 构建层用途
		stratumTechnologyEle.ele(getIDXPDMTagName(IDXPDMTag.LayerPurpose)).txt(LayerPurpose);
	}

	// ------------ 构建物理层和层堆叠------------
	/** 构建物理层和层堆叠 */
	private buildLayersAndLayersStackup() {
		const layers = this.dataset?.Body?.Layers;
		const layerStackups = this.dataset?.Body?.LayerStackups;
		const bodyEle = this.bodyEle;
		if (
			!bodyEle ||
			((!layers || layers.length === 0) &&
				(!layerStackups || layerStackups.length === 0))
		) {
			return;
		}
		const { enableComments } = this.config;

		// # 构建物理层
		if (layers && layers.length > 0) {
			if (enableComments) {
				const layersComment = this.createSectionComment(
					'物理层',
					'PCB各层定义'
				);
				bodyEle.com(layersComment);
			}

			iterateArr(layers, layer => {
				this.buildLayer(layer);
			});
		}

		// # 构建层堆叠
		if (layerStackups && layerStackups.length > 0) {
			if (enableComments) {
				const stackupsComment = this.createSectionComment(
					'层堆叠',
					'PCB层压结构'
				);
				bodyEle.com(stackupsComment);
			}

			iterateArr(layerStackups, stackup => {
				this.buildLayerStackup(stackup);
			});
		}
	}

	/** 构建物理层（简化方式） */
	private buildLayer(layer: LayerDefinition) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const {
			id,
			layerType,
			name,
			description,
			referenceName,
			lowerBound,
			upperBound,
			material,
			thickness,
			dielectricConstant,
		} = layer;

		// # 构建节点
		const layerTagName = getIDXFoundationTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const layerAttrs: Record<string, string> = {
			id,
			geometryType: layerType,
		};

		const layerEle = bodyEle.ele(layerTagName, layerAttrs);

		// ## 构建基础数据
		layerEle.ele(getIDXFoundationTagName(IDXFoundationTag.Name)).txt(name);
		if (description) {
			layerEle.ele(getIDXFoundationTagName(IDXFoundationTag.Description)).txt(
				description
			);
		}

		// ## 构建项目类型
		layerEle.ele(getIDXPDMTagName(IDXPDMTag.ItemType)).txt(ItemType.ASSEMBLY);

		// ## 构建形状引用（可选）
		if (referenceName) {
			layerEle.ele(getIDXPDMTagName(IDXPDMTag.ReferenceName)).txt(referenceName);
		}

		// ## 构建用户属性：Z轴范围
		const lowerBoundProp = this.createUserProperty(UserSimpleProperty.LowerBound, lowerBound.toString());
		const upperBoundProp = this.createUserProperty(UserSimpleProperty.UpperBound, upperBound.toString());

		this.buildUserProperty(layerEle, lowerBoundProp);
		this.buildUserProperty(layerEle, upperBoundProp);

		// ## 构建其他用户属性
		if (material) {
			const materialProp = this.createUserProperty(
				UserSimpleProperty.MATERIAL,
				material
			);
			this.buildUserProperty(layerEle, materialProp);
		}
		if (thickness) {
			const thicknessProp = this.createUserProperty(
				UserSimpleProperty.THICKNESS,
				thickness.toString()
			);
			this.buildUserProperty(layerEle, thicknessProp);
		}
		if (dielectricConstant) {
			const dielectricProp = this.createUserProperty(
				UserSimpleProperty.DIELECTRIC_CONSTANT,
				dielectricConstant.toString()
			);
			this.buildUserProperty(layerEle, dielectricProp);
		}
	}

	/** 构建层堆叠（简化方式） */
	private buildLayerStackup(stackup: LayerStackupDefinition) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const { id, name, description, referenceName, layers } = stackup;

		// # 构建节点
		const stackupTagName = getIDXFoundationTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const stackupAttrs: Record<string, string> = {
			id: id,
			geometryType: EDMDGeometryType.LAYER_STACKUP,
		};

		const stackupEle = bodyEle.ele(stackupTagName, stackupAttrs);

		// ## 构建基础数据
		stackupEle.ele(getIDXFoundationTagName(IDXFoundationTag.Name)).txt(name);
		if (description) {
			stackupEle.ele(getIDXFoundationTagName(IDXFoundationTag.Description)).txt(
				description
			);
		}

		// ## 构建项目类型
		stackupEle.ele(getIDXPDMTagName(IDXPDMTag.ItemType)).txt(ItemType.ASSEMBLY);

		// ## 构建参考名称
		if (referenceName) {
			stackupEle.ele(getIDXPDMTagName(IDXPDMTag.ReferenceName)).txt(referenceName);
		}

		// ## 构建层实例
		iterateArr(layers, layer => {
			const instanceAttrs: Record<string, string> = {
				id: `INST_${layer.layerReferenceName}`,
			};
			const instanceEle = stackupEle.ele(
				getIDXPDMTagName(IDXPDMTag.ItemInstance),
				instanceAttrs
			);

			// 引用层
			instanceEle.ele(getIDXPDMTagName(IDXPDMTag.Item)).txt(
				layer.layerReferenceName
			);

			// 实例名称
			instanceEle.ele(getIDXPDMTagName(IDXPDMTag.InstanceName)).txt(
				layer.layerReferenceName
			);

			// Z轴范围用户属性
			const lowerBoundProp = this.createUserProperty(
				UserSimpleProperty.LowerBound,
				layer.lowerBound.toString()
			);
			const upperBoundProp = this.createUserProperty(
				UserSimpleProperty.UpperBound,
				layer.upperBound.toString()
			);

			this.buildUserProperty(instanceEle, lowerBoundProp);
			this.buildUserProperty(instanceEle, upperBoundProp);

			// 其他用户属性
			if (layer.material) {
				const materialProp = this.createUserProperty(
					UserSimpleProperty.MATERIAL,
					layer.material
				);
				this.buildUserProperty(instanceEle, materialProp);
			}
			if (layer.layerPurpose) {
				const purposeProp = this.createUserProperty(
					UserSimpleProperty.LAYER_TYPE,
					layer.layerPurpose
				);
				this.buildUserProperty(instanceEle, purposeProp);
			}
		});
	}

	// ------------ 构建3D模型------------
	/** 构建3D模型 */
	private buildModels3D() {
		const models3D = this.dataset?.Body?.Models3D;
		const bodyEle = this.bodyEle;
		if (!models3D || !bodyEle || models3D.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const models3DComment = this.createSectionComment(
				'3D模型',
				'外部3D CAD模型引用'
			);
			bodyEle.com(models3DComment);
		}

		iterateArr(models3D, model3D => {
			this.buildModel3D(model3D);
		});
	}

	/** 构建单个3D模型 */
	private buildModel3D(model3D: EDMDModel3D) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const {
			ModelIdentifier,
			MCADFormat,
			ModelVersion,
			ModelLocation,
			MCADFormatVersion,
			Transformation,
			TransformationReference,
		} = model3D;

		// # 构建节点
		const model3DTagName = getIDXFoundationTagName(IDXFoundationTag.Model3D);

		// ## 构建属性
		const model3DAttrs: Record<string, string> = {
			...this.buildBasicAttr(model3D),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDModel3D),
		};

		const model3DEle = bodyEle.ele(model3DTagName, model3DAttrs);

		// ## 构建基础数据
		this.buildBasicData(model3DEle, model3D);

		// ## 构建模型标识符
		model3DEle.ele(getIDXPDMTagName(IDXPDMTag.ModelIdentifier)).txt(ModelIdentifier);

		// ## 构建MCAD格式
		model3DEle.ele(getIDXPDMTagName(IDXPDMTag.MCADFormat)).txt(MCADFormat);

		// ## 构建模型版本（可选）
		if (ModelVersion) {
			model3DEle.ele(getIDXPDMTagName(IDXPDMTag.ModelVersion)).txt(ModelVersion);
		}

		// ## 构建模型位置（可选）
		if (ModelLocation) {
			model3DEle.ele(getIDXPDMTagName(IDXPDMTag.ModelLocation)).txt(ModelLocation);
		}

		// ## 构建MCAD格式版本（可选）
		if (MCADFormatVersion) {
			model3DEle.ele(getIDXPDMTagName(IDXPDMTag.MCADFormatVersion)).txt(
				MCADFormatVersion
			);
		}

		// ## 构建变换矩阵（可选）
		this.buildTransformation(model3DEle, Transformation);

		// ## 构建变换参考（可选）
		if (TransformationReference) {
			model3DEle.ele(getIDXPDMTagName(IDXPDMTag.TransformationReference)).txt(
				TransformationReference
			);
		}
	}

	// ------------ 构建封装------------
	/** 构建封装 */
	private buildPackages() {
		// TODO: 实现封装构建逻辑（也是Item(Single)）
	}

	// ------------ 构建项目定义 ------------
	/** 批量构建项目定义（Item single） */
	private buildItemsSingle() {
		const itemsSingle = this.dataset?.Body?.ItemsSingle;
		const bodyEle = this.bodyEle;
		if (!itemsSingle || !bodyEle || itemsSingle.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const itemsSingleComment = this.createSectionComment(
				'项目定义',
				'几何定义，可被多个实例引用'
			);
			bodyEle.com(itemsSingleComment);
		}

		iterateArr(itemsSingle, itemSingle => {
			this.buildItemSingle(itemSingle);
		});
	}

	/** 构建项目定义（Item single） */
	private buildItemSingle(itemSingle: EDMDItemSingle) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;
		const {
			ItemType,
			geometryType,
			Identifier,
			PackageName,
			ReferenceName,
			Shape,
			PackagePins,
			EDMD3DModel,
			BaseLine,
			AssembleToName,
		} = itemSingle;

		// # 构建节点
		const itemTagName = getIDXFoundationTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const itemSingleAttrs: Record<string, string> = {
			...this.buildBasicAttr(itemSingle),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDItem),
		};

		// ### 添加几何类型属性（简化建模的关键）
		if (geometryType) {
			itemSingleAttrs.geometryType = geometryType;
		}

		const itemSingleEle = bodyEle.ele(itemTagName, itemSingleAttrs);

		// ## 构建基础数据
		this.buildBasicData(itemSingleEle, itemSingle);

		// ## 构建项目类型（必须为single）
		itemSingleEle.ele(getIDXPDMTagName(IDXPDMTag.ItemType)).txt(ItemType);

		// ## 构建标识符（可选）
		this.buildItemIdentifier(itemSingleEle, Identifier);

		// ## 构建包名称（可选）
		if (PackageName) {
			this.buildItemEDMName(
				itemSingleEle,
				PackageName,
				IDXPDMTag.PackageName,
				IDXNameSpace.PDM
			);
		}

		// ## 构建参考名称（可选）
		if (ReferenceName) {
			itemSingleEle.ele(getIDXPDMTagName(IDXPDMTag.ReferenceName)).txt(
				ReferenceName
			);
		}

		// ## 构建形状引用
		itemSingleEle.ele(getIDXPDMTagName(IDXPDMTag.Shape)).txt(Shape);

		// ## 构建包引脚定义（可选）
		this.buildItemPackagePins(itemSingleEle, PackagePins);

		// ## 构建3D模型引用（可选）
		if (EDMD3DModel) {
			itemSingleEle.ele(getIDXPDMTagName(IDXPDMTag.EDMD3DModel)).txt(EDMD3DModel);
		}

		// ## 构建基线标记（可选）
		this.buildItemBaseLine(itemSingleEle, BaseLine);

		// ## 构建组装到名称（可选）
		if (AssembleToName) {
			itemSingleEle.ele(getIDXPDMTagName(IDXPDMTag.AssembleToName)).txt(
				AssembleToName
			);
		}
	}

	/** 构建项目构建标识符 */
	private buildItemIdentifier(targetEle: XMLBuilder, identifier?: EDMDIdentifier) {
		if (!targetEle || !identifier) {
			return;
		}
		const identifierEle = targetEle.ele(getIDXPDMTagName(IDXPDMTag.Identifier));
		identifierEle.ele(getIDXFoundationTagName(IDXFoundationTag.SystemScope)).txt(identifier.SystemScope);
		identifierEle.ele(getIDXFoundationTagName(IDXFoundationTag.Number)).txt(identifier.Number);
		identifierEle.ele(getIDXFoundationTagName(IDXFoundationTag.Version)).txt(
			toString(identifier.Version)
		);
		identifierEle.ele(getIDXFoundationTagName(IDXFoundationTag.Revision)).txt(
			toString(identifier.Revision)
		);
		identifierEle.ele(getIDXFoundationTagName(IDXFoundationTag.Sequence)).txt(
			toString(identifier.Sequence)
		);
	}

	/** 构建项目对象名称 */
	private buildItemEDMName(
		targetEle: XMLBuilder,
		edaName?: EDMDName,
		tagName: IDXTag = IDXPDMTag.PackageName,
		nameSpace = IDXNameSpace.PDM
	) {
		if (!targetEle || !edaName) {
			return;
		}
		const packageNameAttrs: Record<string, string> = {
			[XsiTypeAttrName]: getIDXFoundationTagName(IDXFoundationTag.EDMDName),
		};
		const packageNameEle = targetEle.ele(getIDXTagName(tagName, nameSpace), packageNameAttrs);
		packageNameEle.ele(getIDXFoundationTagName(IDXFoundationTag.SystemScope)).txt(edaName.SystemScope);
		packageNameEle.ele(getIDXFoundationTagName(IDXFoundationTag.ObjectName)).txt(edaName.ObjectName);
	}

	/** 构建包引脚 */
	private buildItemPackagePins(targetEle: XMLBuilder, packagePins?: EDMPackagePin[]) {
		if (!targetEle || !packagePins) {
			return;
		}
		iterateArr(packagePins, pin => {
			const pinAttrs: Record<string, string> = {
				pinNumber: pin.pinNumber,
				primary: toString(pin.primary),
			};
			const pinEle = targetEle.ele(
				getIDXPDMTagName(IDXPDMTag.PackagePin),
				pinAttrs
			);
			pinEle.ele(getIDXD2TagName(IDXD2Tag.Point)).txt(pin.Point);

			const pinShape = pin.Shape;
			if (pinShape) {
				pinEle.ele(getIDXPDMTagName(IDXPDMTag.Shape)).txt(
					pinShape
				);
			}
		});
	}

	/** 构建自定义属性 */
	private buildItemBaseLine(targetEle: XMLBuilder, baseLine?: boolean) {
		if (targetEle && isValidBool(baseLine)) {
			const baseLineEle = targetEle.ele(getIDXPDMTagName(IDXPDMTag.BaseLine));
			this.buildPropValue(baseLineEle, baseLine);
		}
	}

	/** 创建用户属性辅助函数 */
	private createUserProperty(key: string, value: string): EDMDUserSimpleProperty {
		return {
			Key: {
				SystemScope: 'ECADSYSTEM', // TODO: 以后可能需要支持自定义SystemScope
				ObjectName: key,
			},
			Value: value,
		};
	}

	/** 批量构建自定义属性 */
	private buildUserProperties(targetEle: XMLBuilder, userProperties?: EDMDUserSimpleProperty[]) {
		if (!targetEle || !userProperties || userProperties.length == 0) {
			return;
		}
		iterateArr(userProperties, userProp => {
			this.buildUserProperty(targetEle, userProp);
		});
	}

	/** 构建用户属性 */
	private buildUserProperty(targetEle: XMLBuilder, userProp: EDMDUserSimpleProperty) {
		if (!targetEle || !userProp) {
			return;
		}

		// # 构建节点
		const userPropTagName = getIDXPropertyTagName(IDXPropertyTag.EDMDUserSimpleProperty);

		// ## 构建属性
		const userPropAttrs: Record<string, string> = {};
		const isChanged = userProp.IsChanged;
		if (isValidBool(isChanged)) {
			userPropAttrs['IsChanged'] = toString(isChanged);
		}

		const isNew = userProp.IsNew;
		if (isValidBool(isNew)) {
			userPropAttrs['IsNew'] = toString(isNew);
		}

		const userPropEle = targetEle.ele(userPropTagName, userPropAttrs);

		// ## 构建键
		this.buildItemEDMName(userPropEle, userProp.Key, IDXPropertyTag.Key, IDXNameSpace.Property);

		// ## 构建值
		this.buildPropValue(userPropEle, userProp.Value);
	}

	// ------------ 构建项目装配 ------------
	/** 批量构建项目实例（Item assembly） */
	private buildItemsAssembly() {
		const itemsAssembly = this.dataset?.Body?.ItemsAssembly;
		const bodyEle = this.bodyEle;
		if (!itemsAssembly || !bodyEle || itemsAssembly.length === 0) {
			return;
		}
		const { enableComments } = this.config;

		if (enableComments) {
			const itemsAssemblyComment = this.createSectionComment(
				'项目实例',
				'包含一个或多个实例的装配体'
			);
			bodyEle.com(itemsAssemblyComment);
		}

		iterateArr(itemsAssembly, itemAssembly => {
			this.buildItemAssembly(itemAssembly);
		});
	}

	/** 构建项目实例（Item assembly） */
	private buildItemAssembly(itemAssembly: EDMDItemAssembly) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// ## 构建名称
		const itemTagName = getIDXFoundationTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const itemAttrs: Record<string, string> = {
			...this.buildBasicAttr(itemAssembly),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDItem),
		};
		// ### 构建几何类型属性（简化方式的关键）
		if (itemAssembly.geometryType) {
			itemAttrs['geometryType'] = itemAssembly.geometryType;
		}

		const itemAssemblyEle = bodyEle.ele(itemTagName, itemAttrs);

		// ## 构建基础数据
		this.buildBasicData(itemAssemblyEle, itemAssembly);

		// ## 构建项目类型（必须为assembly）
		itemAssemblyEle.ele(getIDXPDMTagName(IDXPDMTag.ItemType)).txt(itemAssembly.ItemType);

		// ## 构建标识符（可选）
		this.buildItemIdentifier(itemAssemblyEle, itemAssembly.Identifier);

		// ## 构建项目实例列表
		iterateArr(itemAssembly.ItemInstances, (instance: EDMDItemInstance) => {
			this.buildItemInstance(itemAssemblyEle, instance);
		});

		// ## 构建装配到名称（用于相对定位）
		const assembleToName = itemAssembly.AssembleToName;
		if (assembleToName) {
			itemAssemblyEle.ele(getIDXPDMTagName(IDXPDMTag.AssembleToName)).txt(
				assembleToName
			);
		}

		// ## 构建参考名称（可选）
		const referenceName = itemAssembly.ReferenceName;
		if (referenceName) {
			itemAssemblyEle.ele(getIDXPDMTagName(IDXPDMTag.ReferenceName)).txt(
				referenceName
			);
		}

		// ## 构建基线标记（可选）
		this.buildItemBaseLine(itemAssemblyEle, itemAssembly.BaseLine);

		// ## 构建用户属性（可选）
		this.buildUserProperties(itemAssemblyEle, itemAssembly.UserProperties);
	}

	/** 构建项目实例 */
	private buildItemInstance(itemAssemblyEle: XMLBuilder, itemInstance: EDMDItemInstance) {
		if (!itemAssemblyEle) {
			return;
		}
		const {
			Item,
			InstanceName,
			Transformation,
			zOffset,
			bendSequenceNumber,
			UserProperties,
			InstanceUserAreaLayerName,
		} = itemInstance;

		// # 构建节点
		const instanceTagName = getIDXPDMTagName(IDXPDMTag.ItemInstance);

		// ## 构建属性
		const instanceAttrs: Record<string, string> = {
			...this.buildBasicAttr(itemInstance),
			[XsiTypeAttrName]: getIDXPDMTagName(IDXPDMTag.EDMDItemInstance),
		};

		const instanceEle = itemAssemblyEle.ele(instanceTagName, instanceAttrs);

		// ## 构建基础数据
		this.buildBasicData(instanceEle, itemInstance);

		// ## 构建引用的项目定义
		instanceEle.ele(getIDXPDMTagName(IDXPDMTag.Item)).txt(Item);

		// ## 构建实例名称（可选）
		if (InstanceName) {
			this.buildItemEDMName(
				instanceEle,
				InstanceName,
				IDXPDMTag.InstanceName,
				IDXNameSpace.PDM
			);
		}

		// ## 构建变换矩阵（可选）
		this.buildTransformation(instanceEle, Transformation);

		// ## 构建Z轴偏移（IDXv4.0+）
		if (zOffset && isValidNumber(zOffset)) {
			instanceEle.att('zOffset', toString(zOffset));
		}

		// ## 构建弯曲序列号（用于柔性板）
		if (isValidNumber(bendSequenceNumber)) {
			instanceEle.att('bendSequenceNumber', toString(bendSequenceNumber));
		}

		// ## 构建用户属性（可选）
		this.buildUserProperties(instanceEle, UserProperties);

		// ## 构建实例用户区域层名称（用于Other Outline映射）
		if (InstanceUserAreaLayerName) {
			this.buildItemEDMName(
				instanceEle,
				InstanceUserAreaLayerName,
				IDXPDMTag.InstanceUserAreaLayerName,
				IDXNameSpace.PDM
			);
		}
	}

	/** 构建变换矩阵 */
	private buildTransformation(instanceEle: XMLBuilder, transformation?: EDMDTransformation) {
		if (!instanceEle || !transformation) {
			return;
		}
		const { TransformationType } = transformation;

		// # 构建节点
		const transformationEle = instanceEle.ele(getIDXPDMTagName(IDXPDMTag.Transformation));

		// ## 构建变换类型
		transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TransformationType)).txt(TransformationType);

		if (TransformationType === 'd2') {
			// ## 构建 2D 变换
			const d2 = transformation;
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.XX)).txt(toString(d2.xx));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.XY)).txt(toString(d2.xy));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.YX)).txt(toString(d2.yx));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.YY)).txt(toString(d2.yy));

			// 平移分量使用 property:Value 包装
			const txEle = transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TX));
			this.buildLengthProperty(txEle, d2.tx);

			const tyEle = transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TY));
			this.buildLengthProperty(tyEle, d2.ty);
		} else {
			// ## 构建 3D 变换
			const d3 = transformation;
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.XX)).txt(toString(d3.xx));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.XY)).txt(toString(d3.xy));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.XZ)).txt(toString(d3.xz));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.YX)).txt(toString(d3.yx));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.YY)).txt(toString(d3.yy));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.YZ)).txt(toString(d3.yz));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.ZX)).txt(toString(d3.zx));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.ZY)).txt(toString(d3.zy));
			transformationEle.ele(getIDXPDMTagName(IDXPDMTag.ZZ)).txt(toString(d3.zz));

			// 平移分量使用 property:Value 包装
			const txEle = transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TX));
			this.buildLengthProperty(txEle, d3.tx);

			const tyEle = transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TY));
			this.buildLengthProperty(tyEle, d3.ty);

			const tzEle = transformationEle.ele(getIDXPDMTagName(IDXPDMTag.TZ));
			this.buildLengthProperty(tzEle, d3.tz);
		}
	}

	// ============= 序列化 ProcessInstruction =============
	/** 构建处理指令 */
	private buildProcessInstruction() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const { enableComments } = this.config;

		// # 构建节点
		// ## 注释
		const ProcessInstruction = dataset.ProcessInstruction;
		if (enableComments) {
			const instructionComment = this.createSectionComment(
				'处理指令',
				'文件的类型和意图'
			);
			datasetEle.com(instructionComment);
		}

		// ## 属性
		const instructionTagName = getIDXFoundationTagName(IDXFoundationTag.ProcessInstruction);
		const instructionType = ProcessInstruction.type;
		const instructionXsiType = getIDXComputationalTagName(instructionType);
		const instructionAttrs: Record<string, string> = {
			[XsiTypeAttrName]: instructionXsiType,
		};
		const instructionEle = datasetEle.ele(instructionTagName, instructionAttrs);

		// ## 添加执行者
		const actor = ProcessInstruction.Actor;
		if (actor) {
			instructionEle.ele(getIDXComputationalTagName(IDXComputationalTag.Actor)).txt(
				actor
			);
		}

		if (instructionType == IDXComputationalTag.SendInformation) {
			// ## 添加基线相关数据
			const description = ProcessInstruction.Description;
			if (description) {
				instructionEle.ele(
					getIDXFoundationTagName(
						IDXFoundationTag.Description
					)
				).txt(description);
			}
		} else if (instructionType == IDXComputationalTag.SendChanges) {
			// ## 添加变更相关数据
			// TODO: 暂不支持
		} else {
			// ## 添加请求相关数据
			// TODO: 暂不支持
		}
	}

	// ============= 序列化 History =============
	/** 批量构建历史记录 */
	private buildHistories() {
		const Histories = this.dataset?.Body?.Histories;
		const bodyEle = this.bodyEle;
		if (!Histories || !bodyEle || Histories.length === 0) {
			return;
		}

		const { enableComments } = this.config;

		if (enableComments) {
			const historyComment = this.createSectionComment(
				'历史记录',
				'变更和审批记录'
			);
			bodyEle.com(historyComment);
		}

		iterateArr(Histories, history => {
			this.buildHistory(history);
		});
	}

	/** 构建历史记录 */
	private buildHistory(history: EDMDHistory) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// TODO: 暂不支持
		// 历史记录不是IDX核心部分，根据文档是可选的
		console.warn('History serialization not yet implemented');
	}
}
