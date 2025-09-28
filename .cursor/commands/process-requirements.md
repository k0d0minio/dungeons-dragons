# Process Requirements Command

Methodical one-file-at-a-time analysis and raw data dumping into Linear tickets.

## What This Command Does

**Methodical File-by-File Processing:**

### **Phase 1: Single File Analysis**
1. **Takes One File**: Processes ONE file at a time from `.cursor/requirements/` folder
2. **Raw Data Extraction**: Extracts ALL content verbatim without filtering or formatting
3. **Multiple Requirements**: Identifies and extracts multiple requirements from single document
4. **Comprehensive Dumping**: Creates Linear tickets for EVERY identifiable requirement
5. **File Movement**: Moves processed file to `.cursor/requirements/processed/` folder

### **Phase 2: Raw Data Dumping**
1. **Verbatim Preservation**: Stores original customer language exactly as written
2. **No Formatting Constraints**: Allows flexible ticket formatting for raw data
3. **Multiple Tickets Per File**: Creates separate tickets for each requirement found
4. **No Duplicate Filtering**: Creates tickets regardless of potential duplicates
5. **Complete Coverage**: Ensures no content is lost or filtered out

## Implementation

**References**: `requirement-processing.mdc`, `linear-ticket-manager.mdc`

**Required Actions**:

**Methodical Processing Workflow**:
1. **SINGLE FILE PROCESSING**: Process ONE file at a time
2. **RAW DATA EXTRACTION**: Extract ALL content verbatim from the file
3. **REQUIREMENT IDENTIFICATION**: Identify ALL requirements in the file
4. **TICKET CREATION**: Create separate tickets for each requirement
5. **FILE MOVEMENT**: Move processed file to `.cursor/requirements/processed/`
6. **REPEAT**: Move to next file and repeat process

**Raw Data Dumping**:
- **VERBATIM PRESERVATION**: Store original customer language exactly as written
- **NO FORMATTING CONSTRAINTS**: Allow flexible ticket formatting
- **COMPREHENSIVE EXTRACTION**: Extract every identifiable requirement
- **MULTIPLE TICKETS**: Create separate tickets for each requirement
- **NO DUPLICATE FILTERING**: Create tickets regardless of potential duplicates
- **COMPLETE COVERAGE**: Ensure no content is lost or filtered out

**File Management**:
- **PROCESSED FOLDER**: Create `.cursor/requirements/processed/` folder if it doesn't exist
- **FILE MOVEMENT**: Move processed file to processed folder after successful ticket creation
- **ONE FILE AT A TIME**: Process files individually, not in batch
- **VALIDATION**: Verify all requirements extracted before moving file
- **ERROR HANDLING**: Retain file in requirements folder if processing fails

**Success Criteria**:
- ONE file processed at a time
- ALL content extracted verbatim
- Multiple tickets created for multiple requirements
- Processed file moved to processed folder
- No content lost or filtered out
- Complete coverage achieved

**Error Handling**:
- If single file processing fails, retain file in requirements folder
- If ticket creation fails, retry with exponential backoff
- If file movement fails, log error but don't retry
- If extraction fails, provide detailed error report

## Usage

```bash
process-requirements
```

**When to Use**:
- When you have multiple files in `.cursor/requirements/` folder
- When you want methodical, one-file-at-a-time processing
- When you need raw data dumping without formatting constraints
- When you want to ensure complete coverage of all requirements
- When you need to process files individually for better control

## Methodical File Processing

**One-File-At-A-Time Approach**:
- **SINGLE FILE FOCUS**: Process only one file at a time
- **COMPLETE EXTRACTION**: Extract ALL content from the single file
- **MULTIPLE REQUIREMENTS**: Create separate tickets for each requirement found
- **FILE MOVEMENT**: Move processed file to processed folder
- **NEXT FILE**: Move to next file and repeat process

**Raw Data Extraction**:
- **VERBATIM CONTENT**: Extract content exactly as written
- **NO FILTERING**: Don't filter or modify customer language
- **COMPREHENSIVE COVERAGE**: Extract every identifiable requirement
- **FLEXIBLE FORMATTING**: Allow flexible ticket formatting
- **NO CONSTRAINTS**: Don't impose rigid formatting requirements

## File Management System

**Processed Folder Structure**:
```
.cursor/requirements/
├── file1.pdf          # Unprocessed files
├── file2.docx         # Unprocessed files
└── processed/         # Processed files
    ├── file1.pdf      # Successfully processed
    └── file2.docx     # Successfully processed
```

**File Movement Protocol**:
1. **PROCESS FILE**: Extract all requirements from single file
2. **CREATE TICKETS**: Create separate tickets for each requirement
3. **VALIDATE SUCCESS**: Verify all tickets created successfully
4. **MOVE FILE**: Move processed file to `.cursor/requirements/processed/`
5. **LOG PROCESSING**: Record processed file to prevent reprocessing

**Safety Measures**:
- **ONLY MOVE AFTER SUCCESS**: File moved only after successful ticket creation
- **VALIDATION REQUIRED**: Verify all requirements extracted before moving
- **ERROR HANDLING**: Retain file in requirements folder if processing fails
- **PROCESSED TRACKING**: Track processed files to prevent reprocessing

## Raw Data Dumping

**No Formatting Constraints**:
- **FLEXIBLE TICKET FORMAT**: Allow flexible ticket formatting
- **RAW CONTENT**: Store original customer language exactly as written
- **NO TEMPLATE CONSTRAINTS**: Don't impose rigid template requirements
- **COMPREHENSIVE DATA**: Include all relevant information
- **CUSTOMER LANGUAGE**: Preserve original customer terminology

**Multiple Tickets Per File**:
- **SEPARATE REQUIREMENTS**: Create separate tickets for each requirement
- **INDIVIDUAL FOCUS**: Each ticket focuses on one specific requirement
- **COMPLETE COVERAGE**: Ensure all requirements are captured
- **NO COMBINING**: Don't combine multiple requirements into single tickets
- **INDIVIDUAL TRACKING**: Track each requirement separately

## No Duplicate Filtering

**Duplicate Handling**:
- **NO DUPLICATE FILTERING**: Create tickets regardless of potential duplicates
- **COMPLETE COVERAGE**: Ensure all requirements are captured
- **FINE-TUNING LATER**: Handle duplicates during planning phase
- **RAW DATA FIRST**: Focus on complete data extraction first
- **PLANNING SECOND**: Handle organization and deduplication later

**Processing Priority**:
- **COMPLETENESS FIRST**: Focus on complete data extraction
- **ORGANIZATION SECOND**: Handle organization and deduplication later
- **RAW DATA DUMPING**: Dump all data without filtering
- **COMPREHENSIVE COVERAGE**: Ensure no content is lost
- **METHODICAL APPROACH**: Process files one at a time

This command provides methodical, one-file-at-a-time processing with raw data dumping to ensure complete coverage of all requirements.
