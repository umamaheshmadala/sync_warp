-- Create offer_audit_log table
CREATE TABLE public.offer_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offer_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Business owners can view logs for their offers
CREATE POLICY "Business owners can view audit logs for their offers"
    ON public.offer_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.offers o
            JOIN public.businesses b ON b.id = o.business_id
            WHERE o.id = offer_audit_log.offer_id
            AND b.owner_id = auth.uid()
        )
    );

-- Authenticated users (System/Business owners) can insert logs
-- We allow inserts from authenticated users, validation logic typically resides in the application layer
-- or via the log_offer_action function which is SECURITY DEFINER (running as owner)
-- However, if we want front-end to insert directly, we need this policy.
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.offer_audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_offer_audit_log_offer_id ON public.offer_audit_log(offer_id);
CREATE INDEX idx_offer_audit_log_created_at ON public.offer_audit_log(created_at);

-- Function to log offer action
-- Using SECURITY DEFINER to ensure it can insert regardless of RLS if needed, although the policy above handles it.
CREATE OR REPLACE FUNCTION public.log_offer_action(
    p_offer_id UUID,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.offer_audit_log (offer_id, user_id, action, reason, metadata)
    VALUES (p_offer_id, auth.uid(), p_action, p_reason, p_metadata)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT ON public.offer_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.offer_audit_log TO service_role;
