import { describe, test, expect } from 'vitest';
import { IDXWriter } from '../../../src/exporter/writer/IDXWriter';
import { EDMDDataSet, GlobalUnit, GeometryType, ItemType, ShapeElementType, IDXComputationalTag, IDXD2Tag } from '../../../src/types/core';

describe('IDXWriter', () => {
	test('应该能够序列化简单的数据集', () => {
		// # 创建测试数据
		const testDataSet: EDMDDataSet = {
			Header: {
				Description: 'Test PCB design',
				CreatorName: 'Test User',
				CreatorCompany: 'Test Company',
				CreatorSystem: 'ECAD_TEST',
				PostProcessor: 'IDX-IO',
				PostProcessorVersion: '1.0.0',
				Creator: 'testuser',
				GlobalUnitLength: GlobalUnit.UNIT_MM,
				CreationDateTime: '2024-01-01T10:00:00Z',
				ModifiedDateTime: '2024-01-01T10:00:00Z',
			},
			Body: {
				Points: [
					{ id: 'PT1', X: 0, Y: 0 },
					{ id: 'PT2', X: 100, Y: 0 },
					{ id: 'PT3', X: 100, Y: 50 },
					{ id: 'PT4', X: 0, Y: 50 },
					{
						id: 'PT_CENTER',
						X: 25,
						Y: 25,
					},
				],
				Geometries: [
					{
						id: 'POLY_BOARD',
						type: IDXD2Tag.EDMDPolyLine,
						Points: [
							'PT1',
							'PT2',
							'PT3',
							'PT4',
							'PT1',
						],
					},
					{
						id: 'CIRCLE_HOLE',
						type: IDXD2Tag.EDMDCircleCenter,
						CenterPoint: 'PT_CENTER',
						Diameter: 3.2,
					},
				],
				CurveSets: [
					{
						id: 'CURVESET_BOARD',
						ShapeDescriptionType: 'GeometricModel',
						LowerBound: 0,
						UpperBound: 1.6,
						DetailedGeometricModelElements:
							[
								'POLY_BOARD',
							],
					},
					{
						id: 'CURVESET_HOLE',
						ShapeDescriptionType: 'GeometricModel',
						LowerBound: 0,
						UpperBound: 0, // 贯穿孔
						DetailedGeometricModelElements:
							[
								'CIRCLE_HOLE',
							],
					},
				],
				ShapeElements: [
					{
						id: 'SHAPE_BOARD',
						ShapeElementType: ShapeElementType.FeatureShapeElement,
						Inverted: false,
						DefiningShape: 'CURVESET_BOARD',
					},
					{
						id: 'SHAPE_HOLE',
						ShapeElementType: ShapeElementType.FeatureShapeElement,
						Inverted: true, // 减去材料
						DefiningShape: 'CURVESET_HOLE',
					},
				],
				ItemsSingle: [
					{
						id: 'ITEM_BOARD_DEF',
						ItemType: ItemType.SINGLE,
						Name: 'Board Definition',
						Shape: 'SHAPE_BOARD',
					},
					{
						id: 'ITEM_HOLE_DEF',
						ItemType: ItemType.SINGLE,
						Name: 'Hole Definition',
						Shape: 'SHAPE_HOLE',
						PackageName: {
							SystemScope: 'LIBRARY',
							ObjectName: 'HOLE_3.2MM',
						},
					},
				],
				ItemsAssembly: [
					{
						id: 'ITEM_BOARD_ASSY',
						ItemType: ItemType.ASSEMBLY,
						geometryType: GeometryType.BOARD_OUTLINE,
						Name: 'Main PCB Board',
						ItemInstances: [
							{
								id: 'INST_BOARD',
								Item: 'ITEM_BOARD_DEF',
								InstanceName: {
									SystemScope: 'ECAD',
									ObjectName: 'Board1',
								},
								Transformation: {
									TransformationType: 'd2',
									xx: 1,
									xy: 0,
									yx: 0,
									yy: 1,
									tx: 0,
									ty: 0,
								},
							},
						],
					},
					{
						id: 'ITEM_HOLE_ASSY',
						ItemType: ItemType.ASSEMBLY,
						geometryType: GeometryType.HOLE_NON_PLATED,
						Name: 'Mounting Hole',
						ItemInstances: [
							{
								id: 'INST_HOLE',
								Item: 'ITEM_HOLE_DEF',
								InstanceName: {
									SystemScope: 'ECAD',
									ObjectName: 'Hole1',
								},
								Transformation: {
									TransformationType: 'd2',
									xx: 1,
									xy: 0,
									yx: 0,
									yy: 1,
									tx: 25,
									ty: 25,
								},
							},
						],
					},
				],
			},
			ProcessInstruction: {
				type: IDXComputationalTag.SendInformation,
				Actor: 'testuser',
				Description: 'Initial baseline',
			},
		};

		// # 创建写入器
		const writer = new IDXWriter({
			enableComments: true,
			formatting: {
				prettyPrint: true,
			},
		});

		// # 序列化
		const xml = writer.serialize(testDataSet);

		// # 验证
		expect(xml).toBeTruthy();
		expect(xml).toContain('<foundation:EDMDDataSet');
		expect(xml).toContain('<foundation:Header');
		expect(xml).toContain('<foundation:Body');
		expect(xml).toContain('geometryType="BOARD_OUTLINE"');
		expect(xml).toContain('geometryType="HOLE_NON_PLATED"');

		// console.log(xml); // 查看生成的XML
	});
});
