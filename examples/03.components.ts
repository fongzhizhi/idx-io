#!/usr/bin/env ts-node

/**
 * 案例3：元件
 * 
 * 演示元件的建模方式，展示元件以及元件相关数据在IDX中的结构
 * 
 * 案例说明：继承案例2，四层板，项目有：
 * 1. 3D模型：R0402
 * 2. 3D模型：R0403
 * 3. 封装R0603：一个简单的矩形轮廓和两个引脚信息组成，绑定了3D模型R0402
 * 4. 封装M3：一个简单的圆形轮廓，无引脚信息
 * 5. 元件R1：电气元件，电阻，封装为R0603，顶层，坐标为(5, 20)，旋转角度为45度，继承了封装的3D模型R0402
 * 6. 元件R2：电气元件，电阻，封装同R1为R0603，底层，坐标为(15, 15)，旋转角度为180度，绑定了3D模型R0403
 * 7. 元件TP1：机械元件，螺丝，封装为M3，顶层，坐标为(3, 3)，旋转角度为0度
 */

import { IDXExporter } from '../src/exporter';
import { ECADData, ECADLayerType, ECADModel3D, ECADModelFormat, ECADFootprint, ECADComponent } from '../src/types/ecad/ecad.interface';
import { GlobalUnit } from '../src/types/edmd/base.types';
import { Vector2 } from '../src/libs/geometry/Vector2';
import { BBox2 } from '../src/libs/geometry/BBox2';
import { createRectangleGeometry, createCircleGeometry } from './utils/geometry-utils';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('============================================================');
console.log('案例03：components');
console.log('描述：演示元件的建模方式，展示元件以及元件相关数据在IDX中的结构');
console.log('============================================================');

// 创建3D模型
const model3D_R0402: ECADModel3D = {
	identifier: 'R0402_MODEL',
	format: ECADModelFormat.STEP,
	location: 'models/R0402.step',
	version: '1.0'
};

const model3D_R0403: ECADModel3D = {
	identifier: 'R0403_MODEL',
	format: ECADModelFormat.STEP,
	location: 'models/R0403.step',
	version: '1.0'
};

// 创建封装
const footprint_R0603: ECADFootprint = {
	name: 'R0603',
	description: '0603 resistor footprint',
	packageName: 'R0603',
	// 封装几何信息
	geometry: {
		// 封装轮廓（矩形）
		outline: createRectangleGeometry(1.6, 0.8), // 1.6mm x 0.8mm
	},
	// 引脚信息
	pins: [
		{
			pinNumber: '1',
			primary: true,
			position: new Vector2(-0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8), // 焊盘尺寸
		},
		{
			pinNumber: '2',
			primary: false,
			position: new Vector2(0.8, 0),
			geometry: createRectangleGeometry(0.8, 0.8), // 焊盘尺寸
		}
	],
	// 绑定3D模型
	model3dId: 'R0402_MODEL'
};

const footprint_M3: ECADFootprint = {
	name: 'M3',
	description: 'M3 screw footprint',
	packageName: 'M3',
	// 封装几何信息
	geometry: {
		// 封装轮廓（圆形）
		outline: createCircleGeometry(3.0), // 直径3mm
	},
	// 无引脚信息
	pins: []
};

// 创建元件
const component_R1: ECADComponent = {
	name: 'R1',
	description: '0603 resistor R1',
	transformation: {
		position: new Vector2(5, 20),
		rotation: Math.PI / 4, // 45度转换为弧度
		mirror: false
	},
	layerId: 'TOP', // 顶层
	packageName: 'R0603',
	// 继承封装的3D模型（通过封装关联）
	footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'R1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '10K' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'COMPONENT_TYPE' }, Value: 'RESISTOR' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TOLERANCE' }, Value: '5%' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'POWER_RATING' }, Value: '0.1W' }
	]
};

const component_R2: ECADComponent = {
	name: 'R2',
	description: '0603 resistor R2',
	transformation: {
		position: new Vector2(15, 15),
		rotation: Math.PI, // 180度转换为弧度
		mirror: true // 底层元件通常镜像
	},
	layerId: 'BOTTOM', // 底层
	packageName: 'R0603',
	// 绑定不同的3D模型（R0403）
	model3dId: 'R0403_MODEL',
	footprintBounds: new BBox2(-0.8, -0.4, 0.8, 0.4),
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'R2' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: '22K' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'COMPONENT_TYPE' }, Value: 'RESISTOR' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'TOLERANCE' }, Value: '1%' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'POWER_RATING' }, Value: '0.1W' }
	]
};

const component_TP1: ECADComponent = {
	name: 'TP1',
	description: 'M3 screw TP1',
	transformation: {
		position: new Vector2(3, 3),
		rotation: 0, // 无旋转
		mirror: false
	},
	layerId: 'TOP', // 顶层
	packageName: 'M3',
	isMechanical: true, // 机械元件
	footprintBounds: new BBox2(-1.5, -1.5, 1.5, 1.5),
	userProperties: [
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'DESIGNATOR' }, Value: 'TP1' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'VALUE' }, Value: 'M3' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'COMPONENT_TYPE' }, Value: 'SCREW' },
		{ Key: { SystemScope: 'ECADSYSTEM', ObjectName: 'MATERIAL' }, Value: 'STEEL' }
	]
};

// 创建四层板结构（复用案例2的层结构）
function createFourLayerBoard(stackupId: string) {
	return {
		name: 'Four Layer Board',
		description: 'A four-layer PCB with standard stackup',
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

// 构建完整的ECAD数据
const ecadData: ECADData = {
	metadata: {
		designName: 'Components Example',
		revision: '1.0',
		description: '案例3：元件 - 四层板（总厚度1.74mm）',
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
	models: {
		'R0402_MODEL': model3D_R0402,
		'R0403_MODEL': model3D_R0403
	},
	footprints: {
		'R0603_FOOTPRINT': footprint_R0603,
		'M3_FOOTPRINT': footprint_M3
	},
	components: [component_R1, component_R2, component_TP1],
	holes: [],
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

runExample('03.components', ecadData);