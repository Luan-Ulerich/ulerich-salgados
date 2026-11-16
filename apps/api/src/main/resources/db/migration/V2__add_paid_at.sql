ALTER TABLE sales ADD COLUMN paid_at TIMESTAMPTZ;

UPDATE sales SET paid_at = sold_at WHERE payment_status = 'PAGO';

ALTER TABLE sales ADD CONSTRAINT chk_sales_payment_status_paid_at CHECK (
    (payment_status = 'PAGO' AND paid_at IS NOT NULL) OR
    (payment_status = 'PENDENTE' AND paid_at IS NULL)
);

CREATE INDEX idx_sales_user_id_paid_at ON sales (user_id, paid_at);
