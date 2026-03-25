-- migrate:up

-- Drop BOTH possible constraints
ALTER TABLE `albums` DROP FOREIGN KEY `fk_album_artist`;
ALTER TABLE `albums` DROP FOREIGN KEY `albums_ibfk_1`;

-- Make column nullable (KEEP BIGINT)
ALTER TABLE `albums`
MODIFY `artist_id` BIGINT NULL;

-- Recreate FK
ALTER TABLE `albums`
ADD CONSTRAINT `fk_album_artist`
FOREIGN KEY (`artist_id`)
REFERENCES `artists`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;
-- migrate:down

