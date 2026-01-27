#!/usr/bin/env ts-node

/**
 * 案例4：过孔
 * 
 * 演示过孔和盲埋孔的建模方式，展示过孔和盲埋孔相关数据在IDX中的结构
 * 
 * 案例说明：继承案例2，四层板，项目有：
 * 1. 通孔（过孔）：贯穿整个板子
 * 2. 盲孔：内层1到顶层
 * 3. 埋孔：内层1到内层2
 */

import { IDXExporter } from '../src/exporter';
import { ECADData, ECADLayerType, ECADHole, ECADHoleType } from '../src/types/ecad/ecad.interface';
import { GlobalUnit } from '../src/types/edmd/base.types';
import { Vector2 } from '../src/libs/geometry/Vector2';
import { createRectangleGeometry, createCircleGeometry } from './utils/geometry-utils';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('============================================================');
console.log('案例04：vias');
console.log('描述：演示过孔和盲埋孔的建模方式，展示过孔和盲埋孔相关数据在IDX中的结构');
console.log('============================================================');

// 创建四层板结构（复用案例2的层结构）
function createFourLayerBoard(stackupId: string) {
	return {
		name: 'Four Layer Board with Vias',
		description: 'A four-layer PCB with various via types',
		outline: createRectangleGeometry(100, 80), // 100mm x 80mm
		thickness: 1.74, // 总厚度1.74mm
		stackupId: stackupId
	};
}

function createFourLayerStackup() {
	return {
		id: 'MAIN_STACKUP',
		name: 'Main Layer Stackup',
		description: 'Four layer stackup with dielectric layers',
		layerIds: ['TOP', 'DIELECTRIC1', 'INNER1', 'DIELECTRIC2', 'INNER2', 'DIELECTRIC3', 'BOTTOM']
	};
}

// 创建过孔
const throughVia: ECADHole = {
	name: 'VIA_THROUGH_1',
	description: 'Through via connecting all layers',
	geometry: createCircleGeometry(0.3), // 直径0.3mm
	type: ECADHoleType.VIA,
	// 使用层堆叠方式定义跨度（贯穿整个板子）
	stackupId: 'MAIN_STACKUP',
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'THROUGH' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.2' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'FINISHED_SIZE' }, Value: '0.3' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'PLATED' }, Value: 'YES' }
	]
};

const blindVia: ECADHole = {
	name: 'VIA_BLIND_1',
	description: 'Blind via from top layer to inner layer 1',
	geometry: createCircleGeometry(0.25), // 直径0.25mm
	type: ECADHoleType.BLIND,
	// 使用层跨度方式定义（从顶层到内层1）
	layerSpan: {
		startLayer: 'TOP',
		endLayer: 'INNER1'
	},
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'BLIND' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.15' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'FINISHED_SIZE' }, Value: '0.25' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'PLATED' }, Value: 'YES' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'START_LAYER' }, Value: 'TOP' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'END_LAYER' }, Value: 'INNER1' }
	]
};

const buriedVia: ECADHole = {
	name: 'VIA_BURIED_1',
	description: 'Buried via between inner layers',
	geometry: createCircleGeometry(0.2), // 直径0.2mm
	type: ECADHoleType.BURIED,
	// 使用层跨度方式定义（内层1到内层2）
	layerSpan: {
		startLayer: 'INNER1',
		endLayer: 'INNER2'
	},
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'BURIED' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'FINISHED_SIZE' }, Value: '0.2' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'PLATED' }, Value: 'YES' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'START_LAYER' }, Value: 'INNER1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'END_LAYER' }, Value: 'INNER2' }
	]
};

// 创建一些额外的过孔实例，展示不同位置
const additionalVias: ECADHole[] = [
	{
		name: 'VIA_THROUGH_2',
		description: 'Second through via',
		geometry: createCircleGeometry(0.3), // 直径0.3mm
		type: ECADHoleType.VIA,
		stackupId: 'MAIN_STACKUP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'THROUGH' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.2' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'FINISHED_SIZE' }, Value: '0.3' }
		]
	},
	{
		name: 'VIA_THROUGH_3',
		description: 'Third through via',
		geometry: createCircleGeometry(0.4), // 直径0.4mm（较大的过孔）
		type: ECADHoleType.VIA,
		stackupId: 'MAIN_STACKUP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'THROUGH' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.3' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'FINISHED_SIZE' }, Value: '0.4' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'POWER' }
		]
	}
];

// 构建完整的ECAD数据
const ecadData: ECADData = {
	metadata: {
		designName: 'Vias Example',
		revision: '1.0',
		description: '案例4：过孔 - 四层板（总厚度1.74mm）',
		creator: {
			name: 'IDX Example',
			company: 'Example Company',
			system: 'IDX Builder',
			version: '1.0.0'
		},
		timestamps: {
			created: new Date().toISOString(),
			modified: new Date().toISOString()
		},
		globalUnit: GlobalUnit.UNIT_MM
	},
	layers: {
		'TOP': {
			id: 'TOP',
			name: 'Top Layer',
			type: ECADLayerType.SIGNAL,
			thickness: 0.035,
			material: 'Copper'
		},
		'INNER1': {
			id: 'INNER1',
			name: 'Inner Layer 1',
			type: ECADLayerType.POWER_GROUND,
			thickness: 0.035,
			material: 'Copper'
		},
		'INNER2': {
			id: 'INNER2',
			name: 'Inner Layer 2',
			type: ECADLayerType.POWER_GROUND,
			thickness: 0.035,
			material: 'Copper'
		},
		'BOTTOM': {
			id: 'BOTTOM',
			name: 'Bottom Layer',
			type: ECADLayerType.SIGNAL,
			thickness: 0.035,
			material: 'Copper'
		},
		'DIELECTRIC1': {
			id: 'DIELECTRIC1',
			name: 'Dielectric 1',
			type: ECADLayerType.DIELECTRIC,
			thickness: 0.2,
			material: 'FR4'
		},
		'DIELECTRIC2': {
			id: 'DIELECTRIC2',
			name: 'Dielectric 2',
			type: ECADLayerType.DIELECTRIC,
			thickness: 1.2,
			material: 'FR4'
		},
		'DIELECTRIC3': {
			id: 'DIELECTRIC3',
			name: 'Dielectric 3',
			type: ECADLayerType.DIELECTRIC,
			thickness: 0.2,
			material: 'FR4'
		}
	},
	stackups: {
		'MAIN_STACKUP': createFourLayerStackup()
	},
	board: createFourLayerBoard('MAIN_STACKUP'),
	models: {},
	footprints: {},
	components: [],
	holes: [throughVia, blindVia, buriedVia, ...additionalVias],
	constraints: []
};

// 运行示例
function runExample(name: string, data: ECADData) {
	console.log(`=== 案例${name.split('.')[0]}：${name.split('.')[1]} ===`);
	
	console.log('生成传统建模方式...');
	// 创建传统建模导出器
	const traditionalExporter = new IDXExporter({
		output: {
			designName: data.metadata.designName
		},
		collaboration: {
			creatorSystem: data.metadata.creator.system,
			creatorCompany: data.metadata.creator.company
		},
		validation: {
			enabled: false
		},
		buildConfig: {
			useSimplified: false,
			unit: data.metadata.globalUnit,
			precision: 3,
			includeNonCollaborative: false,
			includeHistory: false,
			systemScope: 'ECADSYSTEM'
		}
	});
	
	const traditionalResult = traditionalExporter.export(data);
	const traditionalPath = resolve(__dirname, 'outputs', `${name}.trad.idx`);
	writeFileSync(traditionalPath, traditionalResult.file.source!);
	
	console.log('生成简化建模方式...');
	// 创建简化建模导出器
	const simplifiedExporter = new IDXExporter({
		output: {
			designName: data.metadata.designName
		},
		collaboration: {
			creatorSystem: data.metadata.creator.system,
			creatorCompany: data.metadata.creator.company
		},
		validation: {
			enabled: false
		},
		buildConfig: {
			useSimplified: true,
			unit: data.metadata.globalUnit,
			precision: 3,
			includeNonCollaborative: false,
			includeHistory: false,
			systemScope: 'ECADSYSTEM'
		}
	});
	
	const simplifiedResult = simplifiedExporter.export(data);
	const simplifiedPath = resolve(__dirname, 'outputs', `${name}.simp.idx`);
	writeFileSync(simplifiedPath, simplifiedResult.file.source!);
	
	console.log(`✓ 传统建模文件已生成: ${traditionalPath}`);
	console.log(`✓ 简化建模文件已生成: ${simplifiedPath}`);
	
	// 显示文件信息
	const traditionalSize = Buffer.byteLength(traditionalResult.file.source!, 'utf8');
	const simplifiedSize = Buffer.byteLength(simplifiedResult.file.source!, 'utf8');
	
	console.log('');
	console.log('文件信息:');
	console.log(`传统建模文件大小: ${traditionalSize} bytes`);
	console.log(`简化建模文件大小: ${simplifiedSize} bytes`);
	
	// 显示预览
	console.log('');
	console.log('=== 传统建模方式预览 ===');
	console.log(traditionalResult.file.source!.substring(0, 500) + '...');
	
	console.log('');
	console.log('=== 简化建模方式预览 ===');
	console.log(simplifiedResult.file.source!.substring(0, 500) + '...');
	
	console.log('');
	console.log(`🎉 案例${name.split('.')[0]}：${name.split('.')[1]}执行完成！`);
	console.log('');
}

runExample('04.vias', ecadData);