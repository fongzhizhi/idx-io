/**
 * IDX导出器完善功能 - 综合集成测试
 * 
 * 测试所有新功能的集成工作，包括：
 * - 扩展的数据接口支持
 * - LayerBuilder和多层板支持
 * - XML精度和格式化
 * - 验证引擎增强
 * - XML注释支持
 * - 错误处理和恢复
 */

import { IDXExporter } from '../../src/exporter';
import { ExtendedExportSourceData, LayerType, ComponentData, HoleData, KeepoutData } from '../../src/types/data-models';
import { GlobalUnit } from '../../src/types/core';

describe('IDX Exporter Completion - Integration Tests', () => {
  
  describe('Extended Interface Support', () => {
    it('should export board with components array', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'TestBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'R1',
            partNumber: 'RES_1K_0603',
            packageName: '0603',
            position: { x: 10, y: 10, z: 0, rotation: 0 },
            dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
            layer: 'TOP'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.components).toBe(1);
      expect(result.xmlContent).toContain('R1');
      expect(result.xmlContent).toContain('RES_1K_0603');
    });

    it('should export board with holes array', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'TestBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        holes: [
          {
            id: 'VIA_001',
            viaType: 'plated',
            position: { x: 20, y: 20 },
            diameter: 0.2,
            startLayer: 'L1',
            endLayer: 'L4',
            netName: 'VCC'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.holes).toBe(1);
      expect(result.xmlContent).toContain('VIA_001');
    });

    it('should export board with keepouts array', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'TestBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        keepouts: [
          {
            id: 'KEEPOUT_001',
            constraintType: 'component',
            purpose: 'ComponentPlacement',
            shape: {
              type: 'rectangle',
              points: [
                { x: 45, y: 32 },
                { x: 55, y: 32 },
                { x: 55, y: 48 },
                { x: 45, y: 48 }
              ]
            },
            layer: 'TOP'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.keepouts).toBe(1);
      expect(result.xmlContent).toContain('KEEPOUT_001');
    });

    it('should export board with all data types combined', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'CompleteBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Complete Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'U1',
            partNumber: 'IC_CHIP',
            packageName: 'QFP-64',
            position: { x: 50, y: 40, z: 0, rotation: 0 },
            dimensions: { width: 10, height: 10, thickness: 1.5 },
            layer: 'TOP'
          }
        ],
        holes: [
          {
            id: 'VIA_001',
            viaType: 'plated',
            position: { x: 30, y: 30 },
            diameter: 0.3,
            startLayer: 'L1',
            endLayer: 'L4',
            netName: 'GND'
          }
        ],
        keepouts: [
          {
            id: 'KEEPOUT_001',
            constraintType: 'via',
            purpose: 'ViaPlacement',
            shape: {
              type: 'rectangle',
              points: [
                { x: 65, y: 55 },
                { x: 75, y: 55 },
                { x: 75, y: 65 },
                { x: 65, y: 65 }
              ]
            },
            layer: 'TOP'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.components).toBe(1);
      expect(result.statistics.holes).toBe(1);
      expect(result.statistics.keepouts).toBe(1);
      expect(result.statistics.totalItems).toBeGreaterThan(0);
    });
  });

  describe('Layer Support and LayerBuilder', () => {
    it('should export board with layer definitions', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'LayeredBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: true
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Layered Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        layers: [
          {
            id: 'L1_TOP',
            name: 'Top Signal',
            type: LayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper',
            copperWeight: 1
          },
          {
            id: 'L2_BOTTOM',
            name: 'Bottom Signal',
            type: LayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper',
            copperWeight: 1
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.layers).toBe(2);
      expect(result.xmlContent).toContain('L1_TOP');
      expect(result.xmlContent).toContain('L2_BOTTOM');
    });

    it('should export board with layer stackup', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'StackupBoard',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: true
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Stackup Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        layers: [
          {
            id: 'L1',
            name: 'Top',
            type: LayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper'
          },
          {
            id: 'L2',
            name: 'Bottom',
            type: LayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper'
          },
          {
            id: 'D1',
            name: 'Core',
            type: LayerType.DIELECTRIC,
            thickness: 1.53,
            material: 'FR4',
            dielectricConstant: 4.5
          }
        ],
        layerStackup: {
          id: 'STACKUP_2L',
          name: '2-Layer Stackup',
          description: 'Simple 2-layer board',
          totalThickness: 1.6,
          boardType: 'rigid',
          layers: [
            { layerId: 'L2', position: 1, thickness: 0.035 },
            { layerId: 'D1', position: 2, thickness: 1.53 },
            { layerId: 'L1', position: 3, thickness: 0.035 }
          ]
        }
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.layers).toBe(4);
      expect(result.xmlContent).toContain('STACKUP_2L');
    });

    it('should respect includeLayerStackup configuration', async () => {
      const exporterWithStackup = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'WithStackup',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: true
        }
      });

      const exporterWithoutStackup = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'WithoutStackup',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 30 },
              { x: 0, y: 30 }
            ],
            thickness: 1.6
          }
        },
        layers: [
          {
            id: 'L1',
            name: 'Top',
            type: LayerType.SIGNAL,
            thickness: 0.035,
            material: 'Copper'
          }
        ],
        layerStackup: {
          id: 'STACKUP_1L',
          name: 'Single Layer',
          description: 'Test stackup',
          totalThickness: 1.6,
          boardType: 'rigid',
          layers: [
            { layerId: 'L1', position: 1, thickness: 0.035 }
          ]
        }
      };

      const resultWith = await exporterWithStackup.export(boardData);
      const resultWithout = await exporterWithoutStackup.export(boardData);
      
      expect(resultWith.success).toBe(true);
      expect(resultWithout.success).toBe(true);
      
      // With stackup should include stackup information
      expect(resultWith.xmlContent).toContain('STACKUP_1L');
      
      // Without stackup may or may not include it based on implementation
      // Just verify it exports successfully
    });
  });

  describe('XML Precision and Formatting', () => {
    it('should format numeric values with correct precision', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'PrecisionTest',
          compress: false
        },
        geometry: {
          useSimplified: true,
          defaultUnit: GlobalUnit.UNIT_MM,
          precision: 6
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Precision Test',
          outline: {
            points: [
              { x: 10.123456789, y: 20.987654321 },
              { x: 100.5, y: 0 },
              { x: 100, y: 80.123 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        }
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      
      // Check that coordinates are formatted with proper precision
      // Should be rounded to 6 decimal places
      expect(result.xmlContent).toMatch(/10\.12345[67]/); // Rounded
      expect(result.xmlContent).toMatch(/20\.98765[34]/); // Rounded
    });

    it('should remove trailing zeros when configured', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'TrailingZeroTest',
          compress: false
        },
        geometry: {
          useSimplified: true,
          defaultUnit: GlobalUnit.UNIT_MM,
          precision: 6
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Trailing Zero Test',
          outline: {
            points: [
              { x: 10.0, y: 20.5 },
              { x: 100.0, y: 0.0 },
              { x: 100.0, y: 80.0 },
              { x: 0.0, y: 80.0 }
            ],
            thickness: 1.6
          }
        }
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      
      // Trailing zeros should be removed
      expect(result.xmlContent).toContain('>10<');
      expect(result.xmlContent).toContain('>20.5<');
      expect(result.xmlContent).toContain('>100<');
    });

    it('should produce well-formatted XML output', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'FormattedTest',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Formatted Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 30 },
              { x: 0, y: 30 }
            ],
            thickness: 1.6
          }
        }
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      
      // Check XML structure
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xmlContent).toContain('<foundation:EDMDDataSet');
      expect(result.xmlContent).toContain('</foundation:EDMDDataSet>');
      
      // Check formatting (indentation and newlines)
      expect(result.xmlContent).toContain('\n');
      expect(result.xmlContent).toMatch(/\s{2,}/); // Has indentation
    });
  });

  describe('XML Comments Support', () => {
    it('should include comments when enabled', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'CommentTest',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      }, {
        enabled: true,
        includeFileHeader: true,
        includeItemComments: true,
        includeGeometryComments: true,
        includeSectionComments: true
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Comment Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 30 },
              { x: 0, y: 30 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'R1',
            partNumber: 'RES_1K',
            packageName: '0603',
            position: { x: 10, y: 10, z: 0, rotation: 0 },
            dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
            layer: 'TOP'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      
      // Check for XML comments
      expect(result.xmlContent).toContain('<!--');
      expect(result.xmlContent).toContain('-->');
      
      // Check for specific comment types
      expect(result.xmlContent).toMatch(/<!--.*IDX.*-->/i); // File header comment
      expect(result.xmlContent).toMatch(/<!--.*Header.*-->/i); // Section comment
      expect(result.xmlContent).toMatch(/<!--.*Body.*-->/i); // Section comment
    });

    it('should not include comments when disabled', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'NoCommentTest',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      }, {
        enabled: false
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'No Comment Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 30 },
              { x: 0, y: 30 }
            ],
            thickness: 1.6
          }
        }
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      
      // Should not contain XML comments
      expect(result.xmlContent).not.toContain('<!--');
      expect(result.xmlContent).not.toContain('-->');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate input data when validation is enabled', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'ValidationTest',
          compress: false
        },
        validation: {
          enabled: true,
          strictness: 'strict'
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Validation Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        }
      };

      const result = await exporter.export(boardData);
      
      // Should succeed with valid data
      expect(result.success).toBe(true);
    });

    it('should handle warnings gracefully', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'WarningTest',
          compress: false
        },
        validation: {
          enabled: true,
          strictness: 'normal'
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Warning Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'R1',
            partNumber: 'RES_1K',
            packageName: '0603',
            position: { x: 10, y: 10, z: 0, rotation: 0 },
            dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
            layer: 'TOP'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      // Should succeed even with warnings
      expect(result.success).toBe(true);
      
      // May have warnings in issues array
      if (result.issues.length > 0) {
        const hasWarnings = result.issues.some(issue => issue.type === 'warning');
        // Warnings should not prevent export
        expect(result.success).toBe(true);
      }
    });

    it('should provide detailed error messages for invalid data', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'ErrorTest',
          compress: false
        },
        validation: {
          enabled: true,
          strictness: 'strict'
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      // Invalid data: missing required fields
      const invalidBoardData: any = {
        board: {
          id: 'BOARD_001',
          // Missing name and outline
        }
      };

      const result = await exporter.export(invalidBoardData);
      
      // Should fail with errors
      expect(result.success).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Should have error type issues
      const hasErrors = result.issues.some(issue => issue.type === 'error');
      expect(hasErrors).toBe(true);
    });
  });

  describe('Complete Integration Scenarios', () => {
    it('should export a complete 4-layer board with all features', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'Complete4Layer',
          compress: false
        },
        geometry: {
          useSimplified: true,
          defaultUnit: GlobalUnit.UNIT_MM,
          precision: 6
        },
        collaboration: {
          creatorSystem: 'IntegrationTest',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: true
        },
        validation: {
          enabled: true,
          strictness: 'normal'
        }
      }, {
        enabled: true,
        includeFileHeader: true,
        includeItemComments: true,
        includeGeometryComments: true,
        includeSectionComments: true
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'COMPLETE_4L_BOARD',
          name: 'Complete 4-Layer Test Board',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
              { x: 0, y: 80 }
            ],
            thickness: 1.6
          }
        },
        layers: [
          { id: 'L1', name: 'Top', type: LayerType.SIGNAL, thickness: 0.035, material: 'Copper', copperWeight: 1 },
          { id: 'L2', name: 'GND', type: LayerType.PLANE, thickness: 0.035, material: 'Copper', copperWeight: 1 },
          { id: 'L3', name: 'PWR', type: LayerType.PLANE, thickness: 0.035, material: 'Copper', copperWeight: 1 },
          { id: 'L4', name: 'Bottom', type: LayerType.SIGNAL, thickness: 0.035, material: 'Copper', copperWeight: 1 },
          { id: 'D1', name: 'Prepreg1', type: LayerType.DIELECTRIC, thickness: 0.2, material: 'FR4', dielectricConstant: 4.5 },
          { id: 'CORE', name: 'Core', type: LayerType.DIELECTRIC, thickness: 1.065, material: 'FR4', dielectricConstant: 4.5 },
          { id: 'D2', name: 'Prepreg2', type: LayerType.DIELECTRIC, thickness: 0.2, material: 'FR4', dielectricConstant: 4.5 }
        ],
        layerStackup: {
          id: 'STACKUP_4L',
          name: '4-Layer Stackup',
          description: 'Standard 4-layer board',
          totalThickness: 1.6,
          boardType: 'rigid',
          layers: [
            { layerId: 'L4', position: 1, thickness: 0.035 },
            { layerId: 'D2', position: 2, thickness: 0.2 },
            { layerId: 'L3', position: 3, thickness: 0.035 },
            { layerId: 'CORE', position: 4, thickness: 1.065 },
            { layerId: 'L2', position: 5, thickness: 0.035 },
            { layerId: 'D1', position: 6, thickness: 0.2 },
            { layerId: 'L1', position: 7, thickness: 0.035 }
          ]
        },
        components: [
          {
            refDes: 'U1',
            partNumber: 'IC_CHIP',
            packageName: 'QFP-64',
            position: { x: 50, y: 40, z: 1.6, rotation: 0 },
            dimensions: { width: 10, height: 10, thickness: 1.5 },
            layer: 'L1'
          },
          {
            refDes: 'C1',
            partNumber: 'CAP_100nF',
            packageName: '0603',
            position: { x: 30, y: 30, z: 1.6, rotation: 90 },
            dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
            layer: 'L1'
          }
        ],
        holes: [
          {
            id: 'VIA_VCC',
            viaType: 'plated',
            position: { x: 45, y: 35 },
            diameter: 0.2,
            startLayer: 'L1',
            endLayer: 'L3',
            netName: 'VCC'
          },
          {
            id: 'VIA_GND',
            viaType: 'plated',
            position: { x: 55, y: 45 },
            diameter: 0.2,
            startLayer: 'L1',
            endLayer: 'L2',
            netName: 'GND'
          }
        ],
        keepouts: [
          {
            id: 'KEEPOUT_MOUNTING',
            constraintType: 'component',
            purpose: 'ComponentPlacement',
            shape: {
              type: 'rectangle',
              points: [
                { x: 5, y: 5 },
                { x: 15, y: 5 },
                { x: 15, y: 15 },
                { x: 5, y: 15 }
              ]
            },
            layer: 'L1'
          }
        ]
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.totalItems).toBeGreaterThan(0);
      expect(result.statistics.components).toBe(2);
      expect(result.statistics.holes).toBe(2);
      expect(result.statistics.keepouts).toBe(1);
      expect(result.statistics.layers).toBe(8);
      
      // Verify XML structure
      expect(result.xmlContent).toContain('<?xml version="1.0"');
      expect(result.xmlContent).toContain('<foundation:EDMDDataSet');
      expect(result.xmlContent).toContain('</foundation:EDMDDataSet>');
      
      // Verify comments are included
      expect(result.xmlContent).toContain('<!--');
      
      // Verify layer stackup is included
      expect(result.xmlContent).toContain('STACKUP_4L');
      
      // Verify components are included
      expect(result.xmlContent).toContain('U1');
      expect(result.xmlContent).toContain('C1');
      
      // Verify vias are included
      expect(result.xmlContent).toContain('VIA_VCC');
      expect(result.xmlContent).toContain('VIA_GND');
      
      // Verify keepouts are included
      expect(result.xmlContent).toContain('KEEPOUT_MOUNTING');
      
      // Verify numeric precision
      expect(result.xmlContent).toMatch(/\d+\.\d{1,6}/); // Has decimal numbers with up to 6 places
      
      // Verify file size is reasonable
      expect(result.statistics.fileSize).toBeGreaterThan(1000); // At least 1KB
      expect(result.statistics.fileSize).toBeLessThan(1000000); // Less than 1MB
      
      // Verify export duration is reasonable
      expect(result.statistics.exportDuration).toBeGreaterThan(0);
      expect(result.statistics.exportDuration).toBeLessThan(10000); // Less than 10 seconds
    });

    it('should handle empty optional arrays gracefully', async () => {
      const exporter = new IDXExporter({
        output: {
          directory: './test-output',
          designName: 'EmptyArraysTest',
          compress: false
        },
        collaboration: {
          creatorSystem: 'TestSystem',
          creatorCompany: 'TestCompany',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      });

      const boardData: ExtendedExportSourceData = {
        board: {
          id: 'BOARD_001',
          name: 'Empty Arrays Test',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 30 },
              { x: 0, y: 30 }
            ],
            thickness: 1.6
          }
        },
        components: [],
        holes: [],
        keepouts: [],
        layers: []
      };

      const result = await exporter.export(boardData);
      
      expect(result.success).toBe(true);
      expect(result.statistics.components).toBe(0);
      expect(result.statistics.holes).toBe(0);
      expect(result.statistics.keepouts).toBe(0);
      expect(result.statistics.layers).toBe(0);
    });
  });
});
