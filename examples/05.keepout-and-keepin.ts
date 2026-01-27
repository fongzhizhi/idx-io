#!/usr/bin/env ts-node

/**
 * 案例5：禁止区和保留区域
 * 
 * 演示禁止区和保留区域的建模方式，展示禁止区和保留区相关数据在IDX中的结构
 * 
 * 案例说明：继承案例2，四层板，项目有：
 * 1. 矩形禁止区：禁止元件
 * 2. 多边形保留区：保留元件
 */

import { IDXExporter } from '../src/exporter';
import { ECADData, ECADLayerType, ECADConstraintArea, ECADConstraintPurpose } from '../src/types/ecad/ecad.interface';
import { GlobalUnit } from '../src/types/edmd/base.types';
import { Vector2 } from '../src/libs/geometry/Vector2';
import { createRectangleGeometry, createPolygonalKeepin } from './utils/geometry-utils';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('============================================================');
console.log('案例05：keepout-and-keepin');
console.log('描述：演示禁止区和保留区域的建模方式，展示禁止区和保留区相关数据在IDX中的结构');
console.log('============================================================');

// 创建四层板结构（复用案例2的层结构）
function createFourLayerBoard(stackupId: string) {
	return {
		name: 'Four Layer Board with Constraints',
		description: 'A four-layer PCB with keepout and keepin areas',
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

// 创建矩形禁止区：禁止元件放置
const componentKeepout: ECADConstraintArea = {
	name: 'COMPONENT_KEEPOUT_1',
	description: 'Rectangular keepout area for components',
	type: 'KEEPOUT',
	purpose: 'COMPONENT',
	geometry: createRectangleGeometry(20, 15), // 20mm x 15mm 矩形禁止区
	layerId: 'TOP', // 应用于顶层
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'COMPONENT_KEEPOUT' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'COMPONENT_KEEPOUT_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'LAYER' }, Value: 'TOP' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'No component placement allowed' }
	]
};

// 创建布线禁止区
const routingKeepout: ECADConstraintArea = {
	name: 'ROUTING_KEEPOUT_1',
	description: 'Rectangular keepout area for routing',
	type: 'KEEPOUT',
	purpose: 'ROUTE',
	geometry: createRectangleGeometry(15, 10), // 15mm x 10mm 矩形禁止区
	layerId: 'INNER1', // 应用于内层1
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'ROUTING_KEEPOUT' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'ROUTING_KEEPOUT_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'LAYER' }, Value: 'INNER1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'No routing allowed' }
	]
};

// 创建过孔禁止区
const viaKeepout: ECADConstraintArea = {
	name: 'VIA_KEEPOUT_1',
	description: 'Circular keepout area for vias',
	type: 'KEEPOUT',
	purpose: 'VIA',
	geometry: createRectangleGeometry(8, 8), // 8mm x 8mm 正方形禁止区
	layerId: 'BOTTOM', // 应用于底层
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'VIA_KEEPOUT' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'VIA_KEEPOUT_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'LAYER' }, Value: 'BOTTOM' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'No via placement allowed' }
	]
};

// 创建多边形保留区：保留元件
const componentKeepin: ECADConstraintArea = {
	name: 'COMPONENT_KEEPIN_1',
	description: 'Polygonal keepin area for components',
	type: 'KEEPIN',
	purpose: 'COMPONENT',
	// 创建一个六边形保留区
	geometry: createPolygonalKeepin([
		new Vector2(30, 10),  // 起始点
		new Vector2(40, 15),  // 右上
		new Vector2(40, 25),  // 右下
		new Vector2(30, 30),  // 底部
		new Vector2(20, 25),  // 左下
		new Vector2(20, 15)   // 左上
	]),
	layerId: 'TOP', // 应用于顶层
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'COMPONENT_KEEPIN' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'COMPONENT_KEEPIN_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'LAYER' }, Value: 'TOP' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'Components must be placed within this area' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'SHAPE_TYPE' }, Value: 'POLYGON' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VERTEX_COUNT' }, Value: '6' }
	]
};

// 创建测试点保留区
const testpointKeepin: ECADConstraintArea = {
	name: 'TESTPOINT_KEEPIN_1',
	description: 'Rectangular keepin area for test points',
	type: 'KEEPIN',
	purpose: 'TESTPOINT',
	geometry: createRectangleGeometry(25, 12), // 25mm x 12mm 矩形保留区
	layerId: 'BOTTOM', // 应用于底层
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'TESTPOINT_KEEPIN' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'TESTPOINT_KEEPIN_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'LAYER' }, Value: 'BOTTOM' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'Test points must be placed within this area' }
	]
};

// 创建热约束区域
const thermalConstraint: ECADConstraintArea = {
	name: 'THERMAL_CONSTRAINT_1',
	description: 'Thermal constraint area',
	type: 'KEEPOUT',
	purpose: 'THERMAL',
	geometry: createRectangleGeometry(18, 18), // 18mm x 18mm 正方形热约束区
	// 不指定layerId，表示应用于所有层
	zRange: {
		lowerBound: 0,
		upperBound: 1.74 // 整个板厚范围
	},
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'THERMAL_CONSTRAINT' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'AREA_NAME' }, Value: 'THERMAL_CONSTRAINT_1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESCRIPTION' }, Value: 'High temperature area - special thermal management required' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'MAX_TEMPERATURE' }, Value: '85' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'THERMAL_ZONE' }, Value: 'HOT_ZONE' }
	]
};

// 构建完整的ECAD数据
const ecadData: ECADData = {
	metadata: {
		designName: 'Keepout and Keepin Example',
		revision: '1.0',
		description: '案例5：禁止区和保留区域 - 四层板（总厚度1.74mm）',
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
	holes: [],
	constraints: [
		componentKeepout,
		routingKeepout,
		viaKeepout,
		componentKeepin,
		testpointKeepin,
		thermalConstraint
	]
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
	
	// 显示约束区域统计
	console.log('');
	console.log('约束区域统计:');
	console.log(`禁止区数量: ${data.constraints.filter(c => c.type === 'KEEPOUT').length}`);
	console.log(`保留区数量: ${data.constraints.filter(c => c.type === 'KEEPIN').length}`);
	console.log(`约束类型: ${[...new Set(data.constraints.map(c => c.purpose))].join(', ')}`);
	
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

runExample('05.keepout-and-keepin', ecadData);