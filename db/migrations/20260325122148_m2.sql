-- migrate:up
-- Step 1: Drop existing foreign key
ALTER TABLE `albums` DROP FOREIGN KEY `fk_album_artist`;

-- Step 2: Make column nullable
ALTER TABLE `albums` MODIFY `artist_id` INT NULL;

-- Step 3: Recreate foreign key with SET NULL
ALTER TABLE `albums`
ADD CONSTRAINT `fk_album_artist`
FOREIGN KEY (`artist_id`)
REFERENCES `artists`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- migrate:down

