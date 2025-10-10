# MVP Implementation Plan - Epic 4B

**Status:** 🚀 IN PROGRESS  
**Start Date:** January 2025  
**Target Completion:** 27 days (~5-6 weeks)  
**Selected Stories:** 5 of 9

---

## 📋 Selected Stories for MVP

### Story Selection Rationale

You've selected a **strategic mix** that covers:
- ✅ **Revenue Generation** (Ads & Targeting)
- ✅ **Data Foundation** (Enhanced Onboarding)
- ✅ **Quality & Compliance** (Media Rules & Data Retention)
- ⚠️ **Deferred:** Redemption (4B.1), Billing UI (4B.5), QR Codes (4B.6), Pricing Engine (4B.9)

This is a **smart MVP scope** that builds the backend foundation and business owner tools while deferring customer-facing features.

---

## 🎯 MVP Stories Overview

| # | Story | Priority | Effort | Type | Dependencies |
|---|-------|----------|--------|------|-------------|
| 1 | 4B.2 - Ad Request & Approval | 🔴 P0 | 8 days | Revenue | None |
| 2 | 4B.3 - Targeted Campaigns | 🔴 P0 | 10 days | Revenue | 4B.2, 4B.4 |
| 3 | 4B.4 - Enhanced Onboarding | 🟠 P1 | 5 days | Data | None |
| 4 | 4B.7 - Media Management | 🟡 P2 | 3 days | Quality | None |
| 5 | 4B.8 - Data Retention | 🟡 P2 | 3 days | Compliance | None |

**Total Effort:** 29 days  
**Critical Path:** 4B.4 → 4B.2 → 4B.3 (23 days)  
**Parallel Work:** 4B.7, 4B.8 (can run concurrently)

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Week 1-2) - 13 days

#### Week 1: Data Foundation & Media
```
Day 1-3: 4B.7 - Media Management Rules (Independent)
├─ Day 1: Schema & Validation
├─ Day 2: Upload & Processing
└─ Day 3: UI & Testing

Day 1-3: 4B.8 - Data Retention (Parallel with 4B.7)
├─ Day 1: Schema & Policies
├─ Day 2: Jobs & Automation
└─ Day 3: UI & Workflow

Day 4-8: 4B.4 - Enhanced Onboarding
├─ Day 4: Schema (customer profiles, metrics, goals)
├─ Day 5: API Endpoints
├─ Day 6-7: Onboarding Wizard UI (3 new steps)
├─ Day 8: Testing & Polish
```

**Deliverables Week 1-2:**
- ✅ Media upload limits enforced
- ✅ Data retention policies active
- ✅ Rich business profiles collected

---

### Phase 2: Ad System (Week 3-4) - 8 days

#### Week 3: Ad Request System
```
Day 9-10: 4B.2 Database & Schema
├─ Create ad_requests table
├─ Create ad_request_history table
├─ Update unbilled_amounts table
├─ Add RLS policies
└─ Seed test data

Day 11-12: 4B.2 API Endpoints
├─ Business ad creation endpoints
├─ Business ad management endpoints
├─ Admin approval endpoints
├─ Billing integration logic
└─ Notification triggers

Day 13-14: 4B.2 Business UI
├─ Ad request form with wizard
├─ Media upload component
├─ My Ads page
├─ Status indicators
└─ Notification integration

Day 15-16: 4B.2 Admin UI & Testing
├─ Approval queue page
├─ Ad review panel
├─ Bulk actions
├─ Integration tests
└─ E2E scenarios
```

**Deliverables Week 3-4:**
- ✅ Businesses can submit ad requests
- ✅ Admins can approve/reject ads
- ✅ Billing records created
- ✅ Notifications sent

---

### Phase 3: Targeted Campaigns (Week 5-6) - 10 days

#### Week 5-6: Advanced Targeting
```
Day 17-18: 4B.3 Database & Segmentation
├─ Create driver_activity_scores table
├─ Add demographic fields to users
├─ Create user_interests table
├─ Create campaign_targets table
├─ Create segment_performance table
└─ Background job for activity scoring

Day 19-20: 4B.3 Reach Estimation Engine
├─ Build estimation algorithm
├─ Create API endpoint
├─ Test various targeting combos
├─ Optimize performance
└─ Add caching

Day 21-23: 4B.3 UI Components
├─ Audience Builder component
├─ Location targeting map
├─ Reach estimator display
├─ Segment performance dashboard
└─ Integration with campaign form

Day 24-26: 4B.3 Interest Tracking & Testing
├─ Track coupon collections
├─ Track business visits
├─ Calculate interest scores
├─ Background job for updates
├─ Integration tests
└─ E2E scenarios
```

**Deliverables Week 5-6:**
- ✅ Driver segmentation (Top 10%, 25%, Active)
- ✅ Demographic targeting (age, gender, income)
- ✅ Location targeting (radius, zones)
- ✅ Interest-based targeting
- ✅ Reach estimation engine
- ✅ Performance tracking by segment

---

## 🔄 Parallel Development Strategy

### Team Track Suggestions

#### Track 1: Backend Foundation (Developer A)
```
Week 1: 4B.4 + 4B.8 (schemas, APIs, jobs)
Week 2: 4B.2 (schemas, APIs)
Week 3-4: 4B.3 (schemas, APIs, algorithms)
```

#### Track 2: UI & Frontend (Developer B)
```
Week 1: 4B.7 (media uploader, gallery)
Week 2: 4B.4 (onboarding wizard)
Week 3: 4B.2 (business ad UI)
Week 4-5: 4B.3 (audience builder, targeting UI)
```

#### Track 3: Admin & Polish (Developer C)
```
Week 1: 4B.8 (admin dashboard)
Week 2-3: 4B.2 (admin approval queue)
Week 4-5: 4B.3 (analytics dashboard)
Week 5-6: Testing & QA
```

---

## ✅ Pre-Implementation Checklist

### Development Environment
- [ ] Local development environment set up
- [ ] Supabase project accessible
- [ ] Database migrations working
- [ ] Frontend dev server running
- [ ] Environment variables configured
- [ ] MCP tools configured (Supabase, Context7)

### Code Review Setup
- [ ] Branch naming convention agreed
- [ ] PR template created
- [ ] Code review process defined
- [ ] Testing requirements clear
- [ ] Definition of done checklist

### Project Tracking
- [ ] Sprint board created (GitHub Projects/Jira)
- [ ] Story cards created
- [ ] Daily standup time set
- [ ] Sprint planning completed
- [ ] Retrospective scheduled

---

## 📊 Story Details & Acceptance Criteria

### Story 4B.2: Ad Request & Approval Workflow (8 days)

**Key Features:**
- [ ] Ad request form (text, image, video)
- [ ] Admin approval queue
- [ ] Approve/reject workflow
- [ ] Billing integration
- [ ] Status notifications

**Database Tables:**
- `ad_requests` (new)
- `ad_request_history` (new)
- `unbilled_amounts` (update)

**API Endpoints:** 7 endpoints
**React Components:** 6 components
**Background Jobs:** None

**Acceptance:**
- [ ] Businesses can create ad requests
- [ ] Admins see pending requests
- [ ] Approval creates billing record
- [ ] Email notifications sent
- [ ] Ad status tracked

---

### Story 4B.3: Targeted Campaigns System (10 days)

**Key Features:**
- [ ] Driver activity segmentation (Top 10%, 25%)
- [ ] Demographic targeting (age, gender, income)
- [ ] Location targeting (radius, zones)
- [ ] Interest-based targeting
- [ ] Reach estimation engine
- [ ] Performance tracking

**Database Tables:**
- `driver_activity_scores` (new)
- `users` (update - demographics)
- `user_interests` (new)
- `campaign_targets` (new)
- `campaign_segment_performance` (new)

**API Endpoints:** 4 endpoints
**React Components:** 4 components
**Background Jobs:** 2 (activity scoring, interest tracking)

**Acceptance:**
- [ ] Activity scores calculated daily
- [ ] Audience builder UI functional
- [ ] Reach estimation accurate (>90%)
- [ ] Segment performance tracked
- [ ] Map-based location targeting

---

### Story 4B.4: Enhanced Business Onboarding (5 days)

**Key Features:**
- [ ] Multi-step onboarding wizard
- [ ] Customer profile collection
- [ ] Business metrics input
- [ ] Marketing goals setup
- [ ] Profile completion tracking

**Database Tables:**
- `businesses` (update)
- `business_customer_profiles` (new)
- `business_metrics` (new)
- `business_marketing_goals` (new)
- `business_onboarding_progress` (new)

**API Endpoints:** 5 endpoints
**React Components:** 5 components
**Background Jobs:** None

**Acceptance:**
- [ ] 5-step onboarding wizard
- [ ] Auto-save drafts
- [ ] Profile completion widget
- [ ] Edit after onboarding
- [ ] Completion rate >80%

---

### Story 4B.7: Media Management Rules (3 days)

**Key Features:**
- [ ] Max 4 images per item
- [ ] Max 1 video (60s) per item
- [ ] Upload state tracking
- [ ] Video transcoding
- [ ] Thumbnail generation

**Database Tables:**
- `media` (update)
- `media_processing_queue` (new)

**API Endpoints:** 5 endpoints
**React Components:** 4 components
**Background Jobs:** 4 (transcode, thumbnail, optimize, cleanup)

**Acceptance:**
- [ ] Upload limits enforced
- [ ] Video transcoding works
- [ ] Progress tracking visible
- [ ] Error handling with retry
- [ ] Thumbnail auto-generated

---

### Story 4B.8: Data Retention System (3 days)

**Key Features:**
- [ ] Retention policies by data type
- [ ] Automated warnings (7, 3, 1 day)
- [ ] Override request workflow
- [ ] Archive before delete
- [ ] Audit logging

**Database Tables:**
- `data_retention_policies` (new)
- `retention_warnings` (new)
- `retention_override_requests` (new)
- `retention_archives` (new)
- `retention_audit_log` (new)

**API Endpoints:** 9 endpoints
**React Components:** 4 components
**Background Jobs:** 4 (check, warn, archive, delete)

**Acceptance:**
- [ ] Policies configurable
- [ ] Warnings sent automatically
- [ ] Override workflow functional
- [ ] Archive to cold storage
- [ ] Audit trail complete

---

## 🧪 Testing Strategy

### Unit Testing
- **Target:** >80% code coverage
- **Focus:** Business logic, calculations, validation
- **Tools:** Jest, React Testing Library

### Integration Testing
- **Target:** All API endpoints
- **Focus:** Database operations, API flows
- **Tools:** Supertest, Supabase test client

### E2E Testing
- **Target:** Critical user flows
- **Focus:** End-to-end scenarios
- **Tools:** Playwright or Cypress

### Test Milestones
- [ ] Day 3: 4B.7 & 4B.8 tested
- [ ] Day 8: 4B.4 tested
- [ ] Day 16: 4B.2 tested
- [ ] Day 26: 4B.3 tested
- [ ] Day 27-29: Full regression testing

---

## 📈 Success Metrics

### Phase 1 Success (End of Week 2)
- [ ] Media upload success rate >98%
- [ ] Retention policies execute successfully
- [ ] Onboarding completion rate >80%
- [ ] Profile data completeness >90%

### Phase 2 Success (End of Week 4)
- [ ] 10+ ad requests submitted
- [ ] Ad approval time <24 hours
- [ ] Billing records created correctly
- [ ] Zero critical bugs

### Phase 3 Success (End of Week 6)
- [ ] Activity segmentation working
- [ ] Reach estimation accuracy >90%
- [ ] Campaign targeting functional
- [ ] Performance tracking active

### Overall MVP Success
- [ ] All 5 stories deployed to production
- [ ] Zero P0/P1 bugs
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Handoff to operations complete

---

## 🚨 Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Video transcoding complexity | High | Medium | Use Cloudinary instead of FFmpeg |
| Reach estimation accuracy | High | Medium | Start with simple rules, iterate |
| Performance with large datasets | Medium | Medium | Add caching, optimize queries |
| Background job failures | Medium | Low | Implement retry logic, monitoring |

### Schedule Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Story 4B.3 takes longer | High | Medium | Start early, reduce scope if needed |
| Integration issues | Medium | Medium | Integration testing throughout |
| Resource availability | High | Low | Cross-train team members |
| Scope creep | Medium | Medium | Strict change control process |

---

## 📋 Daily Standup Template

```markdown
### Date: [MM/DD/YYYY]

**Yesterday:**
- What was completed?
- Any blockers encountered?

**Today:**
- What will be worked on?
- Which story/task?

**Blockers:**
- Any impediments?
- Need help with anything?

**Notes:**
- Any updates or decisions needed?
```

---

## 🎯 Sprint Goals

### Sprint 1 (Week 1-2): Foundation
**Goal:** Complete data foundation stories (4B.4, 4B.7, 4B.8)

**Success Criteria:**
- All schemas deployed
- Background jobs running
- Basic UI functional
- Tests passing

### Sprint 2 (Week 3-4): Ad System
**Goal:** Complete ad request and approval workflow (4B.2)

**Success Criteria:**
- Businesses can submit ads
- Admins can approve/reject
- Billing integration works
- Notifications sending

### Sprint 3 (Week 5-6): Targeting
**Goal:** Complete targeted campaigns system (4B.3)

**Success Criteria:**
- Segmentation working
- Audience builder functional
- Reach estimation accurate
- Performance tracking active

---

## 📚 Documentation Requirements

### Developer Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema diagrams
- [ ] Component documentation (Storybook)
- [ ] Background job documentation
- [ ] Setup/deployment guides

### User Documentation
- [ ] Business owner guides
  - [ ] How to create ad requests
  - [ ] How to use targeting
  - [ ] How to complete onboarding
- [ ] Admin guides
  - [ ] How to approve ads
  - [ ] How to manage retention policies
  - [ ] How to handle overrides

### Operational Documentation
- [ ] Monitoring setup
- [ ] Alert configuration
- [ ] Backup procedures
- [ ] Rollback procedures
- [ ] Incident response plan

---

## 🔍 Code Review Checklist

### For Each PR
- [ ] Code follows style guide
- [ ] Tests included and passing
- [ ] No console.log or debug code
- [ ] Error handling comprehensive
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Backwards compatible
- [ ] Reviewed by at least 1 person

---

## 🚀 Deployment Strategy

### Staging Deployment
- Deploy after each story completion
- Run full test suite
- QA sign-off required

### Production Deployment
- Deploy at end of each sprint
- Feature flags for gradual rollout
- Monitoring dashboard active
- Rollback plan ready

### Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables set
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Deploy to staging
- [ ] QA approval
- [ ] Deploy to production
- [ ] Smoke tests passed

---

## 📞 Team Communication

### Daily Standup
- **Time:** [To be scheduled]
- **Duration:** 15 minutes
- **Platform:** [Zoom/Teams/Discord]

### Sprint Planning
- **Frequency:** Bi-weekly
- **Duration:** 1 hour
- **Participants:** Full team

### Sprint Retrospective
- **Frequency:** Bi-weekly
- **Duration:** 1 hour
- **Focus:** What went well, what to improve

### Ad-hoc Communication
- **Slack/Discord:** For quick questions
- **GitHub:** For code-related discussions
- **Email:** For documentation and decisions

---

## 📁 File Organization

### Story Files
```
docs/
├── MVP_IMPLEMENTATION_PLAN.md (this file)
├── STORY_4B.2_Ad_Request_Approval_Workflow.md
├── STORY_4B.3_Targeted_Campaigns_System.md
├── STORY_4B.4_Enhanced_Business_Onboarding.md
├── STORY_4B.7_Media_Management_Rules.md
└── STORY_4B.8_Data_Retention_System.md
```

### Code Organization
```
src/
├── components/
│   ├── business/
│   │   ├── ads/
│   │   ├── campaigns/
│   │   ├── onboarding/
│   │   └── media/
│   ├── admin/
│   │   ├── ads/
│   │   └── retention/
│   └── common/
│       ├── media/
│       └── retention/
├── hooks/
│   ├── useAdRequest.ts
│   ├── useAudienceTargeting.ts
│   ├── useOnboarding.ts
│   ├── useMediaUpload.ts
│   └── useRetention.ts
├── lib/
│   ├── pricing/
│   ├── segmentation/
│   └── media/
└── pages/
    └── api/
```

---

## ✅ Definition of Done (MVP)

### Code Complete
- [ ] All 5 stories implemented
- [ ] All acceptance criteria met
- [ ] All tests passing (>80% coverage)
- [ ] No P0/P1 bugs
- [ ] Code reviewed and merged

### Testing Complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Security review completed

### Documentation Complete
- [ ] API documentation
- [ ] User guides
- [ ] Admin guides
- [ ] Deployment guides
- [ ] README updated

### Deployment Complete
- [ ] Deployed to staging
- [ ] QA sign-off obtained
- [ ] Deployed to production
- [ ] Monitoring active
- [ ] Team trained

### Business Ready
- [ ] Demo completed
- [ ] User acceptance testing passed
- [ ] Stakeholder sign-off
- [ ] Marketing materials ready
- [ ] Support team trained

---

## 🎓 Next Steps After MVP

### Deferred Stories (Phase 2)
1. **Story 4B.1** - Merchant Redemption Interface (5 days)
2. **Story 4B.5** - Billing Integration UI (6 days)
3. **Story 4B.6** - QR Code & Barcode Generation (3 days)
4. **Story 4B.9** - Pricing Engine Integration (3 days)

**Total Phase 2:** 17 days (~3-4 weeks)

### Future Enhancements
- Advanced analytics dashboard
- A/B testing for ads
- Automated seasonal pricing
- AI-powered targeting recommendations
- Mobile app integration

---

**MVP Implementation Plan Status:** ✅ READY TO START  
**Estimated Completion:** 5-6 weeks  
**Team Size Needed:** 2-3 developers  
**Go/No-Go Decision:** [To be filled]

