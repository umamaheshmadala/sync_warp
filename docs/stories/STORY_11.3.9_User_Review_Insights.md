# Story 11.3.9: User Review Insights (Impact Metrics, History)

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 2 days  
**Dependencies:** Story 11.3.1 (Helpful Votes for impact data)  
**Status:** 📋 Ready for Implementation

---

## Overview

Enhance the My Reviews page with impact metrics and contribution history. Users can see how their reviews are performing (helpful counts, views) and track their contribution over time. NO reviewer rank/level or badges (user declined).

---

## Problem Statement

### Current State
- `MyReviewsPage.tsx` exists and shows user's reviews
- No impact metrics (helpful counts, etc.)
- No historical view or trends

### Desired State
- Show helpful vote counts on each review
- Summary statistics (total reviews, total helpful, etc.)
- Contribution timeline/history
- NO ranks, levels, or badges

---

## User Stories

### US-11.3.9.1: Review Impact Metrics
**As a** reviewer  
**I want to** see how my reviews are performing  
**So that** I know if my feedback is helpful to others

**Acceptance Criteria:**
- [ ] Each review shows helpful count
- [ ] Shows if business responded
- [ ] Shows when review was posted/edited
- [ ] Highlight well-received reviews (>5 helpful)

---

### US-11.3.9.2: Summary Statistics
**As a** reviewer  
**I want to** see my overall contribution stats  
**So that** I understand my impact

**Acceptance Criteria:**
- [ ] Total reviews written
- [ ] Total helpful votes received
- [ ] Total business responses received
- [ ] Reviews by recommendation type (👍/👎 split)
- [ ] Displayed at top of My Reviews page

---

### US-11.3.9.3: Contribution History Timeline
**As a** reviewer  
**I want to** see my review history over time  
**So that** I can track my contribution pattern

**Acceptance Criteria:**
- [ ] List of reviews ordered by date
- [ ] Filter by year/month
- [ ] Shows business name and rating for each
- [ ] Expandable to see full review text

---

### US-11.3.9.4: Review Views Tracking
**As a** reviewer  
**I want to** see how many times my reviews were viewed  
**So that** I understand my review's reach

**Acceptance Criteria:**
- [ ] Track when a user opens/views a review
- [ ] Log view in `review_views` table (reviewer_id, viewer_id, timestamp)
- [ ] De-duplicate: count unique viewers, not total clicks
- [ ] Show "Your reviews viewed X times" in stats summary
- [ ] Show view count on each review card in My Reviews
- [ ] Exclude own views from count
- [ ] Real-time increment when viewed

**View Tracking Rules:**
- View is logged when review card is fully visible (Intersection Observer with threshold > 0.5)
- Minimum viewing time: 2 seconds (prevent scroll-past counting)
- Only logged for authenticated users
- Same user viewing same review again within 24h = no new log

---

### US-11.3.9.5: No Ranking or Badges
**As a** platform  
**We will NOT** implement:
- Reviewer ranking/level system
- Badges earned display
- Leaderboards

(Per user decision - keep reviews authentic without gamification)

---

## Technical Requirements

### Database View for User Review Stats

```sql
-- ============================================
-- Review Views Tracking Table
-- Story: 11.3.9 (US-11.3.9.4)
-- ============================================

CREATE TABLE IF NOT EXISTS review_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_view_per_day UNIQUE (review_id, viewer_id, (viewed_at::DATE))
);

CREATE INDEX idx_review_views_review ON review_views(review_id);
CREATE INDEX idx_review_views_viewer ON review_views(viewer_id);

-- RLS: Anyone can insert (for tracking), users see their own views
ALTER TABLE review_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log views"
ON review_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Reviewers can see view counts on their reviews"
ON review_views FOR SELECT
USING (
  viewer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM business_reviews br 
    WHERE br.id = review_id AND br.user_id = auth.uid()
  )
);

-- ============================================
-- User Review Statistics View (Updated)
-- Includes total views
-- ============================================

CREATE OR REPLACE VIEW user_review_stats AS
SELECT 
  br.user_id,
  COUNT(*) AS total_reviews,
  SUM(CASE WHEN br.recommendation THEN 1 ELSE 0 END) AS recommend_count,
  SUM(CASE WHEN NOT br.recommendation THEN 1 ELSE 0 END) AS not_recommend_count,
  COALESCE(SUM(rhv.vote_count), 0) AS total_helpful_votes,
  SUM(CASE WHEN brr.id IS NOT NULL THEN 1 ELSE 0 END) AS responses_received,
  COALESCE(SUM(rv.view_count), 0) AS total_views,
  MAX(br.created_at) AS last_review_at
FROM business_reviews br
LEFT JOIN (
  SELECT review_id, COUNT(*) AS vote_count 
  FROM review_helpful_votes 
  GROUP BY review_id
) rhv ON rhv.review_id = br.id
LEFT JOIN business_review_responses brr ON brr.review_id = br.id
LEFT JOIN (
  SELECT review_id, COUNT(DISTINCT viewer_id) AS view_count
  FROM review_views
  GROUP BY review_id
) rv ON rv.review_id = br.id
WHERE br.deleted_at IS NULL
GROUP BY br.user_id;

-- RLS: users can only see their own stats
ALTER VIEW user_review_stats OWNER TO authenticated;
```

---

### Service Layer

**File:** `src/services/userReviewService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface UserReviewStats {
  totalReviews: number;
  recommendCount: number;
  notRecommendCount: number;
  totalHelpfulVotes: number;
  responsesReceived: number;
  totalViews: number; // NEW: Total unique viewers across all reviews
  lastReviewAt: string | null;
}

export interface UserReview {
  id: string;
  businessId: string;
  businessName: string;
  businessImage: string | null;
  recommendation: boolean;
  text: string | null;
  photoUrls: string[];
  helpfulCount: number;
  viewCount: number; // NEW: Unique viewers for this review
  hasResponse: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Log a view for a review (called when review card is visible for 2+ seconds)
 * Automatically deduplicates - same user viewing same review within 24h = no new log
 */
export async function logReviewView(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Only log for authenticated users
  
  // Check if user is the review author (don't count own views)
  const { data: review } = await supabase
    .from('business_reviews')
    .select('user_id')
    .eq('id', reviewId)
    .single();
  
  if (review?.user_id === user.id) return; // Skip own reviews
  
  // Insert view (unique constraint will prevent duplicates within same day)
  await supabase
    .from('review_views')
    .insert({ review_id: reviewId, viewer_id: user.id })
    .onConflict('ignore'); // Silently ignore duplicate key errors
}

/**
 * Get current user's review statistics
 */
export async function getMyReviewStats(): Promise<UserReviewStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('user_review_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  return {
    totalReviews: data?.total_reviews || 0,
    recommendCount: data?.recommend_count || 0,
    notRecommendCount: data?.not_recommend_count || 0,
    totalHelpfulVotes: data?.total_helpful_votes || 0,
    responsesReceived: data?.responses_received || 0,
    lastReviewAt: data?.last_review_at || null
  };
}

/**
 * Get user's reviews with impact data
 */
export async function getMyReviewsWithImpact(options?: {
  year?: number;
  month?: number;
}): Promise<UserReview[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  let query = supabase
    .from('business_reviews')
    .select(`
      *,
      business:businesses!business_id (id, name, logo_url),
      response:business_review_responses (id),
      helpful_votes:review_helpful_votes (count)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  // Filter by year/month if provided
  if (options?.year) {
    const startDate = new Date(options.year, options.month ?? 0, 1);
    const endDate = options.month !== undefined
      ? new Date(options.year, options.month + 1, 0)
      : new Date(options.year + 1, 0, 0);
    
    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(review => ({
    id: review.id,
    businessId: review.business.id,
    businessName: review.business.name,
    businessImage: review.business.logo_url,
    recommendation: review.recommendation,
    text: review.text,
    photoUrls: review.photo_urls || [],
    helpfulCount: review.helpful_votes?.[0]?.count || 0,
    hasResponse: review.response?.length > 0,
    createdAt: review.created_at,
    updatedAt: review.updated_at
  }));
}
```

---

### Enhanced My Reviews Page

**File:** Update `src/pages/profile/MyReviewsPage.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, MessageSquare, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMyReviewStats, getMyReviewsWithImpact } from '@/services/userReviewService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MyReviewsPage() {
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-review-stats'],
    queryFn: getMyReviewStats
  });
  
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['my-reviews', yearFilter],
    queryFn: () => getMyReviewsWithImpact({ year: yearFilter })
  });
  
  // Get available years from reviews
  const availableYears = useMemo(() => {
    const years = new Set(reviews.map(r => new Date(r.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [reviews]);
  
  if (statsLoading || reviewsLoading) {
    return <MyReviewsSkeleton />;
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">My Reviews</h1>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalReviews}</p>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.totalHelpfulVotes}</p>
            <p className="text-sm text-muted-foreground">Helpful Votes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.responsesReceived}</p>
            <p className="text-sm text-muted-foreground">Responses Received</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex justify-center gap-4">
              <span className="flex items-center gap-1 text-green-600">
                <ThumbsUp className="w-4 h-4" />
                {stats.recommendCount}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <ThumbsDown className="w-4 h-4" />
                {stats.notRecommendCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Recommend Split</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Review History</h2>
        <Select 
          value={yearFilter?.toString() || 'all'} 
          onValueChange={(v) => setYearFilter(v === 'all' ? undefined : parseInt(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No reviews yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check in at businesses to start leaving reviews!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card 
              key={review.id}
              className={cn(
                review.helpfulCount >= 5 && 'border-green-200 bg-green-50/50'
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Business Image */}
                  <Avatar className="w-12 h-12 rounded-lg">
                    <AvatarImage src={review.businessImage || undefined} />
                    <AvatarFallback className="rounded-lg">
                      {review.businessName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{review.businessName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={review.recommendation ? 'text-green-600' : 'text-red-600'}>
                            {review.recommendation ? '👍 Recommended' : "👎 Didn't Recommend"}
                          </span>
                          <span>•</span>
                          <span>{format(new Date(review.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      
                      {/* Impact indicators */}
                      <div className="flex items-center gap-3">
                        {review.helpfulCount > 0 && (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <Heart className="w-4 h-4 fill-current" />
                            {review.helpfulCount}
                          </span>
                        )}
                        {review.hasResponse && (
                          <span className="flex items-center gap-1 text-sm text-blue-600">
                            <MessageSquare className="w-4 h-4" />
                            Replied
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Review text */}
                    {review.text && (
                      <p className="mt-2 text-sm line-clamp-2">{review.text}</p>
                    )}
                    
                    {/* Photos */}
                    {review.photoUrls.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {review.photoUrls.slice(0, 3).map((url, i) => (
                          <img 
                            key={i}
                            src={url}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        ))}
                        {review.photoUrls.length > 3 && (
                          <span className="text-sm text-muted-foreground self-center">
                            +{review.photoUrls.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Plan

### Unit Tests

```typescript
describe('User Review Stats', () => {
  it('calculates total helpful votes', async () => {
    // Create reviews with known vote counts
    // Check stats match
  });

  it('counts responses received', async () => {
    // Create review, add response
    // Check responsesReceived = 1
  });
});

describe('MyReviewsPage', () => {
  it('shows stats summary', () => {
    render(<MyReviewsPage />);
    expect(screen.getByText('Total Reviews')).toBeInTheDocument();
    expect(screen.getByText('Helpful Votes')).toBeInTheDocument();
  });

  it('highlights high-performing reviews', () => {
    // Review with 5+ helpful votes should be highlighted
  });

  it('filters by year', async () => {
    render(<MyReviewsPage />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '2025');
    // Check filtered results
  });
});
```

### Manual Testing Checklist
- [ ] Stats summary shows correct counts
- [ ] Helpful votes counted per review
- [ ] Response indicator shows when business replied
- [ ] Year filter works
- [ ] High-performing reviews highlighted
- [ ] Photos shown on reviews
- [ ] Empty state when no reviews

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_user_review_stats.sql` | CREATE | Stats view |
| `src/services/userReviewService.ts` | CREATE | Stats and reviews API |
| `src/pages/profile/MyReviewsPage.tsx` | MODIFY | Enhanced UI |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing "My Reviews" page location
- [ ] Review user profile components
- [ ] Look for existing metrics/stats display patterns
- [ ] Check view tracking implementations
- [ ] Document findings in the implementation plan

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for running scripts
- [ ] Only request manual SQL execution if MCP lacks required privileges
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result, or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to user testing

### 4. User Testing Plan
Once acceptance criteria are verified, execute this testing flow:

**Test Route 1: My Reviews Dashboard**
1. Navigate to user profile
2. Click "My Reviews" tab
3. Verify stats summary visible (total, helpful, views)
4. Verify review list loads correctly

**Test Route 2: View Tracking**
1. View someone else's review
2. Check that view is logged (admin verification)
3. Verify owner's view count incremented
4. View same review again → No duplicate count

**Test Route 3: Impact Metrics**
1. Check helpful votes count
2. Verify matches actual votes received
3. Check responses received count
4. Verify all numbers accurate

### 5. Browser Testing & Evidence Collection

> **IMPORTANT**: All features must be browser-tested with evidence collected before confirming completion.

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)
- Only restart if necessary

**Test Credentials:**
| User | Email | Password |
|------|-------|----------|
| Test User 1 | testuser1@gmail.com | Testuser@1 |
| Test User 3 | testuser3@gmail.com | Testuser@1 |
| Test User 4 | testuser4@gmail.com | Testuser@1 |
| Test User 5 | testuser5@gmail.com | Testuser@1 |

**Evidence Collection Requirements:**
- [ ] **Screenshot each test step** using browser automation
- [ ] **Record browser session** for key user flows
- [ ] **Save screenshots** to artifacts folder with descriptive names
- [ ] **Document actual vs expected** behavior for each test

**Completion Criteria:**
- [ ] All browser tests pass with visual evidence
- [ ] Screenshots/recordings saved as artifacts
- [ ] Only confirm implementation complete when ALL evidence collected
- [ ] Any failing tests must be fixed before marking complete

---

## Definition of Done

- [ ] Stats summary showing all metrics
- [ ] Helpful count on each review
- [ ] Response indicator working
- [ ] Year filter working
- [ ] High-performing reviews highlighted
- [ ] NO ranks, levels, or badges
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
