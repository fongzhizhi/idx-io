import { create } from 'xmlbuilder2';
import { CartesianPoint, EDMDDataSet } from '../../types/core';
import { XMLBuilder, XMLWriterOptions } from 'xmlbuilder2/lib/interfaces';
import { IDXWriteConfig } from '../../types/exporter/writer/idx-writer.interface';
import { DefaultIDXWriteConfig } from './config/idx-writer.config';
import { hasOwnProperty, iterateObject, toBoolean, toString } from '../../utils/object.utils';
import { getIDXTagName, isIDXNameSpace, XsiTypeAttrName } from '../../core/utils/idx-namespace.utils';
import { IDXComputationalTag, IDXD2Tag, IDXFoundationTag, IDXNameSpaceLinks, IDXPropertyTag, IDXXSITag } from '../../types/core/namespace.types';
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

	/** 内存回收 */
	private memoryCycle() {
		this.dataset = undefined;
		this.doc = undefined;
		this.datasetEle = undefined;
		this.bodyEle = undefined;
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
		this.buildEDMDDAtaSet();

		// ## 构建 HEADER
		this.buildHeader();

		// ## 构建 Body
		this.buildBody();

		// ## 构建 ProcessInstruction
		this.buildProcessInstruction();

		// ## 构建历史记录
		this.buildHistory();
	}

	/** 构建 EDMDDataSet */
	private buildEDMDDAtaSet() {
		const doc = this.doc;
		if (!doc) {
			return;
		}
		const namespaces = this.config.namespaces;

		const dataSetTagName = getIDXTagName(IDXFoundationTag.EDMDDataSet);
		const dataSetNameSpaces = IDXNameSpaceLinks;

		// # 创建节点
		const datasetEle = doc.ele(dataSetTagName, dataSetNameSpaces);

		// # 添加自定义命名空间
		iterateObject(namespaces, (url, nameSapce) => {
			if (isIDXNameSpace(nameSapce)) {
				// WARN: 自定义命名空间与官方命名空间重名
				return;
			}
			// TODO: 检测 url 的合法性
			doc.att(nameSapce, url);
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

		// # 创建节点
		if (enableComments) {
			const headerComment = this.createSectionComment(
				'文件头',
				'提供文件元数据和全局上下文'
			);
			datasetEle.com(headerComment);
		}
		const headerTagName = getIDXTagName(IDXFoundationTag.Header);
		const headerAttrs: Record<string, string> = {
			[XsiTypeAttrName]: headerTagName,
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

		// # 创建节点
		if (enableComments) {
			const bodyComment = this.createSectionComment(
				'数据体',
				'具体的EDMD交换数据, 如板子、层堆叠、元件、孔、禁止区等'
			);
			datasetEle.com(bodyComment);
		}
		const bodyTagName = getIDXTagName(IDXFoundationTag.Body);
		const bodyEle = datasetEle.ele(bodyTagName);
		this.bodyEle = bodyEle;

		// # 构建数据体
		// TODO: 根据层次, 依次构建：坐标点、几何、曲线集、形状元素、项目用途、项目定义、项目实例
		this.buildbuildCartesianPoints();
		// TODO: ...
	}

	/** 批量构建坐标点 */
	private buildbuildCartesianPoints() {
		const Points = this.dataset?.Body?.Points;
		const bodyEle = this.bodyEle;
		if (!Points || !bodyEle) {
			return;
		}
		const config = this.config;
		const enableComments = config.enableComments;

		if (enableComments) {
			const geometricComment = this.createSectionComment('坐标点', '几何坐标点');
			bodyEle.com(geometricComment);
		}

		iterateArr(Points, points => {
			this.buildCartesianPoint(points);
		});
	}

	/** 构建坐标点 */
	private buildCartesianPoint(point: CartesianPoint) {
		const bodyEle = this.bodyEle;
		if (!bodyEle) {
			return;
		}

		// # 创建节点
		const pointTagName = getIDXTagName(IDXFoundationTag.CartesianPoint);
		const pointAttrs: Record<string, string> = {
			id: point.id,
			XsiTypeAttrName: getIDXTagName(IDXD2Tag.EDMDCartesianPoint),
		};
		const pointEle = bodyEle.ele(pointTagName, pointAttrs);

		// # 创建坐标
		const xEle = pointEle.ele(getIDXTagName(IDXD2Tag.X));
		xEle.ele(IDXPropertyTag.Value).txt(toString(point.X));

		const yEle = pointEle.ele(getIDXTagName(IDXD2Tag.Y));
		yEle.ele(IDXPropertyTag.Value).txt(toString(point.Y));

		if (isValidNumber(point.Z)) {
			const zEle = pointEle.ele(getIDXTagName(IDXD2Tag.Z));
			zEle.ele(IDXPropertyTag.Value).txt(toString(point.Z));
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

		// # 创建节点
		const ProcessInstruction = dataset.ProcessInstruction;
		if (enableComments) {
			const instructionComment = this.createSectionComment(
				'处理指令',
				'文件的类型和意图'
			);
			datasetEle.com(instructionComment);
		}
		const instructionTagName = getIDXTagName(IDXFoundationTag.ProcessInstruction);
		const instructionXsiType = getIDXTagName(IDXComputationalTag.SendInformation); // TODO: 根据EDMDProcessInstruction类型调整
		const instructionAttrs: Record<string, string> = {
			[XsiTypeAttrName]: instructionXsiType,
		};
		datasetEle.ele(instructionTagName, instructionAttrs);
	}

	/** 构建历史记录 */
	private buildHistory() {
		// TODO: 暂不支持
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
			prettyPrint: prettyPrint,
		};

		return doc.end(idxWriterOpts);
	}

	// ============= 私有化工具函数 =============
	/** 创建分区节点注释 */
	private createSectionComment(sectionName: string, sectionDesc?: string) {
		const sectionDescFull = sectionDesc ? `: ${sectionDesc}` : '';
		return `=============${sectionName}${sectionDescFull}=============`;
	}
}
