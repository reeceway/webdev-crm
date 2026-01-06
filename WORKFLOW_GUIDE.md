# Complete Sales Workflow Guide

## Lead → Pipeline → Client Automation

Your CRM now has a complete automated workflow that takes prospects from initial lead through to paying client with automatic task creation at every stage.

---

## 🎯 The Complete Journey

```
LEAD → PIPELINE → CLIENT
 ↓        ↓         ↓
New  Qualification  Won
     Meeting
     Proposal
     Negotiation
```

---

## 📋 Stage 1: Lead Management

### Creating Leads
1. **Manual Entry**: Add leads through the "Add Lead" button
2. **Lead Finder**: Use Google Places integration to find businesses
3. **Import**: Bulk import from CSV

### Lead Actions
- **Audit & Save**: Run SEO audit and save results to notes
- **Add to Pipeline**: Move lead to active sales pipeline
- **Convert to Client**: Skip pipeline, go straight to client (for hot leads)

---

## 🔄 Stage 2: Pipeline (Active Sales)

### Moving Lead to Pipeline

**Endpoint**: `POST /api/pipeline/from-lead/:leadId`

**What Happens Automatically**:
1. ✅ Lead status updated to "qualified"
2. ✅ Pipeline deal created with contact info
3. ✅ **3 tasks automatically created** for initial outreach
4. ✅ Activity log entry added

**Auto-Created Tasks (Qualification Stage)**:
| Task | Priority | Due Date | Description |
|------|----------|----------|-------------|
| Initial outreach call | High | Today | Contact lead and introduce services |
| Research company needs | Medium | Today | Review their website and identify pain points |
| Send introduction email | Medium | Tomorrow | Follow up with email outlining services |

### Pipeline Stages & Auto-Tasks

#### 1️⃣ **Qualification** (20% probability)
Moving to this stage creates:
- ☎️ Initial outreach call (Due: Day 0)
- 🔍 Research company needs (Due: Day 0)
- ✉️ Send introduction email (Due: Day 1)

#### 2️⃣ **Meeting** (40% probability)
Moving to this stage creates:
- 📅 Schedule discovery call (Due: Day 0)
- 📝 Prepare meeting agenda (Due: Day 1)
- 📧 Send meeting invite (Due: Day 1)

#### 3️⃣ **Proposal** (60% probability)
Moving to this stage creates:
- 📄 Create project proposal (Due: Day 0)
- 🎨 Design mockups/wireframes (Due: Day 2)
- 📨 Send proposal (Due: Day 3)

#### 4️⃣ **Negotiation** (80% probability)
Moving to this stage creates:
- 💬 Review proposal feedback (Due: Day 0)
- 🤝 Negotiate terms (Due: Day 1)
- 📋 Prepare contract (Due: Day 2)

#### 5️⃣ **Closed Won** (100% probability)
Ready to convert to client!

#### 6️⃣ **Closed Lost** (0% probability)
Deal didn't work out - archive

### Changing Pipeline Stages

**Endpoint**: `PATCH /api/pipeline/:id/stage`

**Request Body**:
```json
{
  "stage": "meeting",
  "create_tasks": true  // Set to false to skip auto-task creation
}
```

**What Happens**:
1. Deal moved to new stage
2. Probability automatically updated
3. New tasks created for the stage
4. Activity logged with task count

---

## 👥 Stage 3: Client Conversion

### Convert Won Deal to Client

**Endpoint**: `POST /api/pipeline/:id/convert-to-client`

**What Happens Automatically**:
1. ✅ Company created (if company name exists)
2. ✅ Client contact created
3. ✅ Pipeline stage set to "closed_won"
4. ✅ Original lead marked as "won"
5. ✅ Activity logged

**Result**:
```json
{
  "message": "Deal converted to client successfully",
  "client": { ... },
  "company": { ... },
  "deal_id": 123
}
```

---

## 🔧 API Endpoints Reference

### Lead to Pipeline
```bash
POST /api/pipeline/from-lead/:leadId
{
  "deal_name": "Website Redesign Project",
  "deal_value": 8000,
  "stage": "qualification",
  "scheduled_date": "2026-01-10"
}
```

### Update Stage (with auto-tasks)
```bash
PATCH /api/pipeline/:id/stage
{
  "stage": "meeting",
  "create_tasks": true
}
```

### Convert to Client
```bash
POST /api/pipeline/:id/convert-to-client
```

---

## 📊 Task Management

### Viewing Tasks
- **By Pipeline**: Tasks linked to specific deals
- **By Lead**: Tasks associated with original lead
- **Tasks Page**: All tasks across all stages

### Task Properties
- **Title**: What needs to be done
- **Description**: Details and context
- **Priority**: high, medium, low
- **Due Date**: Auto-calculated based on stage
- **Assigned To**: Automatically assigned to deal owner
- **Status**: pending, in_progress, completed

### Completing Tasks
Mark tasks as complete as you work through the pipeline. This helps track progress and ensures nothing falls through the cracks.

---

## 🎬 Example Workflow

### Day 1: New Lead
```
1. Find lead via Google Places
2. Lead: "ABC Plumbing" added
3. Run "Audit & Save" - SEO score: 45/100
```

### Day 2: Move to Pipeline
```
1. Click "Add to Pipeline" on lead
2. System creates:
   - Pipeline deal: "ABC Plumbing - Website Project"
   - Task 1: "Initial outreach call" (Due: Today)
   - Task 2: "Research company needs" (Due: Today)
   - Task 3: "Send introduction email" (Due: Tomorrow)
3. Lead status → "qualified"
```

### Day 3: First Call Success
```
1. Complete "Initial outreach call" task
2. Add activity: "Had great call, interested in redesign"
3. Move to "meeting" stage
4. System creates:
   - Task: "Schedule discovery call" (Due: Today)
   - Task: "Prepare meeting agenda" (Due: Tomorrow)
   - Task: "Send meeting invite" (Due: Tomorrow)
```

### Week 2: Meeting Completed
```
1. Complete meeting tasks
2. Move to "proposal" stage
3. System creates:
   - Task: "Create project proposal" (Due: Today)
   - Task: "Design mockups/wireframes" (Due: +2 days)
   - Task: "Send proposal" (Due: +3 days)
```

### Week 3: Proposal Accepted
```
1. Move to "negotiation" stage
2. Complete negotiation tasks
3. Final terms agreed!
```

### Week 4: Deal Won!
```
1. Click "Convert to Client"
2. System creates:
   - Company: "ABC Plumbing"
   - Client: "John Doe" (primary contact)
3. Pipeline → "closed_won"
4. Lead → "won"
5. Ready to start project!
```

---

## 💡 Pro Tips

### 1. Customize Task Templates
Edit the task templates in `backend/src/routes/pipeline.js` to match your sales process.

### 2. Skip Auto-Tasks When Needed
Set `create_tasks: false` when changing stages if you want manual control.

### 3. Use Activity Log
Add notes at each stage to track conversations, decisions, and next steps.

### 4. Bulk Operations
Move multiple leads to pipeline at once (future feature).

### 5. Pipeline Analytics
Track conversion rates, average deal time, and success rates by stage.

---

## 🔒 Permissions

All pipeline operations require authentication:
- Tasks assigned to deal owner or user who created the deal
- Activity logs track who made each change
- Full audit trail maintained

---

## 📈 Metrics to Track

- **Conversion Rate**: Leads → Pipeline → Client %
- **Stage Duration**: Time spent in each stage
- **Task Completion**: % of tasks completed on time
- **Win Rate**: Deals won vs lost
- **Average Deal Value**: Track revenue by source/industry

---

## 🚀 Next Steps

1. **Test the workflow** with a sample lead
2. **Customize task templates** for your business
3. **Train your team** on the pipeline stages
4. **Monitor metrics** to optimize your process
5. **Iterate and improve** based on what works

---

## 🐛 Troubleshooting

**Tasks not creating?**
- Check `create_tasks` parameter is `true`
- Verify stage name is valid
- Check backend logs for errors

**Deal not converting to client?**
- Ensure deal stage is "closed_won"
- Verify company name is present
- Check contact information is complete

**Activity log empty?**
- Activities are auto-created on stage changes
- Manually add notes via pipeline activities endpoint

---

## 📚 Related Documentation

- [PRODUCTION_FIXES.md](./PRODUCTION_FIXES.md) - Railway deployment guide
- [README.md](./README.md) - General CRM overview
- API Docs: Check `/api/` endpoints for full reference

---

**Built with automation in mind. Focus on selling, not on admin work.** 🎯
