# Error Command

Automatically trigger error recovery framework using OODA loop problem-solving approach.

## What This Command Does

**Automatic Error Recovery Pipeline:**

### **Phase 1: Error Detection & Analysis**
1. **Detects Current Error State**: Identifies the specific error or issue
2. **Analyzes Error Context**: Understands the scope and impact of the error
3. **Assesses Error Severity**: Determines the severity and urgency level
4. **Identifies Root Cause**: Analyzes potential root causes of the error
5. **Evaluates Recovery Options**: Assesses available recovery strategies

### **Phase 2: OODA Loop Recovery Framework**
1. **Observe**: Gather comprehensive information about the error state
2. **Orient**: Analyze the situation and understand the context
3. **Decide**: Choose the most appropriate recovery strategy
4. **Act**: Execute the recovery action with monitoring

### **Phase 3: Automated Recovery Execution**
1. **Primary Recovery**: Attempts primary recovery strategy
2. **Fallback Recovery**: Uses graduated retry logic with exponential backoff
3. **Semantic Fallback**: Applies semantic fallback mechanisms for complex scenarios
4. **Checkpoint Restoration**: Uses checkpoint-and-rollback systems for clean state restoration
5. **Human Escalation**: Escalates to human intervention only after 3 failed attempts

## Implementation

**References**: `error-recovery.mdc`, `ai-development-pipeline.mdc`

**Required Actions**:

**Phase 1: Error Detection & Analysis**
- **ERROR STATE DETECTION**: Identify the specific error or issue
- **CONTEXT ANALYSIS**: Understand the scope and impact of the error
- **SEVERITY ASSESSMENT**: Determine the severity and urgency level
- **ROOT CAUSE ANALYSIS**: Analyze potential root causes of the error
- **RECOVERY OPTION EVALUATION**: Assess available recovery strategies

**Phase 2: OODA Loop Recovery Framework**
- **OBSERVE**: Gather comprehensive information about the error state
- **ORIENT**: Analyze the situation and understand the context
- **DECIDE**: Choose the most appropriate recovery strategy
- **ACT**: Execute the recovery action with monitoring

**Phase 3: Automated Recovery Execution**
- **PRIMARY RECOVERY**: Attempt primary recovery strategy
- **FALLBACK RECOVERY**: Use graduated retry logic with exponential backoff
- **SEMANTIC FALLBACK**: Apply semantic fallback mechanisms for complex scenarios
- **CHECKPOINT RESTORATION**: Use checkpoint-and-rollback systems for clean state restoration
- **HUMAN ESCALATION**: Escalate to human intervention only after 3 failed attempts

**Error Recovery Protocol**:
```
Primary Template → Simplified Template → Step-by-Step Template → Human Escalation
```

**Automatic Cleanup Mechanisms**:
- Remove failed attempt artifacts
- Restore clean development states
- Prevent accumulation of broken code
- Maintain pristine environment

**Success Criteria**:
- Error state identified and analyzed
- OODA loop recovery framework applied
- Primary recovery strategy attempted
- Fallback recovery strategies executed if needed
- Clean state restored or human escalation triggered
- System integrity maintained

**Error Handling**:
- If error detection fails, provide detailed error report
- If recovery fails, retry with exponential backoff
- If all automated recovery fails, escalate to human intervention
- If human escalation fails, provide comprehensive error report

## Usage

```bash
error
```

**When to Use**:
- When you encounter any error or issue in the development process
- When automated processes fail or behave unexpectedly
- When you need to recover from a failed state
- When you want to ensure system integrity
- When you need to restore clean development environment

## OODA Loop Error Recovery Framework

**Observe-Orient-Decide-Act Implementation**:
- **Hard stops after 3 failed attempts** with automatic cleanup
- **Graduated retry logic** with exponential backoff
- **Semantic fallback mechanisms** for complex scenarios
- **Checkpoint-and-rollback systems** for clean state restoration

**Error Recovery Protocol**:
```
Primary Template → Simplified Template → Step-by-Step Template → Human Escalation
```

**Automatic Cleanup Mechanisms**:
- Remove failed attempt artifacts
- Restore clean development states
- Prevent accumulation of broken code
- Maintain pristine environment

## Automated Recovery Strategies

**Primary Recovery**:
- **IMMEDIATE FIX**: Attempt to fix the error directly
- **STATE RESTORATION**: Restore to last known good state
- **CONFIGURATION RESET**: Reset configuration to defaults
- **DEPENDENCY RESOLUTION**: Resolve dependency conflicts
- **RESOURCE CLEANUP**: Clean up resources and processes

**Fallback Recovery**:
- **SIMPLIFIED APPROACH**: Use simplified recovery approach
- **STEP-BY-STEP RECOVERY**: Break down recovery into smaller steps
- **ALTERNATIVE STRATEGIES**: Try alternative recovery strategies
- **GRADUAL RESTORATION**: Gradually restore system functionality
- **PARTIAL RECOVERY**: Restore partial functionality if full recovery fails

**Semantic Fallback**:
- **CONTEXT-AWARE RECOVERY**: Use context-aware recovery mechanisms
- **INTELLIGENT FALLBACK**: Apply intelligent fallback strategies
- **ADAPTIVE RECOVERY**: Adapt recovery approach based on error type
- **LEARNING-BASED RECOVERY**: Use learning patterns for recovery
- **PATTERN RECOGNITION**: Recognize error patterns and apply appropriate recovery

## Human Escalation Protocol

**Escalation Triggers**:
- **3 FAILED ATTEMPTS**: After 3 failed automated recovery attempts
- **CRITICAL ERRORS**: For critical errors that require human intervention
- **COMPLEX SCENARIOS**: For complex scenarios beyond automated recovery
- **SYSTEM INTEGRITY**: When system integrity is at risk
- **DATA LOSS RISK**: When there's risk of data loss

**Escalation Process**:
- **COMPREHENSIVE ERROR REPORT**: Provide detailed error information
- **RECOVERY ATTEMPT HISTORY**: Show all attempted recovery strategies
- **CURRENT SYSTEM STATE**: Display current system state
- **RECOMMENDED ACTIONS**: Suggest recommended actions for human
- **CONTEXT PRESERVATION**: Preserve all context for human review

**Human Intervention Support**:
- **DETAILED ERROR CONTEXT**: Provide comprehensive error context
- **RECOVERY OPTIONS**: Present available recovery options
- **SYSTEM STATE ANALYSIS**: Analyze current system state
- **RISK ASSESSMENT**: Assess risks of different recovery approaches
- **RECOMMENDED NEXT STEPS**: Suggest recommended next steps

This command provides automatic error recovery using the OODA loop framework, only escalating to human intervention when automated recovery fails after multiple attempts.
