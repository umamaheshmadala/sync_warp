# Story 9.7.6: Deal Sharing Analytics

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🟢 Low  
**Estimated Time:** 1 day  
**MCP Usage:** 🛢 Supabase MCP (Medium)  
**Dependencies:** Story 9.7.1 (Deal Sharing), Story 9.7.5 (ShareDeal Integration)  
**Status:** 📋 Planning

---

## 📋 Story Description

Track and display comprehensive analytics for deal sharing, including share events, click-through rates, conversion rates, and insights into which friends engage most with shared deals.

---

## ✅ Acceptance Criteria

### Database Schema
- [ ] `deal_shares` table with analytics fields
- [ ] `share_clicks` table for tracking link clicks
- [ ] `share_conversions` table for tracking saves/purchases

### Analytics Dashboard
- [ ] "Your Most Shared Deals" widget
- [ ] Share method breakdown (friends vs email vs link)
- [ ] Click-through rate per share method
- [ ] Conversion rate (shares → saves/purchases)
- [ ] Most engaged friends list

### Functionality
- [ ] Track share events automatically
- [ ] Track when shared links are clicked
- [ ] Track when shared deals are saved/purchased
- [ ] Calculate engagement metrics
- [ ] Display insights to users

---

## 🛢 Database Schema

### File: `supabase/migrations/20250126_deal_sharing_analytics.sql`

```sql
-- Enhanced deal_shares table (if not created in Story 9.7.1)
CREATE TABLE IF NOT EXISTS deal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  share_method TEXT NOT NULL CHECK (share_method IN ('message', 'notification', 'email', 'link')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Analytics fields
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,  -- Saved or purchased
  converted_at TIMESTAMPTZ,
  
  UNIQUE(deal_id, sender_id, recipient_id, created_at::date)
);

-- Table: share_clicks
CREATE TABLE IF NOT EXISTS share_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES deal_shares(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: share_conversions
CREATE TABLE IF NOT EXISTS share_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES deal_shares(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('save', 'purchase', 'like')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_share_clicks_share_id ON share_clicks(share_id);
CREATE INDEX idx_share_clicks_deal_id ON share_clicks(deal_id);
CREATE INDEX idx_share_conversions_share_id ON share_conversions(share_id);
CREATE INDEX idx_share_conversions_user_id ON share_conversions(user_id);

-- RLS Policies
ALTER TABLE share_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own share clicks"
  ON share_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_shares ds
      WHERE ds.id = share_clicks.share_id
      AND (ds.sender_id = auth.uid() OR ds.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own conversions"
  ON share_conversions FOR SELECT
  USING (auth.uid() = user_id);

-- Function: Get user's sharing analytics
CREATE OR REPLACE FUNCTION get_user_sharing_analytics(
  user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_shares', (
      SELECT COUNT(*) FROM deal_shares WHERE sender_id = user_id_param
    ),
    'shares_by_method', (
      SELECT json_object_agg(share_method, count)
      FROM (
        SELECT share_method, COUNT(*) as count
        FROM deal_shares
        WHERE sender_id = user_id_param
        GROUP BY share_method
      ) t
    ),
    'click_through_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE clicked = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM deal_shares
      WHERE sender_id = user_id_param
    ),
    'conversion_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE converted = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM deal_shares
      WHERE sender_id = user_id_param
    ),
    'most_shared_deals', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT d.id, d.title, d.image_url, COUNT(*) as share_count
        FROM deal_shares ds
        JOIN deals d ON d.id = ds.deal_id
        WHERE ds.sender_id = user_id_param
        GROUP BY d.id, d.title, d.image_url
        ORDER BY share_count DESC
        LIMIT 5
      ) t
    ),
    'most_engaged_friends', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          p.id,
          p.full_name,
          p.avatar_url,
          COUNT(*) as shares_received,
          COUNT(*) FILTER (WHERE ds.clicked = true) as clicks,
          COUNT(*) FILTER (WHERE ds.converted = true) as conversions
        FROM deal_shares ds
        JOIN profiles p ON p.id = ds.recipient_id
        WHERE ds.sender_id = user_id_param
        GROUP BY p.id, p.full_name, p.avatar_url
        ORDER BY conversions DESC, clicks DESC
        LIMIT 5
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update clicked status
CREATE OR REPLACE FUNCTION update_share_clicked()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deal_shares
  SET clicked = true, clicked_at = NEW.created_at
  WHERE id = NEW.share_id AND clicked = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_share_clicked
  AFTER INSERT ON share_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_share_clicked();

-- Trigger: Update converted status
CREATE OR REPLACE FUNCTION update_share_converted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deal_shares
  SET converted = true, converted_at = NEW.created_at
  WHERE id = NEW.share_id AND converted = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_share_converted
  AFTER INSERT ON share_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_share_converted();
```

---

## 🎨 Component Implementation

### File: `src/components/analytics/SharingAnalyticsDashboard.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { Share2, TrendingUp, Users, MousePointerClick } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserSharingAnalytics } from '@/services/analyticsService';

export function SharingAnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['sharing-analytics'],
    queryFn: getUserSharingAnalytics,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_shares}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.click_through_rate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversion_rate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engaged Friends</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.most_engaged_friends?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Shared Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Your Most Shared Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.most_shared_deals?.map((deal: any) => (
              <div key={deal.id} className="flex items-center space-x-3">
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium">{deal.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Shared {deal.share_count} times
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Most Engaged Friends */}
      <Card>
        <CardHeader>
          <CardTitle>Most Engaged Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.most_engaged_friends?.map((friend: any) => (
              <div key={friend.id} className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={friend.avatar_url} />
                  <AvatarFallback>{friend.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{friend.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {friend.shares_received} shares • {friend.clicks} clicks • {friend.conversions} conversions
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔧 Service Implementation

### File: `src/services/analyticsService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export async function getUserSharingAnalytics() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_user_sharing_analytics', {
    user_id_param: user.id,
  });

  if (error) throw error;
  return data;
}

export async function trackShareClick(shareId: string) {
  const { error } = await supabase.from('share_clicks').insert({
    share_id: shareId,
    deal_id: shareId, // Extract from share
    user_agent: navigator.userAgent,
    referrer: document.referrer,
  });

  if (error) console.error('Failed to track click:', error);
}

export async function trackShareConversion(
  shareId: string,
  dealId: string,
  conversionType: 'save' | 'purchase' | 'like'
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('share_conversions').insert({
    share_id: shareId,
    deal_id: dealId,
    user_id: user.id,
    conversion_type: conversionType,
  });

  if (error) console.error('Failed to track conversion:', error);
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **Share Deals**
   - Share multiple deals
   - Verify shares logged in database

2. **Click Tracking**
   - Click on shared deal link
   - Verify click tracked

3. **Conversion Tracking**
   - Save a shared deal
   - Verify conversion tracked

4. **View Analytics**
   - Navigate to analytics dashboard
   - Verify stats display correctly

---

## ✅ Definition of Done

- [ ] Database schema created
- [ ] Analytics function implemented
- [ ] Dashboard component created
- [ ] Tracking functions implemented
- [ ] Manual testing completed
- [ ] Privacy considerations addressed

---

**Epic Complete!** All stories for Epic 9.7 have been created.
