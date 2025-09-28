# Roadmap Update Command

Comprehensive ticket preparation system that ensures all tickets are properly labeled, prioritized, estimated, and ready for development.

## What This Command Does

**Complete Ticket Preparation Pipeline:**

### **Phase 1: Ticket Metadata Application**
1. **Label Application**: Adds appropriate labels to ALL tickets in the project
2. **Priority Assignment**: Assigns priorities (High, Medium, Low) to ALL tickets
3. **Point System Estimation**: Provides effort estimates using point system (1, 2, 3, 5, 8, 13, 21 points)
4. **Metadata Validation**: Ensures all tickets have required metadata

### **Phase 2: Planning Column Management**
1. **Planning Queue Management**: Maintains 3-5 tickets in the planning column
2. **Ticket Preparation**: Prepares tickets for development pickup
3. **Clarity Assessment**: Evaluates ticket clarity and completeness
4. **Queue Optimization**: Optimizes planning queue for efficient development

### **Phase 3: Ticket Enhancement**
1. **Clarification Questions**: Adds comment with questions for unclear tickets
2. **Requirement Enhancement**: Adds more details to clear tickets
3. **Estimate Refinement**: Provides detailed point estimates for clear tickets
4. **Development Readiness**: Ensures tickets are ready for development pickup

## Implementation

**References**: `linear-project-manager.mdc`, `requirement-processing.mdc`, `linear-ticket-manager.mdc`

**Required Actions**:

**Phase 1: Ticket Metadata Application**
- **QUERY ALL TICKETS**: Get every single ticket in the Linear project using Linear API
- **FETCH AVAILABLE LABELS**: Get all available labels from Linear team/project
- **LABEL ALL TICKETS**: Apply EXACTLY 2 labels per ticket (category + type/priority)
- **PRIORITY ALL TICKETS**: Assign priorities (High, Medium, Low) to EVERY ticket
- **POINT ESTIMATION**: Apply point estimates DIRECTLY to tickets using estimate field (1, 2, 3, 5, 8, 13, 21)
- **METADATA VALIDATION**: Ensure ALL tickets have required metadata
- **CONSISTENCY CHECK**: Maintain consistent labeling and priority systems
- **NO EXCEPTIONS**: Process every single ticket, don't skip any

**Phase 2: Planning Column Management**
- **ANALYZE PLANNING COLUMN**: Check current tickets in planning column
- **MAINTAIN QUEUE SIZE**: Ensure planning column has 3-5 tickets
- **SELECT TICKETS FOR PLANNING**: Choose appropriate tickets to move to planning
- **MOVE TICKETS TO PLANNING**: Transition selected tickets to planning state using state transitions
- **QUEUE OPTIMIZATION**: Optimize planning queue for efficient development
- **PRIORITY RESPECT**: Respect ticket priorities when selecting for planning
- **DEPENDENCY CONSIDERATION**: Consider ticket dependencies for planning queue
- **STATE TRANSITIONS**: Use Linear API to move tickets to planning state

**Phase 3: Ticket Enhancement**
- **CLARITY ASSESSMENT**: Evaluate ticket clarity and completeness
- **CLARIFICATION QUESTIONS**: Add comment with questions for unclear tickets
- **REQUIREMENT ENHANCEMENT**: Add more details to clear tickets
- **ESTIMATE REFINEMENT**: Provide detailed point estimates for clear tickets
- **DEVELOPMENT READINESS**: Ensure tickets are ready for development pickup

**Point System Guidelines**:
- **1 Point**: Trivial tasks (5-15 minutes)
- **2 Points**: Simple tasks (15-30 minutes)
- **3 Points**: Small tasks (30-60 minutes)
- **5 Points**: Medium tasks (1-2 hours)
- **8 Points**: Large tasks (2-4 hours)
- **13 Points**: Very large tasks (4-8 hours)
- **21 Points**: Epic tasks (8+ hours)

**Success Criteria**:
- **ALL TICKETS PROCESSED**: Every single ticket in the project has been processed
- **ALL TICKETS LABELED**: Every ticket has appropriate labels applied
- **ALL TICKETS PRIORITIZED**: Every ticket has assigned priorities
- **ALL TICKETS ESTIMATED**: Every ticket has point estimates
- **PLANNING QUEUE MANAGED**: Planning column contains 3-5 tickets
- **TICKETS MOVED TO PLANNING**: Selected tickets have been moved to planning state
- **UNCLARITY HANDLED**: Unclear tickets have clarification questions
- **CLEAR TICKETS ENHANCED**: Clear tickets have enhanced requirements and estimates
- **ALL TICKETS DEVELOPMENT-READY**: All tickets are ready for development pickup

**Error Handling**:
- If Linear API fails, retry with exponential backoff
- If metadata application fails, provide detailed error report
- If planning queue management fails, escalate to human review
- If ticket enhancement fails, retry with simplified approach

## Usage

```bash
roadmap-update
```

**When to Use**:
- When you need to prepare tickets for development pickup
- When you want to ensure all tickets have proper metadata
- When you need to maintain planning queue (3-5 tickets)
- When you want to add clarification questions to unclear tickets
- When you need to enhance clear tickets with more details
- When you want to provide point estimates for all tickets

## Ticket Metadata Application

**Label Application**:
- **EXACTLY 2 LABELS PER TICKET**: Apply exactly 2 labels to each ticket
- **CATEGORY LABEL**: Apply category label (e.g., "Database", "Frontend", "Backend", "Security", "Features", "Business")
- **TYPE/PRIORITY LABEL**: Apply type or priority label (e.g., "Critical", "High", "Medium", "Low", "Foundation", "Core")
- **CONSISTENT NAMING**: Use consistent label names across all tickets
- **NO MORE THAN 2**: Never apply more than 2 labels per ticket
- **NO LESS THAN 2**: Never apply less than 2 labels per ticket

**Priority Assignment**:
- **HIGH PRIORITY**: Critical features, urgent bugs, blocking issues
- **MEDIUM PRIORITY**: Important features, non-urgent bugs, enhancements
- **LOW PRIORITY**: Nice-to-have features, minor improvements, technical debt
- **PRIORITY CRITERIA**: Based on business impact, user value, and technical urgency
- **CONSISTENCY**: Maintain consistent priority application across all tickets

**Point System Estimation**:
- **DIRECT APPLICATION**: Apply point estimates DIRECTLY to tickets using estimate field
- **NO COMMENTS**: Do NOT add point estimates as comments
- **EFFORT-BASED**: Estimate based on development effort required
- **COMPLEXITY CONSIDERATION**: Consider technical complexity and unknowns
- **HISTORICAL DATA**: Use historical data for similar tickets
- **RISK FACTOR**: Include risk factor in estimation
- **CONSISTENCY**: Maintain consistent estimation approach

## Planning Column Management

**Queue Size Management**:
- **MINIMUM**: Always maintain at least 3 tickets in planning
- **MAXIMUM**: Never exceed 5 tickets in planning
- **OPTIMAL**: Target 4 tickets in planning for optimal flow
- **BALANCE**: Balance between having enough work and not overwhelming developers

**Ticket Selection Criteria**:
- **PRIORITY RESPECT**: Select tickets based on assigned priorities
- **DEPENDENCY CONSIDERATION**: Consider ticket dependencies and prerequisites
- **READINESS ASSESSMENT**: Select tickets that are ready for development
- **VARIETY**: Include variety of ticket types and complexities
- **FLOW OPTIMIZATION**: Optimize for smooth development flow

**Queue Optimization**:
- **PRIORITY ORDERING**: Order tickets by priority within planning queue
- **DEPENDENCY RESPECT**: Respect ticket dependencies in queue ordering
- **COMPLEXITY BALANCE**: Balance simple and complex tickets
- **DEVELOPER PREFERENCE**: Consider developer preferences and expertise
- **FLOW EFFICIENCY**: Optimize for efficient development flow

## Ticket Enhancement

**Clarity Assessment**:
- **REQUIREMENT CLARITY**: Assess if requirements are clear and specific
- **ACCEPTANCE CRITERIA**: Check if acceptance criteria are well-defined
- **TECHNICAL CLARITY**: Assess technical implementation clarity
- **SCOPE DEFINITION**: Check if scope is well-defined
- **DEPENDENCY CLARITY**: Assess dependency clarity

**Clarification Questions**:
- **REQUIREMENT QUESTIONS**: Ask questions about unclear requirements
- **TECHNICAL QUESTIONS**: Ask questions about technical implementation
- **SCOPE QUESTIONS**: Ask questions about scope and boundaries
- **DEPENDENCY QUESTIONS**: Ask questions about dependencies
- **ACCEPTANCE QUESTIONS**: Ask questions about acceptance criteria

**Requirement Enhancement**:
- **DETAILED REQUIREMENTS**: Add more detailed requirements to clear tickets
- **ACCEPTANCE CRITERIA**: Enhance acceptance criteria for clear tickets
- **TECHNICAL SPECIFICATIONS**: Add technical specifications for clear tickets
- **IMPLEMENTATION NOTES**: Add implementation notes for clear tickets
- **TESTING REQUIREMENTS**: Add testing requirements for clear tickets

**Estimate Refinement**:
- **DETAILED BREAKDOWN**: Provide detailed breakdown of effort
- **COMPONENT ESTIMATES**: Estimate individual components
- **RISK CONSIDERATION**: Include risk factors in estimates
- **DEPENDENCY IMPACT**: Consider dependency impact on estimates
- **HISTORICAL VALIDATION**: Validate estimates against historical data

This command provides comprehensive ticket preparation to ensure all tickets are properly labeled, prioritized, estimated, and ready for development pickup.
