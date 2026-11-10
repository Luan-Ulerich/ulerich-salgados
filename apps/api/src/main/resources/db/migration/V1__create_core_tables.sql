CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id),
    name        VARCHAR(100) NOT NULL,
    price_cents BIGINT       NOT NULL CHECK (price_cents >= 0),
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE sales (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id),
    sold_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    total_cents    BIGINT       NOT NULL CHECK (total_cents >= 0),
    payment_method VARCHAR(10)  NOT NULL CHECK (payment_method IN ('DINHEIRO', 'PIX', 'CARTAO')),
    payment_status VARCHAR(10)  NOT NULL DEFAULT 'PAGO' CHECK (payment_status IN ('PAGO', 'PENDENTE')),
    customer_name  VARCHAR(100),
    notes          VARCHAR(255),
    deleted_at     TIMESTAMPTZ
);

CREATE TABLE sale_items (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id               BIGINT       NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    product_id            BIGINT       REFERENCES products (id),
    product_name_snapshot VARCHAR(100) NOT NULL,
    unit_price_cents      BIGINT       NOT NULL CHECK (unit_price_cents >= 0),
    quantity              INT          NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_sales_user_id_sold_at ON sales (user_id, sold_at);
CREATE INDEX idx_sale_items_sale_id    ON sale_items (sale_id);
CREATE INDEX idx_products_user_id      ON products (user_id);
