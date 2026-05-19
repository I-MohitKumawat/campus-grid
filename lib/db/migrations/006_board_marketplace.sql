-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 006_board_marketplace.sql
-- Description: Board posts, comments, post reports, marketplace listings,
--              and listing reports. Includes the auto-hide trigger.
-- Depends on: 002_core_tables.sql, 001_enums.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── board_posts ───────────────────────────────────────────────────────────────
CREATE TABLE board_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  category           post_category NOT NULL,
  form_data          JSONB NOT NULL,
  tags               TEXT[],
  media_urls         TEXT[],
  attachments        JSONB DEFAULT '[]',
  visibility         TEXT NOT NULL DEFAULT 'public'
                       CHECK (visibility IN ('public','campus_only')),
  status             post_status NOT NULL DEFAULT 'pending',
  upvotes            INT DEFAULT 0,
  view_count         INT DEFAULT 0,
  featured           BOOLEAN DEFAULT FALSE,
  is_sponsored       BOOLEAN DEFAULT FALSE,
  pinned_until       TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ NOT NULL,
  reviewed_by        UUID REFERENCES users(id),
  reviewed_at        TIMESTAMPTZ,
  rejection_reason   TEXT,
  report_count       INT DEFAULT 0,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_category_date ON board_posts(category, created_at DESC);
CREATE INDEX idx_posts_status        ON board_posts(status);
CREATE INDEX idx_posts_expires_at    ON board_posts(expires_at);
CREATE INDEX idx_posts_tags          ON board_posts USING GIN(tags);
CREATE INDEX idx_posts_flagged       ON board_posts(flagged_for_review);

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON board_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── post_comments ─────────────────────────────────────────────────────────────
CREATE TABLE post_comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content           VARCHAR(500) NOT NULL,
  edited_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON post_comments(post_id, created_at DESC);

-- ── post_reports ──────────────────────────────────────────────────────────────
CREATE TABLE post_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);

-- Trigger: auto-hide post when report_count reaches 3
CREATE OR REPLACE FUNCTION check_report_threshold() RETURNS TRIGGER AS $$
BEGIN
  UPDATE board_posts
  SET
    report_count = report_count + 1,
    status = CASE WHEN report_count + 1 >= 3
               THEN 'hidden'::post_status ELSE status END,
    flagged_for_review = CASE WHEN report_count + 1 >= 3
               THEN TRUE ELSE flagged_for_review END
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_report_threshold
AFTER INSERT ON post_reports
FOR EACH ROW EXECUTE FUNCTION check_report_threshold();

-- ── marketplace_listings ──────────────────────────────────────────────────────
CREATE TABLE marketplace_listings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    VARCHAR(300),
  category       marketplace_category NOT NULL,
  condition      marketplace_condition NOT NULL,
  price          NUMERIC(8,2),   -- NULL means 'Free' or 'Exchange'
  is_free        BOOLEAN DEFAULT FALSE,
  is_exchange    BOOLEAN DEFAULT FALSE,
  photos         TEXT[],         -- Cloudinary URLs, max 3
  contact_method TEXT,           -- 'email' | 'phone' | 'whatsapp'
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','sold','unavailable','expired')),
  report_count   INT DEFAULT 0,
  flagged        BOOLEAN DEFAULT FALSE,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '60 days',
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX idx_listings_category  ON marketplace_listings(category);
CREATE INDEX idx_listings_status    ON marketplace_listings(status);
CREATE INDEX idx_listings_expires   ON marketplace_listings(expires_at);
CREATE INDEX idx_listings_flagged   ON marketplace_listings(flagged);
CREATE INDEX idx_listings_fts ON marketplace_listings
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description,'')));

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── listing_reports ───────────────────────────────────────────────────────────
CREATE TABLE listing_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, reporter_id)
);
