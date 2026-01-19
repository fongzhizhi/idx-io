import {
	IDXNameSpace,
	IDXFoundationTag,
	IDXPDMTag,
	IDXD2Tag,
	IDXPropertyTag,
	IDXComputationalTag,
	IDXAdministrationTag,
	IDXTag,
	IDXXSITag,
} from '../../types/core/namespace.types';
import { hasOwnProperty } from '../../utils/object.utils';

// ------------ 数据缓存 ------------
const IDXFoundationTagSet = new Set(Object.values(IDXFoundationTag));
const IDXPDMTagSet = new Set(Object.values(IDXPDMTag));
const IDXD2TagSet = new Set(Object.values(IDXD2Tag));
const IDXPropertyTagSet = new Set(Object.values(IDXPropertyTag));
const IDXComputationalTagSet = new Set(Object.values(IDXComputationalTag));
const IDXAdministrationTagSet = new Set(Object.values(IDXAdministrationTag));
const IDXXSITagSet = new Set(Object.values(IDXXSITag));

/** XSI类型属性名 */
export const XsiTypeAttrName = getIDXTagName(IDXXSITag.type);

/**
 * 创建命名空间标签
 * @param tag 标签名（不带命名空间前缀）
 * @param nameSpace 命名空间前缀，可选
 * @returns 完整的命名空间标签（如 "foundation:EDMDDataSet"）
 */
export function createNameSpaceTag(tag: string, nameSpace?: string): string {
	return nameSpace ? `${nameSpace}:${tag}` : tag;
}

/**
 * 获取 IDX 标签的完整命名空间标签
 * @param tagName 标签枚举值
 * @returns 完整的命名空间标签字符串
 */
export function getIDXTagName(tagName: IDXTag): string {
	const nameSpace = getIDXNamespaceForTag(tagName);
	return createNameSpaceTag(tagName, nameSpace);
}

/**
 * 根据 IDX 标签获取对应的命名空间前缀
 * @param tag 标签枚举值
 * @returns 对应的命名空间前缀
 */
function getIDXNamespaceForTag(tag: IDXTag): IDXNameSpace {
	// # 检查标签属于哪个命名空间的枚举
	// WARN: 如果标签命名重复, 会判断失败
	if (IDXFoundationTagSet.has(tag as IDXFoundationTag)) {
		return IDXNameSpace.Foundation;
	}
	if (IDXPDMTagSet.has(tag as IDXPDMTag)) {
		return IDXNameSpace.PDM;
	}
	if (IDXD2TagSet.has(tag as IDXD2Tag)) {
		return IDXNameSpace.D2;
	}
	if (IDXPropertyTagSet.has(tag as IDXPropertyTag)) {
		return IDXNameSpace.Property;
	}
	if (IDXComputationalTagSet.has(tag as IDXComputationalTag)) {
		return IDXNameSpace.Computational;
	}
	if (IDXAdministrationTagSet.has(tag as IDXAdministrationTag)) {
		return IDXNameSpace.Administration;
	}
	if (IDXXSITagSet.has(tag as IDXXSITag)) {
		return IDXNameSpace.XSI;
	}

	// # 默认返回 Foundation 命名空间
	return IDXNameSpace.Foundation;
}

/** 是否为 IDX 官方命名空间 */
export function isIDXNameSpace(namesapce: string) {
	return hasOwnProperty(IDXNameSpace, namesapce);
}
