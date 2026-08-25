-- token_version is bumped on password change; customer JWTs carry the value at
-- issue time and are rejected when it no longer matches (session revocation).
ALTER TABLE `customers` ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;
