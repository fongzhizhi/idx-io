import {
	IDXFoundationTag,
	IDXNameSpace,
	IDXPropertyTag,
	IDXTag,
	IDXXSITag,
	IDXPDMTag,
	IDXD2Tag,
	IDXComputationalTag,
	IDXAdministrationTag,
} from '../../types/edmd/namespace.types';
import { hasOwnProperty } from '../../utils/object.utils';

// ============= 缓存一些使用频率较高的标签名 =============
/** XML类型声明属性名 */
export const XsiTypeAttrName = getIDXXSITagName(IDXXSITag.type);
/** 属性变更属性名 */
export const PropAttrChanedAttrName = getIDXPropertyTagName(IDXPropertyTag.IsAttributeChanged);
/** 属性值标签名 */
export const PropValueAttrName = getIDXPropertyTagName(IDXPropertyTag.Value);

// ============= 工具函数 =============
/**
 * 创建命名空间标签
 * @param tag 标签名（不带命名空间前缀）
 * @param nameSpace 命名空间前缀，可选
 * @returns 完整的命名空间标签（如 "foundation:EDMDDataSet"）
 */
export function createNameSpaceTag(tag: string, nameSpace?: string): string {
	return nameSpace ? `${nameSpace}:${tag}` : tag;
}

/** 创建XML命名空间标签 */
export function createXmlNameSpaceTag(tagName: string) {
	return createNameSpaceTag(tagName, 'xmlns');
}

/**
 * 获取 IDX 标签的完整命名空间标签
 * @param tagName 标签枚举值
 * @param nameSpace 命名空间（必选, 明确指定，避免标签重复导致的命名空间冲突）
 * @returns 完整的命名空间标签字符串
 */
export function getIDXTagName(tagName: IDXTag, nameSpace: IDXNameSpace): string {
	return createNameSpaceTag(tagName, nameSpace);
}

/** 获取IDX-Foundation完整命名空间标签 */
export function getIDXFoundationTagName(tagName: IDXFoundationTag) {
	return getIDXTagName(tagName, IDXNameSpace.Foundation);
}

/** 获取IDX-PDM完整命名空间标签 */
export function getIDXPDMTagName(tagName: IDXPDMTag) {
	return getIDXTagName(tagName, IDXNameSpace.PDM);
}

/** 获取IDX-D2完整命名空间标签 */
export function getIDXD2TagName(tagName: IDXD2Tag) {
	return getIDXTagName(tagName, IDXNameSpace.D2);
}

/** 获取IDX-Property完整命名空间标签 */
export function getIDXPropertyTagName(tagName: IDXPropertyTag) {
	return getIDXTagName(tagName, IDXNameSpace.Property);
}

/** 获取IDX-XSI完整命名空间标签 */
export function getIDXXSITagName(tagName: IDXXSITag) {
	return getIDXTagName(tagName, IDXNameSpace.XSI);
}

/** 获取IDX-Computational完整命名空间标签 */
export function getIDXComputationalTagName(tagName: IDXComputationalTag) {
	return getIDXTagName(tagName, IDXNameSpace.Computational);
}

/** 获取IDX-Administration完整命名空间标签 */
export function getIDXAdministrationTagName(tagName: IDXAdministrationTag) {
	return getIDXTagName(tagName, IDXNameSpace.Administration);
}

/** 是否为 IDX 官方命名空间 */
export function isIDXNameSpace(namesapce: string) {
	return hasOwnProperty(IDXNameSpace, namesapce);
}
