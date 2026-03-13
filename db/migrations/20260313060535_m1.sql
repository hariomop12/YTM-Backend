-- migrate:up
-- USERS
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role ENUM('listener','artist','admin') DEFAULT 'listener',
    is_verified BOOLEAN DEFAULT FALSE,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ARTISTS
CREATE TABLE artists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    stage_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(500),
    banner_url VARCHAR(500),
    monthly_listeners INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_artist_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- ALBUMS
CREATE TABLE albums (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    artist_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_r2_key VARCHAR(500),
    release_date DATE,
    type ENUM('album','EP','single') DEFAULT 'album',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_album_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id)
    ON DELETE CASCADE
);

-- SONGS
CREATE TABLE songs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    artist_id BIGINT NOT NULL,
    album_id BIGINT,
    title VARCHAR(200) NOT NULL,
    duration_seconds INT NOT NULL,
    audio_r2_key VARCHAR(500) NOT NULL,
    thumbnail_r2_key VARCHAR(500),
    play_count BIGINT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    release_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_song_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_song_album
    FOREIGN KEY (album_id) REFERENCES albums(id)
    ON DELETE SET NULL
);

-- PLAYLISTS
CREATE TABLE playlists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_playlist_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- PLAYLIST SONGS (junction)
CREATE TABLE playlist_songs (
    playlist_id BIGINT NOT NULL,
    song_id BIGINT NOT NULL,
    position INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (playlist_id, song_id),

    CONSTRAINT fk_ps_playlist
    FOREIGN KEY (playlist_id) REFERENCES playlists(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_ps_song
    FOREIGN KEY (song_id) REFERENCES songs(id)
    ON DELETE CASCADE
);

-- FOLLOWS (user follows artist)
CREATE TABLE follows (
    user_id BIGINT NOT NULL,
    artist_id BIGINT NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, artist_id),

    CONSTRAINT fk_follow_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_follow_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id)
    ON DELETE CASCADE
);

-- LIKED SONGS
CREATE TABLE liked_songs (
    user_id BIGINT NOT NULL,
    song_id BIGINT NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, song_id),

    CONSTRAINT fk_liked_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_liked_song
    FOREIGN KEY (song_id) REFERENCES songs(id)
    ON DELETE CASCADE
);

-- GENRES
CREATE TABLE genres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- SONG GENRES (many-to-many)
CREATE TABLE song_genres (
    song_id BIGINT NOT NULL,
    genre_id BIGINT NOT NULL,

    PRIMARY KEY (song_id, genre_id),

    CONSTRAINT fk_sg_song
    FOREIGN KEY (song_id) REFERENCES songs(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_sg_genre
    FOREIGN KEY (genre_id) REFERENCES genres(id)
    ON DELETE CASCADE
);

-- migrate:down

