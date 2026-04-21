-- ============================================================
-- Fiscal receipts: table + functions
-- Run once:  psql -d <dbname> -f fiscal_receipts.sql
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS fiscal_receipt_no_seq START 1000 INCREMENT 1;

CREATE TABLE IF NOT EXISTS fiscal_receipts (
  id           SERIAL PRIMARY KEY,
  receipt_type VARCHAR(20)   NOT NULL CHECK (receipt_type IN ('booking', 'fine')),
  source_id    INTEGER       NOT NULL,
  receipt_no   INTEGER       NOT NULL,
  fp           VARCHAR(10)   NOT NULL,
  znm          VARCHAR(8)    NOT NULL,
  rnm          VARCHAR(15)   NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (receipt_type, source_id)
);

-- ============================================================
-- get_booking_receipt(booking_id, user_id)
--   user_id = NULL  →  admin call (no ownership check)
-- ============================================================
CREATE OR REPLACE FUNCTION get_booking_receipt(
  p_booking_id INTEGER,
  p_user_id    INTEGER DEFAULT NULL
)
RETURNS TABLE (
  receipt_id        INTEGER,
  receipt_no        INTEGER,
  fp                VARCHAR(10),
  znm               VARCHAR(8),
  rnm               VARCHAR(15),
  booking_uuid      TEXT,
  car_name          TEXT,
  license_plate     TEXT,
  tariff_name       TEXT,
  price_per_km      NUMERIC,
  start_odometer    INTEGER,
  end_odometer      INTEGER,
  km                INTEGER,
  insurance_deposit NUMERIC,
  charge_amount     NUMERIC,
  refund_amount     NUMERIC,
  client_name       TEXT,
  client_phone      TEXT,
  started_at        TIMESTAMP,
  ended_at          TIMESTAMP
)
LANGUAGE plpgsql AS $$
DECLARE
  v_rec    fiscal_receipts%ROWTYPE;
  v_seed   BIGINT;
  v_amount NUMERIC(12,2);
  v_no     INTEGER;
  v_fp     VARCHAR(10);
  v_znm    VARCHAR(8);
  v_rnm    VARCHAR(15);
BEGIN
  -- Проверяем, что бронь существует и завершена
  IF NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = p_booking_id
      AND b.status = 'completed'
      AND (p_user_id IS NULL OR b.user_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Чек не найден или недоступен (booking_id=%)', p_booking_id;
  END IF;

  -- Получаем сумму списания
  SELECT COALESCE(
    (SELECT tr.amount FROM transactions tr
     WHERE tr.booking_id = p_booking_id AND tr.type = 'charge' AND tr.status = 'success'
     LIMIT 1),
    0
  ) INTO v_amount;

  -- Получаем или создаём фискальную запись
  SELECT * INTO v_rec
  FROM fiscal_receipts
  WHERE receipt_type = 'booking' AND source_id = p_booking_id;

  IF NOT FOUND THEN
    v_no   := nextval('fiscal_receipt_no_seq')::INTEGER;
    v_seed := ((p_booking_id::BIGINT * 7919) + (v_amount * 100)::BIGINT) % 2147483647;
    v_fp   := LPAD(ABS(v_seed * 48271 % 9999999999)::TEXT, 10, '0');
    v_znm  := LPAD(p_booking_id::TEXT, 8, '0');
    v_rnm  := '0010' || LPAD(p_booking_id::TEXT, 11, '0');

    INSERT INTO fiscal_receipts (receipt_type, source_id, receipt_no, fp, znm, rnm, amount)
    VALUES ('booking', p_booking_id, v_no, v_fp, v_znm, v_rnm, v_amount)
    ON CONFLICT (receipt_type, source_id) DO NOTHING;

    SELECT * INTO v_rec
    FROM fiscal_receipts
    WHERE receipt_type = 'booking' AND source_id = p_booking_id;
  END IF;

  -- Возвращаем данные с явными кастами
  RETURN QUERY
  SELECT
    v_rec.id                                                              AS receipt_id,
    v_rec.receipt_no                                                      AS receipt_no,
    v_rec.fp                                                              AS fp,
    v_rec.znm                                                             AS znm,
    v_rec.rnm                                                             AS rnm,
    b.uuid::TEXT                                                          AS booking_uuid,
    (c.brand || ' ' || c.model)::TEXT                                     AS car_name,
    c.license_plate::TEXT                                                 AS license_plate,
    t.name::TEXT                                                          AS tariff_name,
    t.price_per_km::NUMERIC                                               AS price_per_km,
    b.start_odometer::INTEGER                                             AS start_odometer,
    b.end_odometer::INTEGER                                               AS end_odometer,
    CASE
      WHEN b.start_odometer IS NOT NULL AND b.end_odometer IS NOT NULL
      THEN (b.end_odometer - b.start_odometer)::INTEGER
    END                                                                   AS km,
    b.insurance_deposit::NUMERIC                                          AS insurance_deposit,
    (SELECT tr.amount::NUMERIC FROM transactions tr
     WHERE tr.booking_id = b.id AND tr.type = 'charge' AND tr.status = 'success'
     LIMIT 1)                                                             AS charge_amount,
    (SELECT tr.amount::NUMERIC FROM transactions tr
     WHERE tr.booking_id = b.id AND tr.type = 'refund'  AND tr.status = 'success'
     LIMIT 1)                                                             AS refund_amount,
    (u.first_name || ' ' || u.last_name)::TEXT                            AS client_name,
    u.phone::TEXT                                                         AS client_phone,
    b.started_at                                                          AS started_at,
    b.ended_at                                                            AS ended_at
  FROM bookings b
  JOIN cars  c ON c.id = b.car_id
  JOIN users u ON u.id = b.user_id
  LEFT JOIN tariffs t ON t.id = b.tariff_id
  WHERE b.id = p_booking_id;
END;
$$;

-- ============================================================
-- get_fine_receipt(fine_id, user_id)
--   user_id = NULL  →  admin call
-- ============================================================
CREATE OR REPLACE FUNCTION get_fine_receipt(
  p_fine_id INTEGER,
  p_user_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  receipt_id    INTEGER,
  receipt_no    INTEGER,
  fp            VARCHAR(10),
  znm           VARCHAR(8),
  rnm           VARCHAR(15),
  fine_type     TEXT,
  car_name      TEXT,
  license_plate TEXT,
  amount        NUMERIC,
  admin_comment TEXT,
  client_name   TEXT,
  client_phone  TEXT,
  paid_at       TIMESTAMP,
  created_at    TIMESTAMP
)
LANGUAGE plpgsql AS $$
DECLARE
  v_rec    fiscal_receipts%ROWTYPE;
  v_seed   BIGINT;
  v_amount NUMERIC(12,2);
  v_no     INTEGER;
  v_fp     VARCHAR(10);
  v_znm    VARCHAR(8);
  v_rnm    VARCHAR(15);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM fines f
    WHERE f.id = p_fine_id
      AND f.payment_status = 'paid'
      AND (p_user_id IS NULL OR f.user_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Чек не найден или штраф не оплачен (fine_id=%)', p_fine_id;
  END IF;

  SELECT COALESCE(f.amount, 0) INTO v_amount
  FROM fines f WHERE f.id = p_fine_id;

  SELECT * INTO v_rec
  FROM fiscal_receipts
  WHERE receipt_type = 'fine' AND source_id = p_fine_id;

  IF NOT FOUND THEN
    v_no   := nextval('fiscal_receipt_no_seq')::INTEGER;
    v_seed := ((p_fine_id::BIGINT * 7919) + (v_amount * 100)::BIGINT) % 2147483647;
    v_fp   := LPAD(ABS(v_seed * 48271 % 9999999999)::TEXT, 10, '0');
    v_znm  := LPAD(p_fine_id::TEXT, 8, '0');
    v_rnm  := '0010' || LPAD(p_fine_id::TEXT, 11, '0');

    INSERT INTO fiscal_receipts (receipt_type, source_id, receipt_no, fp, znm, rnm, amount)
    VALUES ('fine', p_fine_id, v_no, v_fp, v_znm, v_rnm, v_amount)
    ON CONFLICT (receipt_type, source_id) DO NOTHING;

    SELECT * INTO v_rec
    FROM fiscal_receipts
    WHERE receipt_type = 'fine' AND source_id = p_fine_id;
  END IF;

  RETURN QUERY
  SELECT
    v_rec.id                                       AS receipt_id,
    v_rec.receipt_no                               AS receipt_no,
    v_rec.fp                                       AS fp,
    v_rec.znm                                      AS znm,
    v_rec.rnm                                      AS rnm,
    f.fine_type::TEXT                              AS fine_type,
    (c.brand || ' ' || c.model)::TEXT              AS car_name,
    c.license_plate::TEXT                          AS license_plate,
    f.amount::NUMERIC                              AS amount,
    f.admin_comment::TEXT                          AS admin_comment,
    (u.first_name || ' ' || u.last_name)::TEXT     AS client_name,
    u.phone::TEXT                                  AS client_phone,
    f.paid_at                                      AS paid_at,
    f.created_at                                   AS created_at
  FROM fines f
  JOIN users u ON u.id = f.user_id
  LEFT JOIN cars c ON c.id = f.car_id
  WHERE f.id = p_fine_id;
END;
$$;
