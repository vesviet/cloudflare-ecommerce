-- Migration: 0004 – Add utm_medium and utm_campaign to orders table
-- Additive migration only — existing rows will have NULL values for these columns.

ALTER TABLE orders ADD COLUMN utm_medium TEXT;
ALTER TABLE orders ADD COLUMN utm_campaign TEXT;
