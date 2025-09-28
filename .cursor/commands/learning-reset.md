# Learning Reset Command

Clear learning data and restart the AI learning system.

## What This Command Does

1. **Learning Data Reset**
   - Clears all learning patterns and preferences
   - Resets historical data and trends
   - Removes approval predictors
   - Clears workflow preferences

2. **System Restart**
   - Restarts the learning system with clean state
   - Reinitializes learning patterns
   - Resets quality standards
   - Clears velocity trends

3. **Fresh Start**
   - Provides clean slate for new learning
   - Removes outdated patterns
   - Allows system to learn new preferences
   - Resets all learning metrics

## Implementation

**References**: `linear-project-manager.mdc`

**Required Actions**:
- Read `.cursor/learning-patterns.json`
- Clear all learning data:
  - `patterns.approvalPredictors`
  - `patterns.workflowPreferences`
  - `historicalData.velocityTrends`
  - `userPreferences.qualityFocus`
- Reset to default values
- Save updated learning patterns file
- Confirm reset completion

**Success Criteria**:
- All learning data cleared
- System restarted with clean state
- Fresh start achieved
- Learning system reinitialized

**Error Handling**:
- If file access fails, provide error message
- If reset fails, rollback to previous state
- If confirmation fails, retry operation

## Usage

```bash
learning-reset
```

This command should be run when you want to start fresh with the learning system or when learning patterns become outdated.
