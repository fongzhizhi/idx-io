/**
 * XML Writer精度和格式化测试
 * 验证数值精度处理和格式化输出的正确性
 */

import { XMLWriter } from '../src/exporter/writers/xml-writer';
import { EDMDDataSet, ItemType, GeometryType } from '../src/types/core';

describe('XMLWriter Precision and Formatting', () => {
  describe('Numeric Precision', () => {
    it('should format coordinates with default precision', () => {
      const writer = new XMLWriter();
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          GeometricElements: [
            {
              id: 'POINT_1',
              'xsi:type': 'd2:EDMDCartesianPoint',
              X: { 'property:Value': 10.123456789 },
              Y: { 'property:Value': 20.987654321 }
            }
          ],
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证坐标被格式化为6位小数（默认精度）
      expect(xml).toContain('10.123457'); // 四舍五入
      expect(xml).toContain('20.987654');
    });

    it('should remove trailing zeros when enabled', () => {
      const writer = new XMLWriter({ removeTrailingZeros: true });
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          GeometricElements: [
            {
              id: 'POINT_1',
              'xsi:type': 'd2:EDMDCartesianPoint',
              X: { 'property:Value': 10.0 },
              Y: { 'property:Value': 20.5 }
            }
          ],
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证尾随零被移除
      expect(xml).toContain('>10<'); // 不是10.000000
      expect(xml).toContain('>20.5<'); // 不是20.500000
    });

    it('should respect custom precision setting', () => {
      const writer = new XMLWriter({ numericPrecision: 3, removeTrailingZeros: false });
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          GeometricElements: [
            {
              id: 'POINT_1',
              'xsi:type': 'd2:EDMDCartesianPoint',
              X: { 'property:Value': 10.123456 },
              Y: { 'property:Value': 20.987654 }
            }
          ],
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证使用3位小数精度
      expect(xml).toContain('10.123');
      expect(xml).toContain('20.988');
    });
  });

  describe('Dimension Formatting', () => {
    it('should format dimensions as positive values', () => {
      const writer = new XMLWriter();
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          GeometricElements: [
            {
              id: 'CIRCLE_1',
              type: 'CircleCenter',
              CenterPoint: 'POINT_1',
              Diameter: { 'property:Value': 5.5 }
            }
          ],
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证直径被正确格式化
      expect(xml).toContain('5.5');
    });
  });

  describe('User Property Formatting', () => {
    it('should intelligently format numeric user properties', () => {
      const writer = new XMLWriter({ removeTrailingZeros: true });
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          Items: [
            {
              id: 'ITEM_1',
              Name: 'Test Item',
              ItemType: ItemType.SINGLE,
              geometryType: GeometryType.COMPONENT,
              Identifier: {
                SystemScope: 'TEST',
                Number: '001',
                Version: 1,
                Revision: 0,
                Sequence: 0
              },
              UserProperties: [
                {
                  Key: {
                    SystemScope: 'TEST',
                    ObjectName: 'Thickness'
                  },
                  Value: 1.6
                },
                {
                  Key: {
                    SystemScope: 'TEST',
                    ObjectName: 'Rotation'
                  },
                  Value: 90.0
                },
                {
                  Key: {
                    SystemScope: 'TEST',
                    ObjectName: 'PositionX'
                  },
                  Value: 10.5
                }
              ]
            }
          ]
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证不同类型的属性被正确格式化
      expect(xml).toContain('1.6'); // 厚度
      expect(xml).toContain('90'); // 角度（移除尾随零）
      expect(xml).toContain('10.5'); // 位置
    });
  });

  describe('Transformation Matrix Formatting', () => {
    it('should format transformation matrix values correctly', () => {
      const writer = new XMLWriter({ removeTrailingZeros: true });
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          Items: [
            {
              id: 'ASSEMBLY_1',
              Name: 'Test Assembly',
              ItemType: ItemType.ASSEMBLY,
              Identifier: {
                SystemScope: 'TEST',
                Number: '001',
                Version: 1,
                Revision: 0,
                Sequence: 0
              },
              ItemInstances: [
                {
                  id: 'INSTANCE_1',
                  Item: 'ITEM_1',
                  InstanceName: {
                    SystemScope: 'TEST',
                    ObjectName: 'Instance1'
                  },
                  Transformation: {
                    TransformationType: 'd2',
                    xx: 1.0,
                    xy: 0.0,
                    yx: 0.0,
                    yy: 1.0,
                    tx: { Value: 10.5 },
                    ty: { Value: 20.75 }
                  }
                }
              ]
            }
          ]
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证变换矩阵值被正确格式化
      expect(xml).toContain('>1<'); // 单位矩阵元素
      expect(xml).toContain('>0<'); // 零元素
      expect(xml).toContain('10.5'); // 平移向量
      expect(xml).toContain('20.75');
    });
  });

  describe('XML Output Formatting', () => {
    it('should produce well-formatted XML with proper indentation', () => {
      const writer = new XMLWriter({ prettyPrint: true });
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证XML格式化
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('\n'); // 包含换行符
      expect(xml).toContain('  '); // 包含缩进
    });

    it('should produce valid XML structure', () => {
      const writer = new XMLWriter();
      const dataset: EDMDDataSet = {
        Header: {
          GlobalUnitLength: 'ITEM_UNIT_LENGTH',
          CreationDateTime: '2024-01-01T00:00:00Z',
          ModifiedDateTime: '2024-01-01T00:00:00Z',
          CreatorSystem: 'TestSystem'
        },
        Body: {
          Items: []
        },
        ProcessInstruction: {
          id: 'PI_1',
          instructionType: 'SendChanges'
        }
      };

      const xml = writer.serialize(dataset);
      
      // 验证XML结构
      expect(xml).toContain('<foundation:EDMDDataSet');
      expect(xml).toContain('<foundation:Header');
      expect(xml).toContain('<foundation:Body');
      expect(xml).toContain('<foundation:ProcessInstruction');
      expect(xml).toContain('</foundation:EDMDDataSet>');
    });
  });
});
