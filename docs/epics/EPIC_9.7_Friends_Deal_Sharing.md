# 🤝 EPIC 9.7: Friends & Deal Sharing Integration

**Epic Owner:** Frontend Engineering / Product  
**Stakeholders:** Product, UX/UI, QA  
**Dependencies:** Epic 9.3 (UI), Epic 9.4 (Services)  
**Timeline:** Week 8 (1 week)  
**Status:** 🚧 In Progress (3/6 stories complete)
**Last Updated:** 2025-11-28

---

## 🎯 **Epic Goal**

Integrate the friends module with SynC's **deal/offer features** for social deal sharing:
- Share deals directly with friends
- Tag friends in deal comments
- Friend-based deal recommendations ("Deals your friends liked")
- Friend leaderboard (top deal hunters among friends)
- Integration with existing ShareDeal component

This epic makes deal hunting a **social, collaborative experience**.

---

## 📱 **Platform Support**

All platforms: Web, iOS, Android

---

## 🎯 **MCP Integration Strategy**

1. **🧠 Context7 MCP** (Heavy) - Analyze ShareDeal component, find integration points
2. **🛢 Supabase MCP** (Medium) - Deal sharing schema, friend recommendations
3. **🎨 Shadcn MCP** (Medium) - Friend picker modal, leaderboard UI

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Deal Sharing Rate** | > 30% of deals shared with friends |
| **Friend Tag Usage** | > 20% of comments include friend tags |
| **Recommendation CTR** | > 15% click-through on friend recommendations |
| **Leaderboard Engagement** | > 40% users check leaderboard |

---

## 🗂️ **Stories in This Epic**

### **STORY 9.7.1: Share Deal with Friends UI** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🧠 Context7 MCP, 🎨 Shadcn MCP

**Description:**  
Build "Share with friends" flow with friend picker modal.

**Acceptance Criteria:**
- [ ] "Share with friends" button on deal detail page
- [ ] Friend picker modal (multi-select with search)
- [ ] Add custom message with deal share
- [ ] Send as message OR notification (user choice)
- [ ] Track share events for analytics
- [ ] Show "Shared with X friends" confirmation

**UI Component:**
```typescript
// src/components/deals/ShareDealWithFriends.tsx
export function ShareDealWithFriends({ deal }: { deal: Deal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [shareMethod, setShareMethod] = useState<'message' | 'notification'>('message');

  const { friends } = useFriends();

  const handleShare = async () => {
    if (shareMethod === 'message') {
      // Send via messaging (Epic 8.x integration)
      for (const friendId of selectedFriends) {
        const conversationId = await createOrGetConversation(friendId);
        await sendMessage(conversationId, {
          type: 'deal',
          content: message || `Check out this deal!`,
          shared_deal_id: deal.id,
        });
      }
    } else {
      // Send as notification
      await shareDealNotification(deal.id, selectedFriends, message);
    }

    toast.success(`Shared with ${selectedFriends.length} friends`);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Users className="mr-2 h-4 w-4" />
        Share with Friends
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share with Friends</DialogTitle>
          </DialogHeader>

          {/* Deal Preview */}
          <DealCard deal={deal} compact />

          {/* Friend Picker with Search */}
          <div className="space-y-3">
            <Input placeholder="Search friends..." />
            <ScrollArea className="h-64">
              {friends?.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center space-x-3 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFriends.includes(friend.friend_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFriends([...selectedFriends, friend.friend_id]);
                      } else {
                        setSelectedFriends(selectedFriends.filter(id => id !== friend.friend_id));
                      }
                    }}
                  />
                  <Avatar src={friend.profile?.avatar_url} />
                  <span>{friend.profile?.full_name}</span>
                </label>
              ))}
            </ScrollArea>
          </div>

          {/* Custom Message */}
          <Textarea
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* Share Method */}
          <RadioGroup value={shareMethod} onValueChange={setShareMethod as any}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="message" id="message" />
              <Label htmlFor="message">Send as message</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="notification" id="notification" />
              <Label htmlFor="notification">Send as notification</Label>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedFriends.length === 0}
            >
              Share with {selectedFriends.length} {selectedFriends.length === 1 ? 'friend' : 'friends'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**MCP Commands:**
```bash
# Find ShareDeal component integration points
warp mcp run context7 "find usage of ShareDeal component"
warp mcp run context7 "analyze src/components/ShareDeal.tsx"
```

---

### **STORY 9.7.2: Friend Tags in Deal Comments** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🧠 Context7 MCP

**Description:**  
Allow users to @mention friends in deal comments.

**Acceptance Criteria:**
- [ ] @mention autocomplete in comment input
- [ ] Tag friends with "@username" syntax
- [ ] Notification sent to tagged friend
- [ ] Clickable tags → navigate to friend profile
- [ ] Works in web and mobile

**Technical Spec:**
```typescript
// src/components/deals/CommentInput.tsx
import { Mention, MentionsInput } from 'react-mentions';

export function CommentInput({ dealId }: { dealId: string }) {
  const [comment, setComment] = useState('');
  const { friends } = useFriends();

  const handleSubmit = async () => {
    // Extract mentioned user IDs from comment
    const mentionedUserIds = extractMentions(comment);
    
    // Save comment
    await createComment(dealId, comment);
    
    // Notify mentioned users
    for (const userId of mentionedUserIds) {
      await notifyUserTagged(userId, dealId);
    }
  };

  return (
    <MentionsInput
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      placeholder="Add a comment... (type @ to mention friends)"
    >
      <Mention
        trigger="@"
        data={friends?.map((f) => ({
          id: f.friend_id,
          display: f.profile?.full_name || '',
        })) || []}
        renderSuggestion={(entry) => (
          <div className="flex items-center space-x-2 p-2">
            <Avatar src={entry.avatar} size="sm" />
            <span>{entry.display}</span>
          </div>
        )}
      />
    </MentionsInput>
  );
}
```

---

### **STORY 9.7.3: Friend-Based Deal Recommendations** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Show "Deals your friends liked" section on home page.

**Acceptance Criteria:**
- [ ] Algorithm: friends' recent likes/saves (last 7 days)
- [ ] Display friend avatars on deal cards
- [ ] Tooltip: "Liked by John, Sarah, +2 others"
- [ ] Sort by # of friends who liked
- [ ] Real-time updates when friends like deals

**Technical Spec:**
```sql
-- Function: Get deals liked by friends
CREATE OR REPLACE FUNCTION get_deals_liked_by_friends(
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  deal_id UUID,
  deal_title TEXT,
  likes_by_friends BIGINT,
  friend_avatars TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    COUNT(DISTINCT ul.user_id) as likes_by_friends,
    ARRAY_AGG(DISTINCT p.avatar_url) as friend_avatars
  FROM deals d
  JOIN user_likes ul ON ul.deal_id = d.id
  JOIN friendships f ON f.friend_id = ul.user_id AND f.user_id = current_user_id AND f.status = 'active'
  JOIN profiles p ON p.id = ul.user_id
  WHERE ul.created_at > NOW() - INTERVAL '7 days'
    AND d.status = 'active'
    AND d.expires_at > NOW()
  GROUP BY d.id, d.title
  HAVING COUNT(DISTINCT ul.user_id) >= 2
  ORDER BY likes_by_friends DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **STORY 9.7.4: Friend Leaderboard** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🎨 Shadcn MCP

**Description:**  
Show "Top Deal Hunters Among Friends" leaderboard.

**Acceptance Criteria:**
- [ ] Sort by deals found this month
- [ ] Display rank, avatar, name, deal count
- [ ] Gamification: badges for milestones (10, 50, 100 deals)
- [ ] Filter: This week, This month, All time
- [ ] Click to view friend's deals

**UI Component:**
```typescript
// src/components/friends/FriendLeaderboard.tsx
export function FriendLeaderboard() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const { data: leaderboard } = useFriendLeaderboard(timeRange);

  const getBadge = (dealCount: number) => {
    if (dealCount >= 100) return { emoji: '🏆', title: 'Legend' };
    if (dealCount >= 50) return { emoji: '🥇', title: 'Expert' };
    if (dealCount >= 10) return { emoji: '🥈', title: 'Hunter' };
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Deal Hunters</CardTitle>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={timeRange === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'all' ? 'default' : 'outline'}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard?.map((friend, index) => {
            const badge = getBadge(friend.deal_count);
            return (
              <div
                key={friend.user_id}
                className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
              >
                <div className="text-lg font-bold w-8 text-center">
                  {index + 1}
                </div>
                <Avatar src={friend.avatar_url} />
                <div className="flex-1">
                  <div className="font-medium">{friend.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {friend.deal_count} deals found
                  </div>
                </div>
                {badge && (
                  <div className="text-right">
                    <div className="text-2xl">{badge.emoji}</div>
                    <div className="text-xs text-muted-foreground">{badge.title}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### **STORY 9.7.5: Integration with ShareDeal Component** ⏱️ 3 days ✅ COMPLETE
**Priority:** 🔴 Critical  
**MCP Usage:** 🧠 Context7 MCP  
**Status:** ✅ Complete (2025-11-28)

**Description:**  
Update existing `ShareDeal.tsx` component to include friends option.

**Acceptance Criteria:**
- [x] Add "Friends" option alongside Email/Link
- [x] Reuse friend picker modal from 9.7.1
- [x] Analytics tracking for share method used
- [x] Backward compatible with existing share functionality
- [x] **BONUS:** UI revamp for better UX (~200px space savings)
- [x] **BONUS:** Integrated into Business Page Offer Modal
- [ ] **PENDING:** Recently Shared With section debugging

**Additional Features Implemented:**
- Collapsible message input (saves ~120px)
- Icon-based share method selection (saves ~80px)
- Fixed "All Friends" section using `useFriends()` hook
- Integrated into `FeaturedOffers.tsx` on business page
- Created demo page at `/test/share-deal`

---

### **STORY 9.7.6: Deal Sharing Analytics** ⏱️ 1 day
**Priority:** 🟢 Low  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Track and display deal sharing analytics.

**Acceptance Criteria:**
- [ ] Track: share events, click-through rate, conversion rate
- [ ] Dashboard: "Your most shared deals"
- [ ] Insights: Which friends engage most with your shares
- [ ] Database schema for deal_shares table

---

## 📦 **Deliverables**

### **Components:**
```
src/components/deals/
├── ShareDealWithFriends.tsx
├── CommentInput.tsx (with @mentions)
├── FriendLikedDealsSection.tsx
└── UpdatedShareDeal.tsx

src/components/friends/
└── FriendLeaderboard.tsx
```

### **Database:**
- `deal_shares` table
- `deal_comments` table (with mentions support)
- Friend recommendation function

### **Services:**
- `dealSharingService.ts` - Share deals with friends
- Update `friendsService.ts` with leaderboard function

---

## 📈 **Metrics**

- Deal share rate (% of deals shared)
- Friend tag frequency in comments
- Leaderboard engagement (% views)
- Friend recommendation CTR
- Social deal conversion rate (deals saved after friend recommendation)

---

**Next Epic:** [EPIC 9.8: Testing, Performance & QA](./EPIC_9.8_Testing_Performance_QA.md)
