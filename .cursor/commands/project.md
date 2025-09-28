# Project Command

Initialize Linear project and configuration files OR show project status dashboard.

## What This Command Does

**Conditional Behavior Based on Project State:**

### **If `.cursor/project.json` Does NOT Exist (Setup Mode)**
1. **Creates Linear Project**: Sets up a new Linear project with proper configuration
2. **Initializes Configuration**: Creates `.cursor/project.json` with Linear integration settings
3. **Sets Up Learning System**: Creates `.cursor/learning-patterns.json` for AI learning
4. **Validates API Access**: Ensures Linear API access is working correctly
5. **Configures Project Settings**: Sets up all necessary project parameters
6. **Adds Project Description & Summary**: Creates comprehensive project documentation in Linear

### **If `.cursor/project.json` EXISTS (Status Mode)**
1. **Project Health Metrics**: Shows current project status and progress
2. **Learning Pattern Insights**: Displays learned preferences and trends
3. **Progress Tracking**: Tracks project milestones and deliverables
4. **Linear Integration Status**: Validates Linear API access and project connection
5. **Project Description & Summary**: Displays current project documentation from Linear

## Implementation

**References**: `linear-project-manager.mdc`, `ai-development-pipeline.mdc`

**Conditional Logic**:
```bash
if [ ! -f ".cursor/project.json" ]; then
  # Setup Mode: Initialize project
  setup_project_workflow
else
  # Status Mode: Show project dashboard
  show_project_status
fi
```

**Setup Mode Actions**:
- **ROOT FOLDER DETECTION**: Use the root folder's title to identify the project
- **LINEAR PROJECT MATCHING**: Check if a Linear project with matching name already exists
- **SMART PROJECT SELECTION**: If matching project exists, use it; if not, create new one
- **PROJECT-AGNOSTIC SETUP**: Do NOT use existing codebase structure to generate project description
- **LINEAR-FIRST APPROACH**: All project documentation must be stored in Linear, not in rules
- **CLEAN CONFIGURATION**: Create `.cursor/project.json` with placeholder values that require user input
- **VALIDATION**: Ensure Linear API access works before proceeding
- **PROJECT DOCUMENTATION**: Create comprehensive project description and summary in Linear

**Status Mode Actions**:
- Read `.cursor/project.json` for project configuration
- Read `.cursor/learning-patterns.json` for learning insights
- Query Linear API for project status and tickets
- Calculate project health metrics
- Generate learning pattern insights
- Create progress tracking dashboard
- Display project description and summary from Linear

**Smart Project Detection Logic**:
```bash
# Get root folder name
ROOT_FOLDER_NAME=$(basename "$(pwd)")

# Search Linear for existing project with matching name
EXISTING_PROJECT=$(linear_api_search_projects --name "$ROOT_FOLDER_NAME")

if [ -n "$EXISTING_PROJECT" ]; then
  echo "✅ Found existing Linear project: $ROOT_FOLDER_NAME"
  USE_EXISTING_PROJECT=true
else
  echo "🆕 No existing project found, creating new one: $ROOT_FOLDER_NAME"
  USE_EXISTING_PROJECT=false
fi
```

**Configuration Template** (Setup Mode):
```json
{
  "linear": {
    "teamId": "REQUIRED_TEAM_UUID",
    "teamKey": "REQUIRED_TEAM_KEY", 
    "projectId": "DETECTED_OR_CREATED_PROJECT_UUID",
    "projectName": "ROOT_FOLDER_NAME"
  },
  "settings": {
    "approvalRequired": true,
    "branchPrefix": "feature",
    "autoTransitions": true,
    "learningEnabled": true,
    "mvpFirst": true,
    "qualityGates": true,
    "confidenceThreshold": 0.6
  },
  "architecture": {
    "framework": "PROJECT_FRAMEWORK",
    "language": "PROJECT_LANGUAGE",
    "database": "PROJECT_DATABASE", 
    "patterns": ["PROJECT_PATTERNS"],
    "testing": "PROJECT_TESTING_FRAMEWORK"
  },
  "milestones": {
    "mvp": {
      "name": "MVP Release",
      "targetDate": "PROJECT_MVP_DATE",
      "progress": 0,
      "features": []
    },
    "beta": {
      "name": "Beta Release",
      "targetDate": "PROJECT_BETA_DATE", 
      "progress": 0,
      "features": []
    }
  },
  "quality": {
    "testCoverage": 90,
    "eslintStrict": true,
    "definitionOfDone": [
      "Code implemented and tested",
      "Code reviewed", 
      "Documentation updated",
      "ESLint compliance",
      "Jest tests passing"
    ]
  },
  "mvp": {
    "coreFeatures": [],
    "deferredFeatures": [],
    "criticalPath": []
  }
}
```

**Project Description & Summary Template** (Setup Mode):
```markdown
# [PROJECT_NAME] - [BRIEF_DESCRIPTION]

## Project Summary
[One-paragraph description of what the project does, its main purpose, and key value proposition]

## Vision & Mission
**Vision**: [Long-term vision statement]
**Mission**: [Core mission statement]

## Key Features
- [Feature 1]: [Description]
- [Feature 2]: [Description]
- [Feature 3]: [Description]

## Technical Architecture
- **Framework**: [Primary framework]
- **Language**: [Programming language]
- **Database**: [Database technology]
- **Testing**: [Testing framework]

## Business Model
- **Target Market**: [Primary target audience]
- **Revenue Streams**: [How the project generates revenue]
- **Competitive Advantage**: [What makes this project unique]

## Success Metrics
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]
- [Metric 3]: [Target value]

## Roadmap
- **Phase 1**: [Description and timeline]
- **Phase 2**: [Description and timeline]
- **Phase 3**: [Description and timeline]

## Team & Resources
- **Lead**: [Project lead information]
- **Team Size**: [Number of team members]
- **Budget**: [Budget information if applicable]

## Risk Assessment
- **Technical Risks**: [Key technical challenges]
- **Business Risks**: [Key business challenges]
- **Mitigation Strategies**: [How risks will be addressed]
```

**Success Criteria**:

**Setup Mode**:
- Root folder name detected and used for project identification
- Existing Linear project found and connected OR new project created
- Configuration files generated with correct project information
- API access validated
- Project ready for requirement processing
- **Project description and summary created in Linear**
- **NO PROJECT-SPECIFIC DATA IN RULES**

**Status Mode**:
- Project health metrics displayed
- Learning insights shown
- Progress tracking updated
- Comprehensive dashboard generated
- **Project description and summary displayed from Linear**

**Error Handling**:
- If root folder detection fails, prompt user for project name
- If Linear API fails, provide clear error message
- If project matching fails, create new project with root folder name
- If configuration fails, rollback and retry
- If validation fails, escalate to human intervention
- If status mode fails, show cached data with warning
- If project description creation fails, continue with basic setup

## Usage

```bash
project
```

**Setup Mode**: Run when starting a new project to initialize the AI-assisted development pipeline. Uses root folder name to intelligently detect or create Linear project with comprehensive documentation.

**Status Mode**: Run regularly to check project health, learning insights, progress tracking, and view current project documentation.

## Project Documentation Strategy

**Linear as Single Source of Truth**:
- All project documentation stored in Linear
- Business requirements stored as Linear tickets
- Project milestones and progress tracked in Linear
- **Project description and summary maintained in Linear project**
- Rules remain completely project-agnostic

**Separation of Concerns**:
- Rules: Project-agnostic workflow and logic
- Linear: Project-specific documentation and requirements
- Commands: Manual user decisions and actions
- Configuration: Project-specific settings only

**Documentation Updates**:
- Project description updated when major changes occur
- Summary refreshed based on milestone progress
- Technical architecture documented in Linear
- Business model and metrics tracked in Linear

--- End Command ---