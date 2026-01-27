#!/usr/bin/env ts-node

/**
 * 案例6：完整多层板
 * 
 * 完整演示各项目的建模方式，展示相对完整的IDX结构
 * 
 * 案例说明：整合案例2-5，输出一个有层堆叠包含各种项目的四层板
 * 包含：
 * - 四层板结构（案例2）
 * - 3D模型和元件（案例3）
 * - 过孔和盲埋孔（案例4）
 * - 禁止区和保留区域（案例5）
 */

import { IDXExporter } from '../src/exporter';
import { 
	ECADData, 
	ECADLayerType, 
	ECADModel3D, 
	ECADModelFormat, 
	ECADFootprint, 
	ECADComponent, 
	ECADHole, 
	ECADHoleType, 
	ECADConstraintArea 
} from '../src/types/ecad/ecad.interface';
import { GlobalUnit } from '../src/types/edmd/base.types';
import { Vector2 } from '../src/libs/geometry/Vector2';
import { BBox2 } from '../src/libs/geometry/BBox2';
import { createRectangleGeometry, createCircleGeometry, createPolygonalKeepin } from './utils/geometry-utils';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('============================================================');
console.log('案例06：complete-multi-board');
console.log('描述：完整演示各项目的建模方式，展示相对完整的IDX结构');
console.log('============================================================');

// 创建四层板结构
function createCompleteBoard(stackupId: string) {
	return {
		name: 'Complete Multi-Layer Board',
		description: 'A complete four-layer PCB with all features: components, vias, constraints',
		outline: createRectangleGeometry(120, 100), // 120mm x 100mm (更大的板子)
		thickness: 1.74, // 总厚度1.74mm
		stackupId: stackupId
	};
}

function createCompleteStackup() {
	return {
		id: 'MAIN_STACKUP',
		name: 'Complete Layer Stackup',
		description: 'Four layer stackup with all dielectric layers',
		layerIds: ['TOP', 'DIELECTRIC1', 'INNER1', 'DIELECTRIC2', 'INNER2', 'DIELECTRIC3', 'BOTTOM']
	};
}

// ============= 3D模型（来自案例3）=============
const model3D_R0402: ECADModel3D = {
	identifier: 'R0402_MODEL',
	format: ECADModelFormat.STEP,
	location: 'models/R0402.step',
	version: '1.0'
};

const model3D_R0603: ECADModel3D = {
	identifier: 'R0603_MODEL',
	format: ECADModelFormat.STEP,
	location: 'models/R0603.step',
	version: '1.0'
};

const model3D_C0603: ECADModel3D = {
	identifier: 'C0603_MODEL',
	format: ECADModelFormat.STEP,
	location: 'models/C0603.step',
	version: '1.0'
};

// ============= 封装定义 =============
const footprint_R0603: ECADFootprint = {
	name: 'R0603',
	description: '0603 resistor footprint',
	packageName: 'R0603',
	geometry: {
		outline: createRectangleGeometry(1.6, 0.8),
	},
	pins: [
		{
			pinNumber: '1',
			primary: true,
			position: new Vector2(-0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8),
		},
		{
			pinNumber: '2',
			primary: false,
			position: new Vector2(0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8),
		}
	],
	model3dId: 'R0402_MODEL'
};

const footprint_C0603: ECADFootprint = {
	name: 'C0603',
	description: '0603 capacitor footprint',
	packageName: 'C0603',
	geometry: {
		outline: createRectangleGeometry(1.6, 0.8),
	},
	pins: [
		{
			pinNumber: '1',
			primary: true,
			position: new Vector2(-0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8),
		},
		{
			pinNumber: '2',
			primary: false,
			position: new Vector2(0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8),
		}
	],
	model3dId: 'C0603_MODEL'
};

const footprint_TestPoint: ECADFootprint = {
	name: 'TP_1MM',
	description: '1mm test point footprint',
	packageName: 'TP_1MM',
	geometry: {
		outline: createCircleGeometry(1.0),
	},
	pins: [
		{
			pinNumber: '1',
			primary: true,
			position: new Vector2(0, 0),
			geometry: createCircleGeometry(0.8),
		}
	]
};

// ============= 元件定义 =============
const components: ECADComponent[] = [
	// 电阻元件
	{
		name: 'R1',
		description: '10K resistor',
		transformation: {
			position: new Vector2(20, 30),
			rotation: 0,
			mirror: false
		},
		layerId: 'TOP',
		packageName: 'R0603',
		footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'R1' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '10K' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TOLERANCE' }, Value: '5%' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'POWER_RATING' }, Value: '0.1W' }
		]
	},
	{
		name: 'R2',
		description: '22K resistor',
		transformation: {
			position: new Vector2(40, 30),
			rotation: Math.PI / 2, // 90度
			mirror: false
		},
		layerId: 'TOP',
		packageName: 'R0603',
		model3dId: 'R0603_MODEL', // 使用不同的3D模型
		footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'R2' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '22K' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TOLERANCE' }, Value: '1%' }
		]
	},
	// 电容元件
	{
		name: 'C1',
		description: '100nF capacitor',
		transformation: {
			position: new Vector2(60, 30),
			rotation: 0,
			mirror: false
		},
		layerId: 'TOP',
		packageName: 'C0603',
		footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'C1' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '100nF' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VOLTAGE_RATING' }, Value: '50V' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DIELECTRIC' }, Value: 'X7R' }
		]
	},
	{
		name: 'C2',
		description: '10uF capacitor',
		transformation: {
			position: new Vector2(80, 30),
			rotation: Math.PI, // 180度
			mirror: false
		},
		layerId: 'TOP',
		packageName: 'C0603',
		footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'C2' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '10uF' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VOLTAGE_RATING' }, Value: '25V' }
		]
	},
	// 底层元件
	{
		name: 'R3',
		description: '1K resistor (bottom)',
		transformation: {
			position: new Vector2(30, 70),
			rotation: Math.PI / 4, // 45度
			mirror: true // 底层元件镜像
		},
		layerId: 'BOTTOM',
		packageName: 'R0603',
		footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'R3' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '1K' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'SIDE' }, Value: 'BOTTOM' }
		]
	},
	// 测试点
	{
		name: 'TP1',
		description: 'Test point 1',
		transformation: {
			position: new Vector2(100, 20),
			rotation: 0,
			mirror: false
		},
		layerId: 'TOP',
		packageName: 'TP_1MM',
		footprintBounds: new BBox2(-0.5, -0.5, 0.5, 0.5),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'TP1' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'VCC' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TEST_TYPE' }, Value: 'VOLTAGE' }
		]
	},
	{
		name: 'TP2',
		description: 'Test point 2',
		transformation: {
			position: new Vector2(100, 80),
			rotation: 0,
			mirror: false
		},
		layerId: 'BOTTOM',
		packageName: 'TP_1MM',
		footprintBounds: new BBox2(-0.5, -0.5, 0.5, 0.5),
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'TP2' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'GND' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TEST_TYPE' }, Value: 'CONTINUITY' }
		]
	}
];

// ============= 过孔定义（来自案例4）=============
const vias: ECADHole[] = [
	// 通孔
	{
		name: 'VIA_1',
		description: 'Power via',
		geometry: createCircleGeometry(0.4), // 较大的电源过孔
		type: ECADHoleType.VIA,
		stackupId: 'MAIN_STACKUP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'VCC' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'POWER' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DRILL_SIZE' }, Value: '0.3' }
		]
	},
	{
		name: 'VIA_2',
		description: 'Ground via',
		geometry: createCircleGeometry(0.4),
		type: ECADHoleType.VIA,
		stackupId: 'MAIN_STACKUP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'GND' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'GROUND' }
		]
	},
	{
		name: 'VIA_3',
		description: 'Signal via',
		geometry: createCircleGeometry(0.25),
		type: ECADHoleType.VIA,
		stackupId: 'MAIN_STACKUP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'SIGNAL_1' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'SIGNAL' }
		]
	},
	// 盲孔
	{
		name: 'BLIND_VIA_1',
		description: 'Blind via from top to inner1',
		geometry: createCircleGeometry(0.2),
		type: ECADHoleType.BLIND,
		layerSpan: {
			startLayer: 'TOP',
			endLayer: 'INNER1'
		},
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'SIGNAL_2' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'BLIND' }
		]
	},
	// 埋孔
	{
		name: 'BURIED_VIA_1',
		description: 'Buried via between inner layers',
		geometry: createCircleGeometry(0.15),
		type: ECADHoleType.BURIED,
		layerSpan: {
			startLayer: 'INNER1',
			endLayer: 'INNER2'
		},
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'NET_NAME' }, Value: 'SIGNAL_3' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VIA_TYPE' }, Value: 'BURIED' }
		]
	}
];

// ============= 约束区域定义（来自案例5）=============
const constraints: ECADConstraintArea[] = [
	// 元件禁止区
	{
		name: 'COMPONENT_KEEPOUT_MAIN',
		description: 'Main component keepout area',
		type: 'KEEPOUT',
		purpose: 'COMPONENT',
		geometry: createRectangleGeometry(25, 15),
		layerId: 'TOP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'COMPONENT_KEEPOUT' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'REASON' }, Value: 'CONNECTOR_AREA' }
		]
	},
	// 布线禁止区
	{
		name: 'ROUTING_KEEPOUT_POWER',
		description: 'Power area routing keepout',
		type: 'KEEPOUT',
		purpose: 'ROUTE',
		geometry: createRectangleGeometry(20, 20),
		layerId: 'INNER1',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'ROUTING_KEEPOUT' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'REASON' }, Value: 'POWER_PLANE_ISOLATION' }
		]
	},
	// 过孔禁止区
	{
		name: 'VIA_KEEPOUT_SENSITIVE',
		description: 'Sensitive area via keepout',
		type: 'KEEPOUT',
		purpose: 'VIA',
		geometry: createRectangleGeometry(12, 12),
		layerId: 'TOP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'VIA_KEEPOUT' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'REASON' }, Value: 'ANALOG_CIRCUIT_PROTECTION' }
		]
	},
	// 元件保留区（多边形）
	{
		name: 'COMPONENT_KEEPIN_CRITICAL',
		description: 'Critical component placement area',
		type: 'KEEPIN',
		purpose: 'COMPONENT',
		geometry: createPolygonalKeepin([
			new Vector2(70, 60),
			new Vector2(90, 60),
			new Vector2(95, 70),
			new Vector2(90, 80),
			new Vector2(70, 80),
			new Vector2(65, 70)
		]),
		layerId: 'TOP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'COMPONENT_KEEPIN' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'PRIORITY' }, Value: 'HIGH' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'REASON' }, Value: 'CRITICAL_SIGNAL_PATH' }
		]
	},
	// 测试点保留区
	{
		name: 'TESTPOINT_KEEPIN_AREA',
		description: 'Test point accessible area',
		type: 'KEEPIN',
		purpose: 'TESTPOINT',
		geometry: createRectangleGeometry(30, 20),
		layerId: 'TOP',
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'TESTPOINT_KEEPIN' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'ACCESS_SIDE' }, Value: 'TOP' }
		]
	},
	// 热约束区域
	{
		name: 'THERMAL_CONSTRAINT_POWER',
		description: 'Power management thermal area',
		type: 'KEEPOUT',
		purpose: 'THERMAL',
		geometry: createRectangleGeometry(15, 15),
		zRange: {
			lowerBound: 0,
			upperBound: 1.74
		},
		userProperties: [
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'CONSTRAINT_TYPE' }, Value: 'THERMAL_CONSTRAINT' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'MAX_TEMPERATURE' }, Value: '85' },
			{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'THERMAL_MANAGEMENT' }, Value: 'REQUIRED' }
		]
	}
];

// 构建完整的ECAD数据
const ecadData: ECADData = {
	metadata: {
		designName: 'Complete Multi-Layer Board',
		revision: '1.0',
		description: '案例6：完整多层板 - 整合所有功能的四层板设计',
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
			material: 'Copper',
			color: '#FF0000'
		},
		'INNER1': {
			id: 'INNER1',
			name: 'Inner Layer 1 (Power)',
			type: ECADLayerType.POWER_GROUND,
			thickness: 0.035,
			material: 'Copper',
			color: '#00FF00'
		},
		'INNER2': {
			id: 'INNER2',
			name: 'Inner Layer 2 (Ground)',
			type: ECADLayerType.POWER_GROUND,
			thickness: 0.035,
			material: 'Copper',
			color: '#0000FF'
		},
		'BOTTOM': {
			id: 'BOTTOM',
			name: 'Bottom Layer',
			type: ECADLayerType.SIGNAL,
			thickness: 0.035,
			material: 'Copper',
			color: '#FFFF00'
		},
		'DIELECTRIC1': {
			id: 'DIELECTRIC1',
			name: 'Prepreg 1',
			type: ECADLayerType.DIELECTRIC,
			thickness: 0.2,
			material: 'FR4-Prepreg'
		},
		'DIELECTRIC2': {
			id: 'DIELECTRIC2',
			name: 'Core',
			type: ECADLayerType.DIELECTRIC,
			thickness: 1.2,
			material: 'FR4-Core'
		},
		'DIELECTRIC3': {
			id: 'DIELECTRIC3',
			name: 'Prepreg 2',
			type: ECADLayerType.DIELECTRIC,
			thickness: 0.2,
			material: 'FR4-Prepreg'
		}
	},
	stackups: {
		'MAIN_STACKUP': createCompleteStackup()
	},
	board: createCompleteBoard('MAIN_STACKUP'),
	models: {
		'R0402_MODEL': model3D_R0402,
		'R0603_MODEL': model3D_R0603,
		'C0603_MODEL': model3D_C0603
	},
	footprints: {
		'R0603_FOOTPRINT': footprint_R0603,
		'C0603_FOOTPRINT': footprint_C0603,
		'TP_1MM_FOOTPRINT': footprint_TestPoint
	},
	components: components,
	holes: vias,
	constraints: constraints
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
	
	// 显示设计统计
	console.log('');
	console.log('设计统计:');
	console.log(`层数量: ${Object.keys(data.layers || {}).length}`);
	console.log(`3D模型数量: ${Object.keys(data.models || {}).length}`);
	console.log(`封装数量: ${Object.keys(data.footprints || {}).length}`);
	console.log(`元件数量: ${data.components?.length || 0}`);
	console.log(`过孔数量: ${data.holes?.length || 0}`);
	console.log(`约束区域数量: ${data.constraints?.length || 0}`);
	
	// 显示元件分布
	const topComponents = data.components?.filter(c => c.layerId === 'TOP').length || 0;
	const bottomComponents = data.components?.filter(c => c.layerId === 'BOTTOM').length || 0;
	console.log(`顶层元件: ${topComponents}, 底层元件: ${bottomComponents}`);
	
	// 显示约束类型分布
	const keepouts = data.constraints?.filter(c => c.type === 'KEEPOUT').length || 0;
	const keepins = data.constraints?.filter(c => c.type === 'KEEPIN').length || 0;
	console.log(`禁止区: ${keepouts}, 保留区: ${keepins}`);
	
	// 显示预览
	console.log('');
	console.log('=== 传统建模方式预览 ===');
	console.log(traditionalResult.file.source!.substring(0, 500) + '...');
	
	console.log('');
	console.log('=== 简化建模方式预览 ===');
	console.log(simplifiedResult.file.source!.substring(0, 500) + '...');
	
	console.log('');
	console.log(`🎉 案例${name.split('.')[0]}：${name.split('.')[1]}执行完成！`);
	console.log('这是一个完整的多层板设计，包含了IDX协议的所有主要功能模块。');
	console.log('');
}

runExample('06.complete-multi-board', ecadData);