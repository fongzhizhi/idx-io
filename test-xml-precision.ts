/**
 * XML Writer精度和格式化手动测试
 * 验证数值精度处理和格式化输出的正确�?
 */

import { XMLWriter } from './src/exporter/writers/xml-writer';
import { EDMDDataSet, ItemType, GeometryType, GlobalUnit } from './src/types/core';

console.log('=== XML Writer Precision Tests ===\n');

// 测试1: 默认精度格式�?
console.log('Test 1: Default precision formatting');
const writer1 = new XMLWriter();
const dataset1: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml1 = writer1.serialize(dataset1);
const hasCorrectPrecision = xml1.includes('10.123457') && xml1.includes('20.987654');
console.log(`�?Coordinates formatted with 6 decimal places: ${hasCorrectPrecision}`);
console.log(`  Found: ${xml1.match(/10\.\d+/)?.[0]} and ${xml1.match(/20\.\d+/)?.[0]}\n`);

// 测试2: 移除尾随�?
console.log('Test 2: Remove trailing zeros');
const writer2 = new XMLWriter({ removeTrailingZeros: true });
const dataset2: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml2 = writer2.serialize(dataset2);
const hasNoTrailingZeros = xml2.includes('>10<') && xml2.includes('>20.5<');
console.log(`�?Trailing zeros removed: ${hasNoTrailingZeros}`);
console.log(`  10.0 -> ${xml2.match(/>10[^<]*</)?.[0]}`);
console.log(`  20.5 -> ${xml2.match(/>20\.5[^<]*</)?.[0]}\n`);

// 测试3: 自定义精�?
console.log('Test 3: Custom precision (3 decimal places)');
const writer3 = new XMLWriter({ numericPrecision: 3, removeTrailingZeros: false });
const dataset3: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml3 = writer3.serialize(dataset3);
const hasCustomPrecision = xml3.includes('10.123') && xml3.includes('20.988');
console.log(`�?Custom precision applied: ${hasCustomPrecision}`);
console.log(`  Found: ${xml3.match(/10\.\d+/)?.[0]} and ${xml3.match(/20\.\d+/)?.[0]}\n`);

// 测试4: 直径格式�?
console.log('Test 4: Dimension formatting (diameter)');
const writer4 = new XMLWriter();
const dataset4: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml4 = writer4.serialize(dataset4);
const hasDiameter = xml4.includes('5.5');
console.log(`�?Diameter formatted correctly: ${hasDiameter}`);
console.log(`  Found: ${xml4.match(/5\.5/)?.[0]}\n`);

// 测试5: 用户属性智能格式化
console.log('Test 5: User property intelligent formatting');
const writer5 = new XMLWriter({ removeTrailingZeros: true });
const dataset5: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml5 = writer5.serialize(dataset5);
const hasThickness = xml5.includes('1.6');
const hasRotation = xml5.includes('>90<'); // 尾随零被移除
const hasPosition = xml5.includes('10.5');
console.log(`�?Thickness formatted: ${hasThickness} (1.6)`);
console.log(`�?Rotation formatted: ${hasRotation} (90 without trailing zeros)`);
console.log(`�?Position formatted: ${hasPosition} (10.5)\n`);

// 测试6: 变换矩阵格式�?
console.log('Test 6: Transformation matrix formatting');
const writer6 = new XMLWriter({ removeTrailingZeros: true });
const dataset6: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml6 = writer6.serialize(dataset6);
const hasMatrixElements = xml6.includes('>1<') && xml6.includes('>0<');
const hasTranslation = xml6.includes('10.5') && xml6.includes('20.75');
console.log(`�?Matrix elements formatted: ${hasMatrixElements} (1 and 0)`);
console.log(`�?Translation vectors formatted: ${hasTranslation} (10.5 and 20.75)\n`);

// 测试7: XML格式化输�?
console.log('Test 7: XML output formatting');
const writer7 = new XMLWriter({ prettyPrint: true });
const dataset7: EDMDDataSet = {
  Header: {
    GlobalUnitLength: GlobalUnit.UNIT_MM,
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

const xml7 = writer7.serialize(dataset7);
const hasXmlDeclaration = xml7.includes('<?xml version="1.0" encoding="UTF-8"?>');
const hasNewlines = xml7.includes('\n');
const hasIndentation = xml7.includes('  ');
const hasValidStructure = xml7.includes('<foundation:EDMDDataSet') && 
                          xml7.includes('</foundation:EDMDDataSet>');
console.log(`�?XML declaration present: ${hasXmlDeclaration}`);
console.log(`�?Newlines present: ${hasNewlines}`);
console.log(`�?Indentation present: ${hasIndentation}`);
console.log(`�?Valid XML structure: ${hasValidStructure}\n`);

// 总结
console.log('=== Test Summary ===');
const allPassed = hasCorrectPrecision && hasNoTrailingZeros && hasCustomPrecision && 
                  hasDiameter && hasThickness && hasRotation && hasPosition &&
                  hasMatrixElements && hasTranslation && hasXmlDeclaration && 
                  hasNewlines && hasIndentation && hasValidStructure;

if (allPassed) {
  console.log('�?All tests passed!');
} else {
  console.log('�?Some tests failed. Please review the output above.');
}
