// src/exporter/writer/IDXWriter.ts
import { create } from 'xmlbuilder2';
import {
	CartesianPoint,
	EDMDDataSet,
	EDMDGeometry,
	EDMDCurveSet2D,
	EDMDShapeElement,
	EDMDItemSingle,
	EDMDItemAssembly,
	EDMDItemInstance,
	EDMDTransformation,
	GlobalUnit,
	GeometryType,
	EDMDProcessInstructionType,
	EDMDObject,
	EDMDPolyLine,
	EDMDArc,
	EDMDCircleCenter,
	EDMDBSplineCurve,
	EDMDCompositeCurve,
	EDMDIdentifier,
	EDMName,
	EDMPackagePin,
	EDMDUserSimpleProperty,
	EDMDHistory,
} from '../../types/core';
import { XMLBuilder, XMLWriterOptions } from 'xmlbuilder2/lib/interfaces';
import { IDXWriteConfig } from '../../types/exporter/writer/idx-writer.interface';
import { DefaultIDXWriteConfig } from './config/idx-writer.config';
import { hasOwnProperty, isValidBool, iterateObject, toBoolean, toString } from '../../utils/object.utils';
import { getIDXTagName, isIDXNameSpace, PropAttrChanedAttrName, XsiTypeAttrName } from '../../core/utils/idx-namespace.utils';
import {
	IDXComputationalTag,
	IDXD2Tag,
	IDXFoundationTag,
	IDXNameSpace,
	IDXNameSpaceLinks,
	IDXPDMTag,
	IDXPropertyTag,
	IDXXSITag,
} from '../../types/core/namespace.types';
import { iterateArr } from '../../utils/array.utils';
import { isValidNumber } from '../../utils/number.utils';

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

	// ============= 序列化相关 =============
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

		const dataSetTagName = getIDXTagName(IDXFoundationTag.EDMDDataSet);
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

	/** 构建 Header */
	private buildHeader() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

		// # 构建节点
		if (enableComments) {
			const headerComment = this.createSectionComment(
				'文件头',
				'提供文件元数据和全局上下文'
			);
			datasetEle.com(headerComment);
		}
		const headerTagName = getIDXTagName(IDXFoundationTag.Header);
		const headerAttrs: Record<string, string> = {
			[XsiTypeAttrName]: getIDXTagName(IDXFoundationTag.EDMDHeader),
		};
		const headerElement = datasetEle.ele(headerTagName, headerAttrs);

		// # 创建元数据信息
		const Header = dataset.Header;

		headerElement.ele(getIDXTagName(IDXFoundationTag.Description)).txt(toString(Header.Description));

		headerElement.ele(getIDXTagName(IDXFoundationTag.CreatorName)).txt(toString(Header.CreatorName));

		headerElement.ele(getIDXTagName(IDXFoundationTag.CreatorCompany)).txt(
			toString(Header.CreatorCompany)
		);

		headerElement.ele(getIDXTagName(IDXFoundationTag.CreatorSystem)).txt(toString(Header.CreatorSystem));

		headerElement.ele(getIDXTagName(IDXFoundationTag.Creator)).txt(toString(Header.Creator));

		headerElement.ele(getIDXTagName(IDXFoundationTag.PostProcessor)).txt(toString(Header.PostProcessor));

		headerElement.ele(getIDXTagName(IDXFoundationTag.PostProcessorVersion)).txt(
			toString(Header.PostProcessorVersion)
		);

		headerElement.ele(getIDXTagName(IDXFoundationTag.GlobalUnitLength)).txt(Header.GlobalUnitLength);

		headerElement.ele(getIDXTagName(IDXFoundationTag.CreationDateTime)).txt(Header.CreationDateTime);

		headerElement.ele(getIDXTagName(IDXFoundationTag.ModifiedDateTime)).txt(Header.ModifiedDateTime);
	}

	/** 构建 Body */
	private buildBody() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

		// # 构建节点
		if (enableComments) {
			const bodyComment = this.createSectionComment(
				'数据体',
				'具体的EDMD交换数据, 如板子、层堆叠、元件、孔、禁止区等'
			);
			datasetEle.com(bodyComment);
		}
		const bodyTagName = getIDXTagName(IDXFoundationTag.Body);
		const bodyAttrs: Record<string, string> = {
			[XsiTypeAttrName]: getIDXTagName(IDXFoundationTag.EDMDBody),
		};
		const bodyEle = datasetEle.ele(bodyTagName, bodyAttrs);
		this.bodyEle = bodyEle;

		// # 构建数据体（按照IDX层次结构顺序）
		// 1. 点 → 2. 几何 → 3. 曲线集 → 4. 形状元素 → 5. 项目定义 → 6. 项目实例

		// 1. 构建坐标点
		this.buildCartesianPoints();

		// 2. 构建几何元素
		this.buildGeometries();

		// 3. 构建曲线集
		this.buildCurveSets();

		// 4. 构建形状元素
		this.buildShapeElements();

		// 5. 构建3D模型引用（可选）
		this.buildModels3D();

		// 6. 构建项目定义（Item single）
		this.buildItemsSingle();

		// 7. 构建项目实例（Item assembly）
		this.buildItemsAssembly();

		// 8. 构建历史记录（可选）
		this.buildHistories();
	}

	/** 构建基础属性 */
	private buildBasicAttr(baseObj: EDMDObject) {
		const baseAttrs: Record<string, string> = {};
		if (!baseObj) {
			return baseAttrs;
		}
		const { id, IsAttributeChanged } = baseObj;

		baseAttrs[id] = id;

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
		const { Name, Description } = baseObj;

		if (Name) {
			targetEle.ele(getIDXTagName(IDXFoundationTag.Name)).txt(Name);
		}
		if (Description) {
			targetEle.ele(getIDXTagName(IDXFoundationTag.Description)).txt(Description);
		}

		return;
	}

	/** 批量构建坐标点 */
	private buildCartesianPoints() {
		const points = this.dataset?.Body?.Points;
		const bodyEle = this.bodyEle;
		if (!points || !bodyEle || points.length === 0) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

		if (enableComments) {
			const pointsComment = this.createSectionComment('坐标点', '几何坐标点');
			bodyEle.com(pointsComment);
		}

		iterateArr(points, point => {
			this.buildCartesianPoint(point);
		});
	}

	/** 构建坐标点 */
	private buildCartesianPoint(point: CartesianPoint) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) {
			return;
		}

		// # 构建节点
		const pointTagName = getIDXTagName(IDXFoundationTag.CartesianPoint);

		// ## 构建属性
		const pointAttrs: Record<string, string> = {
			...this.buildBasicAttr(point),
			[XsiTypeAttrName]: `${IDXD2Tag.EDMDCartesianPoint}`,
		};

		const pointEle = bodyEle.ele(pointTagName, pointAttrs);

		// ## 构建基础数据
		this.buildBasicData(pointEle, point);

		// ## 创建坐标
		const xEle = pointEle.ele(getIDXTagName(IDXD2Tag.X));
		xEle.ele(IDXPropertyTag.Value).txt(toString(point.X));

		const yEle = pointEle.ele(getIDXTagName(IDXD2Tag.Y));
		yEle.ele(IDXPropertyTag.Value).txt(toString(point.Y));

		if (isValidNumber(point.Z)) {
			const zEle = pointEle.ele(getIDXTagName(IDXD2Tag.Z));
			zEle.ele(IDXPropertyTag.Value).txt(toString(point.Z!));
		}
	}

	/** 批量构建几何元素 */
	private buildGeometries() {
		const geometries = this.dataset?.Body?.Geometries;
		const bodyEle = this.bodyEle;
		if (!geometries || !bodyEle || geometries.length === 0) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

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
			case IDXD2Tag.EDMDArc:
				this.buildArc(geometry);
				break;
			case IDXD2Tag.EDMDCircleCenter:
				this.buildCircleCenter(geometry);
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

		// # 构建节点
		const polyLineTagName = getIDXTagName(IDXD2Tag.PolyLine);

		// ## 构建属性
		const polyLineAttrs: Record<string, string> = {
			...this.buildBasicAttr(polyLine),
			[XsiTypeAttrName]: getIDXTagName(polyLine.type),
		};

		const polyLineEle = bodyEle.ele(polyLineTagName, polyLineAttrs);

		// ## 构建基础数据
		this.buildBasicData(polyLineEle, polyLine);

		// ## 构建厚度
		const thickness = polyLine.Thickness;
		if (isValidNumber(thickness)) {
			const thicknessEle = polyLineEle.ele(getIDXTagName(IDXD2Tag.Thickness));
			thicknessEle.ele(IDXPropertyTag.Value).txt(toString(thickness));
		}

		// ## 构建点序列
		iterateArr(polyLine.Points, pointId => {
			polyLineEle.ele(getIDXTagName(IDXD2Tag.Point)).txt(pointId);
		});
	}

	/** 构建圆弧 */
	private buildArc(arc: EDMDArc) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// # 构建节点
		const arcTagName = getIDXTagName(IDXD2Tag.Arc);

		// ## 构建属性
		const arcAttrs: Record<string, string> = {
			...this.buildBasicAttr(arc),
			[XsiTypeAttrName]: getIDXTagName(arc.type),
		};

		const arcEle = bodyEle.ele(arcTagName, arcAttrs);

		// ## 构建基础数据
		this.buildBasicData(arcEle, arc);

		// ## 构建坐标点
		arcEle.ele(getIDXTagName(IDXD2Tag.StartPoint)).txt(arc.StartPoint);
		arcEle.ele(getIDXTagName(IDXD2Tag.MidPoint)).txt(arc.MidPoint);
		arcEle.ele(getIDXTagName(IDXD2Tag.EndPoint)).txt(arc.EndPoint);
	}

	/** 构建圆心式圆 */
	private buildCircleCenter(circle: EDMDCircleCenter) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// # 构建节点
		const circleTagName = getIDXTagName(IDXD2Tag.CircleCenter);

		// ## 构建属性
		const circleAttrs: Record<string, string> = {
			...this.buildBasicAttr(circle),
			[XsiTypeAttrName]: getIDXTagName(circle.type),
		};

		const circleEle = bodyEle.ele(circleTagName, circleAttrs);

		// ## 构建基础数据
		this.buildBasicData(circleEle, circle);

		// ## 构建圆心点
		circleEle.ele(getIDXTagName(IDXD2Tag.CenterPoint)).txt(circle.CenterPoint);

		// ## 构建直径
		const diameterEle = circleEle.ele(getIDXTagName(IDXD2Tag.Diameter));
		diameterEle.ele(IDXPropertyTag.Value).txt(toString(circle.Diameter));
	}

	/** 构建B样条曲线 */
	private buildBSplineCurve(bSpline: EDMDBSplineCurve) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// # 构建节点
		const bSplineTagName = getIDXTagName(IDXD2Tag.BSplineCurve);

		// ## 构建属性
		const bSplineAttrs: Record<string, string> = {
			...this.buildBasicAttr(bSpline),
			[XsiTypeAttrName]: getIDXTagName(bSpline.type),
		};

		const bSplineEle = bodyEle.ele(bSplineTagName, bSplineAttrs);

		// ## 构建基础数据
		this.buildBasicData(bSplineEle, bSpline);

		// ## 构建控制点
		iterateArr(bSpline.ControlPoints, pointId => {
			bSplineEle.ele(getIDXTagName(IDXD2Tag.ControlPoint)).txt(pointId);
		});

		// ## 构建阶数
		bSplineEle.ele(getIDXTagName(IDXD2Tag.Degree)).txt(bSpline.Degree.toString());

		// 构建可选数据
		const closedCurve = bSpline.ClosedCurve;
		if (isValidBool(closedCurve)) {
			bSplineEle.ele(getIDXTagName(IDXD2Tag.ClosedCurve)).txt(
				toString(closedCurve)
			);
		}
		const selfIntersect = bSpline.SelfIntersect;
		if (isValidBool(selfIntersect)) {
			bSplineEle.ele(getIDXTagName(IDXD2Tag.SelfIntersect)).txt(
				toString(closedCurve)
			);
		}
		const curveForm = bSpline.CurveForm;
		if (curveForm) {
			bSplineEle.ele(getIDXTagName(IDXD2Tag.CurveForm)).txt(curveForm);
		}
	}

	/** 构建复合曲线 */
	private buildCompositeCurve(compositeCurve: EDMDCompositeCurve) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// # 构建节点
		const compositeTagName = getIDXTagName(IDXD2Tag.CompositeCurve);

		// ## 构建属性
		const compositeAttrs: Record<string, string> = {
			...this.buildBasicAttr(compositeCurve),
			[XsiTypeAttrName]: getIDXTagName(compositeCurve.type),
		};

		const compositeEle = bodyEle.ele(compositeTagName, compositeAttrs);

		// ## 构建曲线序列
		iterateArr(compositeCurve.Curves, curveId => {
			compositeEle.ele(getIDXTagName(IDXD2Tag.Curve)).txt(curveId);
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
		const config = this.config;
		const enableComments = config.enableComments;

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

		// # 构建节点
		const curveSetTagName = getIDXTagName(IDXFoundationTag.CurveSet2d);

		// ## 构建属性
		const curveSetAttrs: Record<string, string> = {
			...this.buildBasicAttr(curveSet),
			[XsiTypeAttrName]: getIDXTagName(IDXD2Tag.EDMDCurveSet2d),
		};

		const curveSetEle = bodyEle.ele(curveSetTagName, curveSetAttrs);

		// ## 构建基础数据
		this.buildBasicData(curveSetEle, curveSet);

		// ## 构建形状描述类型
		curveSetEle.ele(getIDXTagName(IDXPDMTag.ShapeDescriptionType)).txt(curveSet.ShapeDescriptionType);

		// ## 构建下边界
		const lowerBoundEle = curveSetEle.ele(getIDXTagName(IDXD2Tag.LowerBound));
		lowerBoundEle.ele(IDXPropertyTag.Value).txt(toString(curveSet.LowerBound));

		// ## 构建上边界
		const upperBoundEle = curveSetEle.ele(getIDXTagName(IDXD2Tag.UpperBound));
		upperBoundEle.ele(IDXPropertyTag.Value).txt(toString(curveSet.UpperBound));

		// ## 构建几何元素引用
		iterateArr(curveSet.DetailedGeometricModelElements, geometryId => {
			curveSetEle.ele(getIDXTagName(IDXD2Tag.DetailedGeometricModelElement)).txt(
				geometryId
			);
		});
	}

	/** 批量构建形状元素 */
	private buildShapeElements() {
		const shapeElements = this.dataset?.Body?.ShapeElements;
		const bodyEle = this.bodyEle;
		if (!shapeElements || !bodyEle || shapeElements.length === 0) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

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

		// # 构建节点
		const shapeElementTagName = getIDXTagName(IDXFoundationTag.ShapeElement);

		// ## 构建属性
		const shapeElementAttrs: Record<string, string> = {
			...this.buildBasicAttr(shapeElement),
			[XsiTypeAttrName]: getIDXTagName(IDXPDMTag.EDMDShapeElement),
		};

		const shapeElementEle = bodyEle.ele(shapeElementTagName, shapeElementAttrs);

		// ## 构建基础数据
		this.buildBasicData(shapeElementEle, shapeElement);

		// ## 构建形状元素类型
		shapeElementEle.ele(getIDXTagName(IDXPDMTag.ShapeElementType)).txt(shapeElement.ShapeElementType);

		// ## 构建反转标记（布尔运算）
		shapeElementEle.ele(getIDXTagName(IDXPDMTag.Inverted)).txt(toString(shapeElement.Inverted));

		// ## 构建定义形状（引用曲线集）
		shapeElementEle.ele(getIDXTagName(IDXPDMTag.DefiningShape)).txt(shapeElement.DefiningShape);
	}

	/** 构建3D模型引用 */
	private buildModels3D() {
		// TODO: 实现3D模型引用
	}

	/** 批量构建项目定义（Item single） */
	private buildItemsSingle() {
		const itemsSingle = this.dataset?.Body?.ItemsSingle;
		const bodyEle = this.bodyEle;
		if (!itemsSingle || !bodyEle || itemsSingle.length === 0) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

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

	/** 构建项目构建标识符 */
	private buildItemIdentifier(targetEle: XMLBuilder, identifier?: EDMDIdentifier) {
		if (!targetEle || !identifier) {
			return;
		}
		const identifierEle = targetEle.ele(getIDXTagName(IDXPDMTag.Identifier));
		identifierEle.ele(getIDXTagName(IDXFoundationTag.SystemScope)).txt(identifier.SystemScope);
		identifierEle.ele(getIDXTagName(IDXFoundationTag.Number)).txt(identifier.Number);
		identifierEle.ele(getIDXTagName(IDXFoundationTag.Version)).txt(toString(identifier.Version));
		identifierEle.ele(getIDXTagName(IDXFoundationTag.Revision)).txt(toString(identifier.Revision));
		identifierEle.ele(getIDXTagName(IDXFoundationTag.Sequence)).txt(toString(identifier.Sequence));
	}

	/** 构建项目对象名称 */
	private buildItemEDMName(targetEle: XMLBuilder, edaName?: EDMName) {
		if (!targetEle || !edaName) {
			return;
		}
		const packageNameEle = targetEle.ele(getIDXTagName(IDXPDMTag.PackageName));
		packageNameEle.ele(getIDXTagName(IDXFoundationTag.SystemScope)).txt(edaName.SystemScope);
		packageNameEle.ele(getIDXTagName(IDXFoundationTag.ObjectName)).txt(edaName.ObjectName);
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
			const pinEle = targetEle.ele(getIDXTagName(IDXPDMTag.PackagePin), pinAttrs);
			pinEle.ele(getIDXTagName(IDXD2Tag.Point)).txt(pin.Point);

			const pinShape = pin.Shape;
			if (pinShape) {
				pinEle.ele(getIDXTagName(IDXPDMTag.Shape)).txt(
					pinShape
				);
			}
		});
	}

	/** 构建自定义属性 */
	private buildItemBaseLine(targetEle: XMLBuilder, baseLine?: boolean) {
		if (targetEle && isValidBool(baseLine)) {
			const baseLineEle = targetEle.ele(getIDXTagName(IDXPDMTag.BaseLine));
			baseLineEle.ele(IDXPropertyTag.Value).txt(toString(baseLine));
		}
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
		const userPropTagName = getIDXTagName(IDXPropertyTag.EDMDUserSimpleProperty);

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

		const isPersistent = userProp.Persistent;
		if (isValidBool(isPersistent)) {
			userPropAttrs['Persistent'] = toString(isPersistent);
		}

		const isOriginator = userProp.IsOriginator;
		if (isValidBool(isOriginator)) {
			userPropAttrs['IsOriginator'] = toString(isOriginator);
		}

		const userPropEle = targetEle.ele(userPropTagName, userPropAttrs);

		// ## 构建键
		this.buildItemEDMName(userPropEle, userProp.Key);

		// ## 构建值
		userPropEle.ele(getIDXTagName(IDXPropertyTag.Value)).txt(toString(userProp.Value));
	}

	/** 构建项目定义（Item single） */
	private buildItemSingle(itemSingle: EDMDItemSingle) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) return;

		// # 构建节点
		const itemTagName = getIDXTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const itemSingleAttrs: Record<string, string> = {
			...this.buildBasicAttr,
		};

		const itemSingleEle = bodyEle.ele(itemTagName, itemSingleAttrs);

		// ## 构建基础数据
		this.buildBasicData(itemSingleEle, itemSingle);

		// ## 构建项目类型（必须为single）
		itemSingleEle.ele(getIDXTagName(IDXPDMTag.ItemType)).txt(itemSingle.ItemType);

		// ## 构建标识符（可选）
		this.buildItemIdentifier(itemSingleEle, itemSingle.Identifier);

		// ## 构建包名称（可选）
		this.buildItemEDMName(itemSingleEle, itemSingle.PackageName);

		// ## 构建形状引用
		itemSingleEle.ele(getIDXTagName(IDXPDMTag.Shape)).txt(itemSingle.Shape);

		// ## 构建包引脚定义（可选）
		this.buildItemPackagePins(itemSingleEle, itemSingle.PackagePins);

		// ## 构建3D模型引用（可选）
		const model3D = itemSingle.EDMD3DModel;
		if (model3D) {
			itemSingleEle.ele(getIDXTagName(IDXPDMTag.EDMD3DModel)).txt(model3D);
		}

		// ## 构建基线标记（可选）
		this.buildItemBaseLine(itemSingleEle, itemSingle.BaseLine);

		// ## 构建用户属性（可选）
		this.buildUserProperties(itemSingleEle, itemSingle.UserProperties);
	}

	/** 批量构建项目实例（Item assembly） */
	private buildItemsAssembly() {
		const itemsAssembly = this.dataset?.Body?.ItemsAssembly;
		const bodyEle = this.bodyEle;
		if (!itemsAssembly || !bodyEle || itemsAssembly.length === 0) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

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
		const itemTagName = getIDXTagName(IDXFoundationTag.Item);

		// ## 构建属性
		const itemAttrs: Record<string, string> = {
			...this.buildBasicAttr(itemAssembly),
		};
		// ### 构建几何类型属性（简化方式的关键）
		if (itemAssembly.geometryType) {
			itemAttrs['geometryType'] = itemAssembly.geometryType;
		}

		const itemAssemblyEle = bodyEle.ele(itemTagName, itemAttrs);

		// ## 构建基础数据
		this.buildBasicData(itemAssemblyEle, itemAssembly);

		// ## 构建项目类型（必须为assembly）
		itemAssemblyEle.ele(getIDXTagName(IDXPDMTag.ItemType)).txt(itemAssembly.ItemType);

		// ## 构建标识符（可选）
		this.buildItemIdentifier(itemAssemblyEle, itemAssembly.Identifier);

		// ## 构建项目实例列表
		iterateArr(itemAssembly.ItemInstances, (instance: EDMDItemInstance) => {
			this.buildItemInstance(itemAssemblyEle, instance);
		});

		// ## 构建装配到名称（用于相对定位）
		const assembleToName = itemAssembly.AssembleToName;
		if (assembleToName) {
			itemAssemblyEle.ele(getIDXTagName(IDXPDMTag.AssembleToName)).txt(
				assembleToName
			);
		}

		// ## 构建参考名称（可选）
		const referenceName = itemAssembly.ReferenceName;
		if (referenceName) {
			itemAssemblyEle.ele(getIDXTagName(IDXPDMTag.ReferenceName)).txt(
				referenceName
			);
		}

		// ## 构建基线标记（可选）
		this.buildItemBaseLine(itemAssemblyEle, itemAssembly.BaseLine);

		// ## 构建用户属性（可选）
		this.buildUserProperties(itemAssemblyEle, itemAssembly.UserProperties);

		// ## 构建角色信息（可选）
		// TODO: 实现角色信息构建
	}

	/** 构建项目实例 */
	private buildItemInstance(itemAssemblyEle: XMLBuilder, itemInstance: EDMDItemInstance) {
		if (!itemAssemblyEle) {
			return;
		}

		// # 构建节点
		const instanceTagName = getIDXTagName(IDXPDMTag.ItemInstance);

		// ## 构建属性
		const instanceAttrs: Record<string, string> = {
			...this.buildBasicAttr(itemInstance),
		};

		const instanceEle = itemAssemblyEle.ele(instanceTagName, instanceAttrs);

		// ## 构建基础数据
		this.buildBasicData(instanceEle, itemInstance);

		// ## 构建变换矩阵
		this.buildTransformation(instanceEle, itemInstance.Transformation);

		// ## 构建Z轴偏移（IDXv4.0+）
		const zOffset = itemInstance.zOffset;
		if (isValidNumber(zOffset)) {
			instanceEle.att('zOffset', toString(zOffset));
		}

		// ## 构建弯曲序列号（用于柔性板）
		const bendSequenceNumber = itemInstance.bendSequenceNumber;
		if (isValidNumber(bendSequenceNumber)) {
			instanceEle.att('bendSequenceNumber', toString(bendSequenceNumber));
		}

		// ## 构建引用的项目定义
		instanceEle.ele(getIDXTagName(IDXPDMTag.Item, IDXNameSpace.PDM)).txt(itemInstance.Item);

		// ## 构建用户属性（可选）
		this.buildUserProperties(instanceEle, itemInstance.UserProperties);

		// ## 构建实例用户区域层名称（用于Other Outline映射）
		this.buildItemEDMName(instanceEle, itemInstance.InstanceUserAreaLayerName);
	}

	/** 构建变换矩阵 */
	private buildTransformation(instanceEle: XMLBuilder, transformation?: EDMDTransformation) {
		if (!instanceEle || !transformation) {
			return;
		}

		// # 构建节点
		const transformationEle = instanceEle.ele(getIDXTagName(IDXPDMTag.Transformation));

		// ## 构建变换类型
		transformationEle.ele(getIDXTagName(IDXPDMTag.TransformationType)).txt(
			transformation.TransformationType
		);

		if (transformation.TransformationType === 'd2') {
			// ## 构建 2D 变换
			const d2 = transformation;
			transformationEle.ele(getIDXTagName(IDXPDMTag.XX)).txt(toString(d2.xx));
			transformationEle.ele(getIDXTagName(IDXPDMTag.XY)).txt(toString(d2.xy));
			transformationEle.ele(getIDXTagName(IDXPDMTag.YX)).txt(toString(d2.yx));
			transformationEle.ele(getIDXTagName(IDXPDMTag.YY)).txt(toString(d2.yy));

			// 平移分量使用 property:Value 包装
			const txEle = transformationEle.ele(getIDXTagName(IDXPDMTag.TX));
			txEle.ele(IDXPropertyTag.Value).txt(toString(d2.tx));

			const tyEle = transformationEle.ele(getIDXTagName(IDXPDMTag.TY));
			tyEle.ele(IDXPropertyTag.Value).txt(toString(d2.ty));
		} else {
			// ## 构建 3D 变换
			const d3 = transformation;
			transformationEle.ele(getIDXTagName(IDXPDMTag.XX)).txt(toString(d3.xx));
			transformationEle.ele(getIDXTagName(IDXPDMTag.XY)).txt(toString(d3.xy));
			transformationEle.ele(getIDXTagName(IDXPDMTag.XZ)).txt(toString(d3.xz));
			transformationEle.ele(getIDXTagName(IDXPDMTag.YX)).txt(toString(d3.yx));
			transformationEle.ele(getIDXTagName(IDXPDMTag.YY)).txt(toString(d3.yy));
			transformationEle.ele(getIDXTagName(IDXPDMTag.YZ)).txt(toString(d3.yz));
			transformationEle.ele(getIDXTagName(IDXPDMTag.ZX)).txt(toString(d3.zx));
			transformationEle.ele(getIDXTagName(IDXPDMTag.ZY)).txt(toString(d3.zy));
			transformationEle.ele(getIDXTagName(IDXPDMTag.ZZ)).txt(toString(d3.zz));

			// 平移分量使用 property:Value 包装
			const txEle = transformationEle.ele(getIDXTagName(IDXPDMTag.TX));
			txEle.ele(IDXPropertyTag.Value).txt(toString(d3.tx));

			const tyEle = transformationEle.ele(getIDXTagName(IDXPDMTag.TY));
			tyEle.ele(IDXPropertyTag.Value).txt(toString(d3.ty));

			const tzEle = transformationEle.ele(getIDXTagName(IDXPDMTag.TZ));
			tzEle.ele(IDXPropertyTag.Value).txt(toString(d3.tz));
		}
	}

	/** 构建处理指令 */
	private buildProcessInstruction() {
		const dataset = this.dataset;
		const datasetEle = this.datasetEle;
		if (!dataset || !datasetEle) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

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
		const instructionTagName = getIDXTagName(IDXFoundationTag.ProcessInstruction);
		const instructionType = ProcessInstruction.type;
		const instructionXsiType = getIDXTagName(instructionType);
		const instructionAttrs: Record<string, string> = {
			[XsiTypeAttrName]: instructionXsiType,
		};
		const instructionEle = datasetEle.ele(instructionTagName, instructionAttrs);

		// ## 添加执行者
		const actor = ProcessInstruction.Actor;
		if (actor) {
			instructionEle.ele(getIDXTagName(IDXComputationalTag.Actor)).txt(actor);
		}

		if (instructionType == IDXComputationalTag.SendInformation) {
			// ## 添加基线相关数据
			const description = ProcessInstruction.Description;
			if (description) {
				instructionEle.ele(
					getIDXTagName(
						IDXFoundationTag.Description
					)
				).txt(description);
			}
		} else if (instructionType == IDXComputationalTag.SendChanges) {
			// ## 添加变更相关数据
			// TODO: 实现变更相关数据
		} else {
			// ## 添加请求相关数据
			// TODO: 实现请求相关数据
		}
	}

	/** 批量构建历史记录 */
	private buildHistories() {
		const Histories = this.dataset?.Body?.Histories;
		const bodyEle = this.bodyEle;
		if (!Histories || !bodyEle || Histories.length === 0) {
			return;
		}

		const config = this.config;
		const enableComments = config.enableComments;

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

		// TODO: 实现历史记录构建
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

	// ============= 私有化工具函数 =============
	/** 创建分区节点注释 */
	private createSectionComment(sectionName: string, sectionDesc?: string) {
		const sectionDescFull = sectionDesc ? `: ${sectionDesc}` : '';
		return `=============${sectionName}${sectionDescFull}=============`;
	}
}
