# Requirements Document

## Introduction

The IDX exporter has achieved 96.2% validation passing (25/26 checks) with comprehensive independent geometry element implementation. This specification addresses the remaining core functionality gaps to achieve 100% completion, focusing on the Single ItemType issue, example file corrections, and any missing core features identified through analysis.

## Glossary

- **IDX_Exporter**: The system that converts PCB design data to IDXv4.5 format
- **ItemType**: The classification of items as either "assembly" (collections) or "single" (individual definitions)
- **Geometry_Element**: Independent geometric definitions (points, lines, curves) that can be referenced by multiple items
- **Component_Definition**: Reusable component templates that should use "single" ItemType
- **Assembly_Instance**: Specific placements of components that should use "assembly" ItemType
- **Validation_Test**: Automated checks that verify XML structure compliance with IDXv4.5 specification
- **Example_File**: Demonstration code showing proper usage of the exporter API

## Requirements

### Requirement 1: Single ItemType Implementation

**User Story:** As a PCB designer, I want component definitions to use the correct "single" ItemType, so that the exported IDX files comply with IDXv4.5 specification standards.

#### Acceptance Criteria

1. WHEN the system exports component definitions, THE IDX_Exporter SHALL generate items with ItemType "single"
2. WHEN the system exports component instances (placements), THE IDX_Exporter SHALL generate items with ItemType "assembly"
3. WHEN the system exports board geometry definitions, THE IDX_Exporter SHALL generate items with ItemType "single"
4. WHEN the system exports via/hole definitions, THE IDX_Exporter SHALL generate items with ItemType "single"
5. WHEN the system exports keepout definitions, THE IDX_Exporter SHALL generate items with ItemType "single"
6. WHEN validation tests run, THE Validation_Test SHALL pass the "Single ItemType" check

### Requirement 2: Example File Corrections

**User Story:** As a developer integrating the IDX exporter, I want working example files, so that I can understand proper API usage without TypeScript errors.

#### Acceptance Criteria

1. WHEN developers examine export-basic.ts, THE Example_File SHALL compile without TypeScript errors
2. WHEN the ExportSourceData interface is used, THE IDX_Exporter SHALL accept components, holes, and keepouts properties
3. WHEN export-with-layers.ts is executed, THE Example_File SHALL demonstrate layer functionality without runtime errors
4. WHEN example files are run, THE IDX_Exporter SHALL generate valid IDX output
5. WHEN developers follow example patterns, THE IDX_Exporter SHALL provide clear error messages for invalid data

### Requirement 3: Data Interface Completeness

**User Story:** As a developer, I want complete data interfaces that match the example usage, so that I can export all supported PCB elements.

#### Acceptance Criteria

1. WHEN ExportSourceData is defined, THE IDX_Exporter SHALL include components, holes, and keepouts as optional properties
2. WHEN BoardData interface is used, THE IDX_Exporter SHALL support all properties referenced in example files
3. WHEN component data is provided, THE IDX_Exporter SHALL accept all component properties shown in examples
4. WHEN layer data is provided, THE IDX_Exporter SHALL process layer stackup information correctly
5. WHEN invalid data structures are provided, THE IDX_Exporter SHALL return descriptive error messages

### Requirement 4: Layer Stackup Functionality

**User Story:** As a PCB designer, I want to export multi-layer board designs with proper layer stackup, so that mechanical CAD systems can understand the board structure.

#### Acceptance Criteria

1. WHEN layer stackup data is provided, THE IDX_Exporter SHALL generate layer items with correct Z-coordinates
2. WHEN includeLayerStackup is enabled, THE IDX_Exporter SHALL export physical layer definitions
3. WHEN layer thickness is specified, THE IDX_Exporter SHALL calculate cumulative Z-positions correctly
4. WHEN layer materials are defined, THE IDX_Exporter SHALL include material properties in the output
5. WHEN layer stackup is exported, THE IDX_Exporter SHALL maintain layer ordering from bottom to top

### Requirement 5: Validation Completeness

**User Story:** As a quality assurance engineer, I want 100% validation passing, so that exported IDX files meet all specification requirements.

#### Acceptance Criteria

1. WHEN validation tests execute, THE Validation_Test SHALL achieve 100% pass rate (26/26 checks)
2. WHEN XML structure is validated, THE IDX_Exporter SHALL generate compliant IDXv4.5 format
3. WHEN geometry elements are validated, THE IDX_Exporter SHALL include all required geometric definitions
4. WHEN item relationships are validated, THE IDX_Exporter SHALL maintain proper reference integrity
5. WHEN namespace validation occurs, THE IDX_Exporter SHALL use correct XML namespaces and prefixes

### Requirement 6: Component Definition vs Instance Separation

**User Story:** As a PCB designer, I want clear separation between component definitions and component instances, so that the IDX file structure follows industry standards.

#### Acceptance Criteria

1. WHEN component templates are defined, THE IDX_Exporter SHALL create definition items with ItemType "single"
2. WHEN component instances are placed, THE IDX_Exporter SHALL create assembly items that reference definitions
3. WHEN multiple instances use the same component, THE IDX_Exporter SHALL reuse the single definition
4. WHEN component properties are exported, THE IDX_Exporter SHALL separate definition properties from instance properties
5. WHEN geometry is defined, THE IDX_Exporter SHALL allow definition geometry to be referenced by multiple instances

### Requirement 7: Error Handling and Diagnostics

**User Story:** As a developer, I want clear error messages and diagnostics, so that I can quickly identify and fix data issues.

#### Acceptance Criteria

1. WHEN invalid data is provided, THE IDX_Exporter SHALL return specific error messages indicating the problem
2. WHEN required properties are missing, THE IDX_Exporter SHALL identify which properties are needed
3. WHEN data validation fails, THE IDX_Exporter SHALL provide context about the failing item
4. WHEN export warnings occur, THE IDX_Exporter SHALL collect and report all issues without stopping export
5. WHEN debugging is needed, THE IDX_Exporter SHALL provide detailed logging of the export process

### Requirement 8: API Consistency and Documentation

**User Story:** As a developer, I want consistent API interfaces and clear documentation, so that I can integrate the exporter efficiently.

#### Acceptance Criteria

1. WHEN interfaces are defined, THE IDX_Exporter SHALL maintain consistent naming conventions across all types
2. WHEN optional properties are used, THE IDX_Exporter SHALL handle undefined values gracefully
3. WHEN default values are needed, THE IDX_Exporter SHALL apply sensible defaults for missing properties
4. WHEN type definitions are exported, THE IDX_Exporter SHALL provide complete TypeScript interfaces
5. WHEN API changes are made, THE IDX_Exporter SHALL maintain backward compatibility where possible