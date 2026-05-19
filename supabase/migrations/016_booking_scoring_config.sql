-- Booking scoring configuration table
-- Stores tunable weights used by the automated offer-selection algorithm.
-- Edit the single 'default' row to adjust scoring without code deploys.

CREATE TABLE booking_scoring_config (
  id                      TEXT    PRIMARY KEY DEFAULT 'default',

  -- Score = (admin_score / 10 * quality_weight) + availability_bonus? + role_match_bonus? − (busy_count * busy_penalty_per_booking)
  quality_weight          NUMERIC NOT NULL DEFAULT 100,  -- multiplier for admin_score/10  (→ 0–100 pts)
  availability_bonus      NUMERIC NOT NULL DEFAULT 30,   -- bonus if artist marked available on show date
  role_match_bonus        NUMERIC NOT NULL DEFAULT 15,   -- bonus if role type matches artist type
  busy_penalty_per_booking NUMERIC NOT NULL DEFAULT 15,  -- penalty per booking in the busy window

  -- Window: past N days + all future confirmed bookings
  busy_window_days        INTEGER NOT NULL DEFAULT 30,

  -- Offer cap: how many offers to send per open slot per requirement
  offers_per_slot         INTEGER NOT NULL DEFAULT 10,

  -- Fallback: max offers when zero strict candidates qualify
  fallback_limit          INTEGER NOT NULL DEFAULT 5,

  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton default row
INSERT INTO booking_scoring_config (id) VALUES ('default');

-- Only admins/service role can read and modify
ALTER TABLE booking_scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON booking_scoring_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
