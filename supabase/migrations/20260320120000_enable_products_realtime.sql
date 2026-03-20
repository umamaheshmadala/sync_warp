-- Enable Realtime for the products table so that
-- like_count updates (driven by the product_likes_count_trigger)
-- are broadcast to all connected clients.
ALTER PUBLICATION supabase_realtime ADD TABLE products;
