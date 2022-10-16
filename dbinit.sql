CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    balance INT8
);
CREATE TABLE ranch (
    id serial PRIMARY KEY UNIQUE,
    name varchar(255) NOT NULL,
    url varchar(255),
    about varchar(255)
);
CREATE TABLE elo (
    id serial PRIMARY KEY UNIQUE,
    ranchID int NOT NULL,
    elo int NOT NULL,
    wins int NOT NULL,
    losses int NOT NULL,
    FOREIGN KEY (ranchID) REFERENCES ranch(id)
);