-- Create offer_categories table
CREATE TABLE IF NOT EXISTS offer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for offer_categories
ALTER TABLE offer_categories ENABLE ROW LEVEL SECURITY;

-- Policies for offer_categories
CREATE POLICY "Anyone can view active categories"
  ON offer_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON offer_categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role'); -- Using service_role for now as admin role management might vary

-- Create offer_types table
CREATE TABLE IF NOT EXISTS offer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES offer_categories(id) ON DELETE CASCADE,
  offer_name TEXT NOT NULL,
  description TEXT,
  example TEXT,
  frequency TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for offer_types
CREATE INDEX IF NOT EXISTS idx_offer_types_category ON offer_types(category_id);
CREATE INDEX IF NOT EXISTS idx_offer_types_frequency ON offer_types(frequency);

-- Enable RLS for offer_types
ALTER TABLE offer_types ENABLE ROW LEVEL SECURITY;

-- Policies for offer_types
CREATE POLICY "Anyone can view active offer types"
  ON offer_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage offer types"
  ON offer_types FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Alter offers table to add foreign key
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS offer_type_id UUID REFERENCES offer_types(id);

-- Create trending check function
CREATE OR REPLACE FUNCTION is_offer_trending(offer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recent_views INT;
  recent_shares INT;
  trending_score INT;
  threshold INT := 50;
BEGIN
  SELECT COALESCE(view_count, 0), COALESCE(share_count, 0)
  INTO recent_views, recent_shares
  FROM offers
  WHERE id = offer_id;
  
  -- Simple formula: views + (shares * 2)
  trending_score := recent_views + (recent_shares * 2);
  
  RETURN trending_score > threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed Data using DO block
DO $$
DECLARE
  cat_id UUID;
BEGIN
  -- 1. Product-based / BOGO
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Product-based / BOGO', 'repeat', 10) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Buy One Get One Free (BOGO)', 'Buy one item and get another of the same or similar item free.', 'Buy 1 pizza, get 1 free at Domino''s on specific days.', 'Very frequently', 1),
  (cat_id, 'Buy One Get One at 50% Off', 'Second item is sold at a discounted rate, usually 50% off.', 'Buy 1 shirt, get 2nd at 50% off in apparel stores like Max, Lifestyle.', 'Very frequently', 2),
  (cat_id, '1+1 / 2+1 / 3+1 Offers', 'Buy multiple items and get one or more items free.', '1+1 on personal care like shampoos or soaps in supermarkets.', 'Very frequently', 3),
  (cat_id, 'Mix & Match BOGO', 'Any combination of products within a group qualifies for offer.', 'Buy any 2 snacks from a brand and get 1 free in Big Bazaar-style hypermarkets.', 'Frequently', 4);

  -- 2. Bundles & Combos
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Bundles & Combos', 'package', 20) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Combo Packs / Value Packs', 'Two or more products sold together at a lower combined price.', 'Burger + Fries + Coke combo in QSR outlets like McDonald''s.', 'Very frequently', 1),
  (cat_id, 'Family Packs / Party Combos', 'Larger packs or family-sized combos at value pricing.', 'Family meal combos at KFC / Pizza Hut.', 'Frequently', 2),
  (cat_id, 'Starter Kits / Introductory Bundles', 'Set of starter products offered at a discount to encourage trial.', 'Skin-care starter kits on Nykaa.', 'Frequently', 3),
  (cat_id, 'Cross-Product Bundles', 'Different but complementary products bundled together.', 'Smartphone + back cover + screen guard bundles on Amazon/Flipkart.', 'Frequently', 4);

  -- 3. Quantity / Volume
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Quantity / Volume', 'layers', 30) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Bulk Purchase Discount', 'Discounts applicable when buying in large quantities.', 'Save more on 5kg or 10kg rice/atta packs vs 1kg packs in supermarkets.', 'Very frequently', 1),
  (cat_id, 'Multi-Pack Savings', 'Multi-unit packs priced cheaper than buying single units.', 'Pack of 6 soft drink cans vs single can pricing.', 'Very frequently', 2);

  -- 4. Price-based
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Price-based', 'percent', 40) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Percentage Discount (Flat 10%, 20%, 50%)', 'Fixed percentage reduction on product or cart value.', 'Flat 50% off on fashion during end of season sale.', 'Very frequently', 1),
  (cat_id, 'Up to X% Off', 'Range-based discount, only some items are at highest discount.', 'Up to 70% off on Amazon Great Indian Festival.', 'Very frequently', 2),
  (cat_id, 'Flat Amount Discount (₹500 off)', 'Fixed rupee discount on product or cart.', 'Flat ₹500 off on smartphones above ₹10,000.', 'Frequently', 3),
  (cat_id, 'Tiered Discount by Cart Value', 'Higher cart value unlocks higher discounts.', 'Save 5% on ₹1500, 10% on ₹3000, 15% on ₹5000 on fashion sites.', 'Frequently', 4),
  (cat_id, 'Markdown / Clearance Sale', 'Prices permanently reduced to clear old stock.', 'Season-end clearance sale in malls and stores.', 'Frequently', 5),
  (cat_id, 'Open-Box / Refurbished Discount', 'Discounts on returned, open-box, or refurbished items.', 'Open-box phone deals on Flipkart & Amazon.', 'Frequently', 6);

  -- 5. Cashback & Wallet
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Cashback & Wallet', 'wallet', 50) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Wallet Cashback (Paytm, PhonePe etc.)', 'Cashback credited to digital wallet after transaction.', '10% Paytm cashback on petrol pumps or DTH recharge.', 'Very frequently', 1),
  (cat_id, 'Bank/Card Cashback', 'Cashback credited back to bank/credit card.', '10% HDFC/ICICI/SBI credit card cashback during festive sales.', 'Very frequently', 2),
  (cat_id, 'Instant Cashback', 'Immediate reduction in payable amount at checkout.', 'Instant 10% cashback on using certain wallets at Zomato/Swiggy.', 'Frequently', 3),
  (cat_id, 'Cashback Vouchers / Promo Credit', 'Coupons or credits for future purchases.', 'Cashback coupons on Amazon Pay balance for bill payments.', 'Frequently', 4);

  -- 6. Cart / Order-based
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Cart / Order-based', 'shopping-cart', 60) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Minimum Purchase Discount', 'Discount applied when order exceeds a threshold.', '₹200 off on orders above ₹1499 on Myntra.', 'Very frequently', 1),
  (cat_id, 'Free Shipping Above Threshold', 'Delivery charges waived above a certain order amount.', 'Free delivery on grocery orders above ₹500.', 'Very frequently', 2),
  (cat_id, 'First Order Discount', 'Special discount for the first purchase by a new customer.', 'Flat 50% off on first food order on Swiggy/Zomato.', 'Very frequently', 3),
  (cat_id, 'Free Shipping on All Orders', 'No delivery fees regardless of order size.', 'Free shipping on some D2C brand websites as a USP.', 'Less frequently', 4),
  (cat_id, 'Waived COD Fee', 'Cash-on-delivery handling charges are removed.', 'No COD fee during special promotions on some e-commerce sites.', 'Less frequently', 5),
  (cat_id, 'Free Add-on Above Threshold', 'Free product added when cart crosses specific value.', 'Free dessert on Swiggy orders above ₹500 from a restaurant.', 'Frequently', 6),
  (cat_id, 'App-Only First Order Offer', 'First order discount only via mobile app.', 'Extra 10% off on first order through mobile app for clothing brands.', 'Frequently', 7),
  (cat_id, 'Prepaid Payment Discount', 'Extra discount for online/prepaid payment compared to COD.', '₹50 off if you pay online instead of Cash on Delivery.', 'Frequently', 8);

  -- 7. Customer Segment
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Customer Segment', 'users', 70) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Loyalty Points Program', 'Points earned on purchases, redeemable later.', 'Supermarket chains and brands offering loyalty cards/points.', 'Very frequently', 1),
  (cat_id, 'Student Discount', 'Special lower pricing for students.', 'Software subscriptions (Spotify, Adobe) with student plans.', 'Less frequently', 2),
  (cat_id, 'Senior Citizen Discount', 'Discounts for elderly customers.', 'Pharmacies and some travel booking for senior citizens.', 'Less frequently', 3),
  (cat_id, 'Corporate / Professional Discount', 'Discounts for employees of specific companies or professions.', 'Special bank tie-up offers for employees of IT companies.', 'Less frequently', 4),
  (cat_id, 'Member-Exclusive Pricing', 'Special prices or discounts for loyalty or paid members.', 'Amazon Prime member exclusive deals.', 'Frequently', 5),
  (cat_id, 'Birthday / Anniversary Offers', 'Personalised discounts around customer’s special dates.', 'Salons, restaurants and e-commerce sending birthday discount codes.', 'Frequently', 6),
  (cat_id, 'Referral Bonus (Referrer)', 'Existing user gets reward for bringing new user.', 'Refer a friend and get ₹100 wallet credit on fintech apps.', 'Frequently', 7),
  (cat_id, 'Referral Bonus (Referee)', 'New user gets reward when joining via referral.', 'Both get ₹100 on referral sign-ups on trading or payment apps.', 'Frequently', 8);

  -- 8. Time-based
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Time-based', 'clock', 80) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Flash Sale', 'Short time-limited deep discounts.', '2-hour flash sale on mobile apps / e-commerce.', 'Very frequently', 1),
  (cat_id, 'Festive Sales', 'Large campaigns around festivals with deep discounts.', 'Diwali, Navratri, Pongal, Eid, Christmas sale events.', 'Very frequently', 2),
  (cat_id, 'End-of-Season Sale (EOSS)', 'Discounts to clear out seasonal inventory.', 'Winter sale or summer sale in fashion retail.', 'Very frequently', 3),
  (cat_id, 'Countdown / Limited Time Offers', 'Offers shown with countdown timers to create urgency.', 'Deal of the day with countdown clock on e-commerce apps.', 'Very frequently', 4),
  (cat_id, 'Lightning Deal', 'Limited time + limited quantity high discounts.', 'Amazon lightning deals during Great Indian Festival.', 'Frequently', 5),
  (cat_id, 'Happy Hours', 'Discounts available only during certain hours of the day.', 'Happy hour offers on beverages in cafes and bars.', 'Frequently', 6),
  (cat_id, 'Weekend Specials', 'Offers valid only on Saturdays/Sundays.', 'Weekend sale on fashion and electronics.', 'Frequently', 7),
  (cat_id, 'New Year / Year-End Sale', 'Special offers around year end / new year.', 'New Year’s mega sale campaigns across online platforms.', 'Frequently', 8);

  -- 9. Coupon / Promo-based
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Coupon / Promo-based', 'ticket', 90) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Promo Code Discount', 'Customer enters a code at checkout to unlock discount.', 'Use code SAVE20 to get 20% off on food delivery.', 'Very frequently', 1),
  (cat_id, 'Scratch Card Rewards', 'Digital scratch cards with hidden rewards post-transaction.', 'Scratch cards on Google Pay / PhonePe after payments.', 'Very frequently', 2),
  (cat_id, 'Auto-Applied Coupons', 'Coupons applied automatically without user entering code.', 'Best available coupon auto-applied at checkout on some sites.', 'Frequently', 3),
  (cat_id, 'Exclusive / Secret Coupons', 'Special codes shared via email, SMS or influencer.', 'Influencer-only coupon codes on Instagram.', 'Frequently', 4),
  (cat_id, 'Spin-the-Wheel Offers', 'Gamified wheel to win varied discounts.', 'Spin the wheel on D2C brand websites for a one-time discount.', 'Frequently', 5),
  (cat_id, 'Coupon for Next Purchase', 'Discount voucher issued for future orders.', '₹200 off voucher for next order on completion of current purchase.', 'Frequently', 6);

  -- 10. Psychological Pricing
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Psychological Pricing', 'tag', 100) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Was–Now Pricing', 'Shows original price with a strike-through and current discount price.', 'MRP ₹1999, Now ₹999 on product label.', 'Very frequently', 1),
  (cat_id, 'Charm Pricing (₹999 instead of ₹1000)', 'Price ending in .99 or similar to appear cheaper.', 'Most consumer products priced at ₹99, ₹199, ₹999.', 'Very frequently', 2),
  (cat_id, 'Anchor Pricing', 'Display a higher ''compare at'' price next to current offer price.', 'Showing ''₹2999'' crossed out and ''₹1499'' as current price.', 'Very frequently', 3);

  -- 11. Channel / Payment-based
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Channel / Payment-based', 'credit-card', 110) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Bank / Card Specific Discount', 'Extra discount when using certain banks or card networks.', '10% instant discount on SBI / HDFC cards in major sales.', 'Very frequently', 1),
  (cat_id, 'App-Only Price', 'Discount only when ordering via mobile app.', 'Extra 5% off on app orders vs website on fashion platforms.', 'Frequently', 2),
  (cat_id, 'Store-Only Exclusive Offer', 'Discounts only available at physical stores.', 'In-store only flat 50% clearance sale boards.', 'Frequently', 3),
  (cat_id, 'Online-Only Exclusive Offer', 'Special pricing on online orders.', 'Online-only price for electronics cheaper than store price.', 'Frequently', 4),
  (cat_id, 'UPI Payment Discount', 'Discounts for paying via UPI apps.', 'Extra ₹50 off when paying via UPI at certain websites.', 'Frequently', 5),
  (cat_id, 'No-Cost EMI', 'Convert bill into EMIs without extra interest charge to customer.', 'No-cost EMI on smartphones, TVs, and other electronics.', 'Frequently', 6),
  (cat_id, 'BNPL (Buy Now Pay Later) Incentives', 'Special offers for using BNPL providers.', 'Cashback or discounts for transactions via Simpl, LazyPay etc.', 'Frequently', 7);

  -- 12. Gifts & Freebies
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Gifts & Freebies', 'gift', 120) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Mystery Gift', 'Customer receives an unknown surprise gift.', 'Mystery gift during festive sales on e-commerce sites.', 'Less frequently', 1),
  (cat_id, 'Free Gift with Purchase', 'Customer gets an additional gift item on qualifying purchases.', 'Free tote bag with beauty purchase above ₹1999 on Nykaa.', 'Frequently', 2),
  (cat_id, 'Free Sample with Order', 'Trial-size products included to encourage future purchase.', 'Free sachets of shampoo with grocery orders.', 'Frequently', 3);

  -- 13. Subscription
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Subscription', 'calendar', 130) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'First Month at Discounted Price', 'Introductory lower-priced first billing cycle.', '₹1 for first month of some OTT or music streaming services.', 'Less frequently', 1),
  (cat_id, 'Discounted Renewal', 'Lower price for renewing before or on expiry.', 'Discount on yearly renewal of antivirus or SaaS tools.', 'Less frequently', 2),
  (cat_id, 'Subscribe & Save', 'Recurring subscription gets lower per-unit price.', 'Monthly subscription for groceries or milk delivery at discount.', 'Frequently', 3),
  (cat_id, 'Free Trial Period', 'Limited-time free access to service.', '30-day free trial on OTT or SaaS platforms.', 'Frequently', 4),
  (cat_id, 'Locked-in Long Term Pricing', 'Price locked for users who subscribe for long term.', 'Founding member plans for new digital products.', 'Almost never', 5);

  -- 14. Value-added
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Value-added', 'plus-circle', 140) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Free Training / Onboarding', 'Training provided at no extra cost.', 'Free onboarding for enterprise software solutions.', 'Less frequently', 1),
  (cat_id, 'Accidental Damage Protection Free', 'Insurance against accidental damage at no cost.', 'Free screen damage protection on smartphones bought during offers.', 'Less frequently', 2),
  (cat_id, 'Free Upgrade to Premium Plan', 'Higher tier plan offered at same price as lower tier.', 'Free speed upgrade in broadband plans for limited period.', 'Less frequently', 3),
  (cat_id, 'Free Installation / Setup', 'Installation service provided free with purchase.', 'Free AC or TV installation from electronics retailers.', 'Frequently', 4),
  (cat_id, 'Free Demo / Consultation', 'No-cost consultation or demo for high-ticket services.', 'Free interior design consultation from furniture brands.', 'Frequently', 5),
  (cat_id, 'Extended Warranty Free', 'Additional warranty period at no extra charge.', 'Extra 1-year warranty on electronics during festive sales.', 'Frequently', 6),
  (cat_id, 'Trade-in / Exchange Bonus', 'Extra value on old product when exchanging for new.', 'Exchange offers on old smartphones or TVs with bonus value.', 'Frequently', 7);

  -- 15. Special / Risk-Free
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Special / Risk-Free', 'shield', 150) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Try Before You Buy (TBYB)', 'Product is delivered, paid only if customer keeps it.', 'TBYB on eyewear or fashion categories on some platforms.', 'Less frequently', 1),
  (cat_id, 'Beta User Incentive', 'Rewards/discounts for testing new products or features.', 'Early access deals or lifetime discounts for first users of SaaS/app.', 'Less frequently', 2),
  (cat_id, 'Try & Return / Free Returns', 'Customer can try product and return if unsatisfied.', 'Free 7-day return on fashion items.', 'Frequently', 3),
  (cat_id, 'No-Questions-Asked Returns', 'Easy returns without detailed justification.', 'Simplified return policies on major e-commerce platforms.', 'Frequently', 4),
  (cat_id, 'Early Bird Offer', 'Special pricing for early adopters or early bookers.', 'Early bird discounts on event tickets or online courses.', 'Frequently', 5),
  (cat_id, 'Pre-Order Discount', 'Lower price or bonus for ordering before official launch.', 'Pre-order smartphones or games with bonus goodies.', 'Frequently', 6);

  -- 16. Gamified / Engagement
  INSERT INTO offer_categories (name, icon_name, display_order) VALUES ('Gamified / Engagement', 'zap', 160) RETURNING id INTO cat_id;
  INSERT INTO offer_types (category_id, offer_name, description, example, frequency, display_order) VALUES
  (cat_id, 'Coins / Points for Actions', 'Points earned for purchases or activities, redeemable later.', 'Reward coins on gaming, learning or shopping apps redeemable for benefits.', 'Frequently', 1),
  (cat_id, 'Daily Check-In / Streak Rewards', 'Rewards for consecutive days of app usage or ordering.', 'Food, gaming, or learning apps rewarding streaks.', 'Frequently', 2),
  (cat_id, 'Milestone / Achievement Rewards', 'Unlock rewards after crossing certain usage or spend milestones.', 'Rewards for completing 10 rides/orders on mobility or delivery apps.', 'Frequently', 3),
  (cat_id, 'Spin-the-Wheel (Gamified Discount)', 'Interactive wheel with different rewards per slice.', 'Spin-the-wheel popups on D2C websites for first-time users.', 'Frequently', 4);

END $$;
