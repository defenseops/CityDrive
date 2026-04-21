/* eslint-disable camelcase */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS postgis;

    -- ============================================================
    -- USERS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id                         BIGSERIAL PRIMARY KEY,
      uuid                       UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
      phone                      VARCHAR       NOT NULL UNIQUE,
      email                      VARCHAR       UNIQUE,
      password_hash              VARCHAR       NOT NULL,
      first_name                 VARCHAR       NOT NULL,
      last_name                  VARCHAR       NOT NULL,
      middle_name                VARCHAR,
      birth_date                 DATE          NOT NULL,
      driver_license_number      VARCHAR       NOT NULL UNIQUE,
      driver_license_issue_date  DATE          NOT NULL,
      driver_license_expiry_date DATE          NOT NULL,
      first_license_issue_date   DATE,
      driving_experience_years   NUMERIC(5,2)  DEFAULT 0.0,
      verification_status        VARCHAR(20)   NOT NULL DEFAULT 'unverified',
      rating                     NUMERIC(3,2)  DEFAULT 5.0,
      blocked_until              TIMESTAMP,
      block_reason               TEXT,
      can_book                   BOOLEAN       DEFAULT FALSE,
      total_rides                INTEGER       DEFAULT 0,
      total_spent                NUMERIC(12,2) DEFAULT 0.00,
      last_ride_at               TIMESTAMP,
      role                       VARCHAR(20)   NOT NULL DEFAULT 'user',
      created_at                 TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at                 TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- EMPLOYEES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS employees (
      id                         BIGSERIAL PRIMARY KEY,
      uuid                       UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
      phone                      VARCHAR       NOT NULL UNIQUE,
      email                      VARCHAR       NOT NULL UNIQUE,
      password_hash              VARCHAR       NOT NULL,
      first_name                 VARCHAR       NOT NULL,
      last_name                  VARCHAR       NOT NULL,
      middle_name                VARCHAR,
      role                       VARCHAR(30)   NOT NULL,
      driver_license_number      VARCHAR       UNIQUE,
      driver_license_expiry_date DATE,
      is_active                  BOOLEAN       DEFAULT TRUE,
      last_activity_at           TIMESTAMP,
      created_at                 TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at                 TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- PARKING_LOTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS parking_lots (
      id                  BIGSERIAL PRIMARY KEY,
      name                VARCHAR       NOT NULL,
      code                VARCHAR       NOT NULL UNIQUE,
      address             TEXT          NOT NULL,
      city                VARCHAR       NOT NULL,
      lat                 NUMERIC(10,7) NOT NULL,
      lon                 NUMERIC(10,7) NOT NULL,
      geom                GEOMETRY(Point, 4326) NOT NULL,
      total_capacity      INTEGER       NOT NULL,
      current_occupancy   INTEGER       DEFAULT 0,
      working_hours_start TIME          DEFAULT '00:00:00',
      working_hours_end   TIME          DEFAULT '23:59:00',
      is_24_7             BOOLEAN       DEFAULT TRUE,
      is_active           BOOLEAN       DEFAULT TRUE,
      phone               VARCHAR,
      manager_id          BIGINT        REFERENCES employees(id),
      created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- CARS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS cars (
      id                      BIGSERIAL PRIMARY KEY,
      license_plate           VARCHAR       NOT NULL UNIQUE,
      vin                     VARCHAR       UNIQUE,
      brand                   VARCHAR       NOT NULL,
      model                   VARCHAR       NOT NULL,
      year                    INTEGER,
      color                   VARCHAR,
      car_class               VARCHAR       NOT NULL,
      transmission            VARCHAR,
      engine_type             VARCHAR,
      fuel_tank_capacity_l    INTEGER,
      avg_fuel_consumption    NUMERIC,
      child_seat              BOOLEAN       DEFAULT FALSE,
      current_lat             NUMERIC(10,7),
      current_lon             NUMERIC(10,7),
      geom                    GEOMETRY(Point, 4326),
      address                 TEXT,
      current_parking_lot_id  BIGINT        REFERENCES parking_lots(id),
      fuel_level              INTEGER,
      odometer_km             INTEGER       DEFAULT 0,
      status                  VARCHAR(20)   NOT NULL DEFAULT 'available',
      is_locked               BOOLEAN       DEFAULT TRUE,
      home_parking_lot_id     BIGINT        NOT NULL REFERENCES parking_lots(id),
      current_driver_id       BIGINT        REFERENCES employees(id),
      last_maintenance_at     TIMESTAMP,
      last_maintenance_km     INTEGER,
      next_maintenance_km     INTEGER,
      price_per_minute        NUMERIC(8,2)  DEFAULT 5.00,
      price_per_km            NUMERIC(8,2)  DEFAULT 10.00,
      insurance_deposit       NUMERIC(10,2) DEFAULT 10000.00,
      created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- CAR_CLASS_RESTRICTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS car_class_restrictions (
      id                    BIGSERIAL PRIMARY KEY,
      car_class             VARCHAR       NOT NULL UNIQUE,
      min_age               INTEGER       NOT NULL DEFAULT 18,
      min_experience_years  NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
      description           TEXT,
      created_at            TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- TARIFFS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS tariffs (
      id                    BIGSERIAL PRIMARY KEY,
      name                  VARCHAR       NOT NULL,
      description           TEXT,
      car_class             VARCHAR,
      parking_lot_id        BIGINT        REFERENCES parking_lots(id),
      price_per_minute      NUMERIC(8,2)  NOT NULL,
      price_per_km          NUMERIC(8,2)  NOT NULL DEFAULT 0.00,
      insurance_deposit     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      default_delivery_fee  NUMERIC(8,2),
      default_pickup_fee    NUMERIC(8,2),
      dirty_car_fine        NUMERIC(8,2)  DEFAULT 500.00,
      smoking_fine          NUMERIC(8,2)  DEFAULT 2000.00,
      pet_hair_fine         NUMERIC(8,2)  DEFAULT 3000.00,
      valid_from            TIMESTAMP     NOT NULL,
      valid_to              TIMESTAMP,
      is_active             BOOLEAN       DEFAULT TRUE,
      created_at            TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- USER_DOCUMENTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS user_documents (
      id                   BIGSERIAL PRIMARY KEY,
      user_id              BIGINT      NOT NULL REFERENCES users(id),
      doc_type             VARCHAR     NOT NULL,
      document_number      VARCHAR,
      issue_date           DATE,
      expiry_date          DATE,
      issued_by            VARCHAR,
      file_url             TEXT        NOT NULL,
      file_thumbnail_url   TEXT,
      verification_status  VARCHAR(20) DEFAULT 'pending',
      verified_by          BIGINT      REFERENCES users(id),
      verified_at          TIMESTAMP,
      rejection_reason     TEXT,
      created_at           TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- USER_PAYMENT_METHODS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS user_payment_methods (
      id                   BIGSERIAL PRIMARY KEY,
      user_id              BIGINT      NOT NULL REFERENCES users(id),
      payment_gateway      VARCHAR     NOT NULL,
      payment_method_type  VARCHAR     NOT NULL,
      payment_token        VARCHAR     NOT NULL,
      card_mask            VARCHAR,
      card_brand           VARCHAR,
      card_expiry_month    INTEGER,
      card_expiry_year     INTEGER,
      is_default           BOOLEAN     DEFAULT FALSE,
      is_verified          BOOLEAN     DEFAULT FALSE,
      created_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, payment_token)
    );

    -- ============================================================
    -- BOOKINGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS bookings (
      id                       BIGSERIAL PRIMARY KEY,
      uuid                     UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
      user_id                  BIGINT        NOT NULL REFERENCES users(id),
      car_id                   BIGINT        NOT NULL REFERENCES cars(id),
      tariff_id                BIGINT        NOT NULL REFERENCES tariffs(id),
      pickup_parking_lot_id    BIGINT        REFERENCES parking_lots(id),
      return_parking_lot_id    BIGINT        REFERENCES parking_lots(id),
      reserved_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
      planned_start_at         TIMESTAMP,
      planned_end_at           TIMESTAMP,
      started_at               TIMESTAMP,
      ended_at                 TIMESTAMP,
      start_odometer           INTEGER,
      end_odometer             INTEGER,
      delivery_address         TEXT,
      delivery_lat             NUMERIC(10,7),
      delivery_lon             NUMERIC(10,7),
      pickup_address           TEXT,
      pickup_lat               NUMERIC(10,7),
      pickup_lon               NUMERIC(10,7),
      status                   VARCHAR(20)   NOT NULL DEFAULT 'reserved',
      has_delivery             BOOLEAN       DEFAULT FALSE,
      has_pickup               BOOLEAN       DEFAULT FALSE,
      insurance_deposit        NUMERIC(10,2) NOT NULL,
      base_rental_cost         NUMERIC(12,2) DEFAULT 0.00,
      delivery_fee             NUMERIC(8,2)  DEFAULT 0.00,
      pickup_fee               NUMERIC(8,2)  DEFAULT 0.00,
      cleaning_fee             NUMERIC(8,2)  DEFAULT 0.00,
      damage_fee               NUMERIC(8,2)  DEFAULT 0.00,
      other_fees               NUMERIC(8,2)  DEFAULT 0.00,
      total_cost               NUMERIC(12,2) DEFAULT 0.00,
      preauthorization_hold_id VARCHAR,
      created_at               TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMP     NOT NULL DEFAULT NOW(),
      CONSTRAINT bookings_status_check CHECK (status IN (
        'reserved','active','completed','cancelled','expired','no_show'
      ))
    );

    -- ============================================================
    -- TRANSACTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS transactions (
      id                      BIGSERIAL PRIMARY KEY,
      uuid                    UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
      user_id                 BIGINT        NOT NULL REFERENCES users(id),
      booking_id              BIGINT        REFERENCES bookings(id),
      payment_method_id       BIGINT        REFERENCES user_payment_methods(id),
      amount                  NUMERIC(12,2) NOT NULL,
      currency                VARCHAR(3)    DEFAULT 'RUB',
      type                    VARCHAR(20)   NOT NULL,
      status                  VARCHAR(20)   DEFAULT 'pending',
      payment_gateway         VARCHAR,
      external_transaction_id VARCHAR,
      hold_id                 VARCHAR,
      description             TEXT,
      error_message           TEXT,
      metadata                JSONB,
      created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- FINES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS fines (
      id                BIGSERIAL PRIMARY KEY,
      user_id           BIGINT      NOT NULL REFERENCES users(id),
      booking_id        BIGINT      REFERENCES bookings(id),
      car_id            BIGINT      REFERENCES cars(id),
      fine_type         VARCHAR     NOT NULL,
      resolution_number VARCHAR,
      violation_date    TIMESTAMP,
      violation_article VARCHAR,
      violation_place   TEXT,
      amount            NUMERIC(10,2) NOT NULL,
      payment_status    VARCHAR(20)   DEFAULT 'pending',
      paid_at           TIMESTAMP,
      transaction_id    BIGINT        REFERENCES transactions(id),
      original_fine_id  BIGINT        REFERENCES fines(id),
      reissued_at       TIMESTAMP,
      photo_urls        TEXT[],
      admin_comment     TEXT,
      created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
      created_by        BIGINT        REFERENCES employees(id),
      updated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- AUDIT_LOG
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_log (
      id          BIGSERIAL PRIMARY KEY,
      table_name  VARCHAR   NOT NULL,
      operation   VARCHAR   NOT NULL,
      record_id   BIGINT,
      old_data    JSONB,
      new_data    JSONB,
      changed_by  VARCHAR,
      changed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      ip_address  INET
    );

    -- ============================================================
    -- BOOKING_SERVICES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS booking_services (
      id           BIGSERIAL PRIMARY KEY,
      booking_id   BIGINT        NOT NULL REFERENCES bookings(id),
      service_type VARCHAR       NOT NULL,
      service_name VARCHAR       NOT NULL,
      amount       NUMERIC(10,2) NOT NULL,
      notes        TEXT,
      created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- CAR_DAMAGES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS car_damages (
      id                   BIGSERIAL PRIMARY KEY,
      car_id               BIGINT      NOT NULL REFERENCES cars(id),
      body_part            VARCHAR     NOT NULL,
      damage_type          VARCHAR     NOT NULL,
      severity             VARCHAR     NOT NULL,
      description          TEXT,
      photo_urls           TEXT[],
      status               VARCHAR(20) DEFAULT 'active',
      detected_by          BIGINT      REFERENCES employees(id),
      detected_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
      inspection_report_id BIGINT,
      repaired_at          TIMESTAMP,
      repaired_by          BIGINT      REFERENCES employees(id),
      repair_cost          NUMERIC(10,2),
      maintenance_id       BIGINT,
      created_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- MAINTENANCE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS maintenance (
      id                  BIGSERIAL PRIMARY KEY,
      car_id              BIGINT      NOT NULL REFERENCES cars(id),
      service_type        VARCHAR     NOT NULL,
      status              VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      scheduled_date      DATE,
      start_date          TIMESTAMP,
      end_date            TIMESTAMP,
      odometer_at_service INTEGER,
      description         TEXT,
      works_performed     TEXT,
      cost                NUMERIC(10,2),
      contractor          VARCHAR,
      damage_id           BIGINT      REFERENCES car_damages(id),
      created_by          BIGINT      REFERENCES employees(id),
      created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    ALTER TABLE car_damages
      ADD CONSTRAINT IF NOT EXISTS car_damages_maintenance_id_fkey
      FOREIGN KEY (maintenance_id) REFERENCES maintenance(id);

    -- ============================================================
    -- INSPECTION_REPORTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS inspection_reports (
      id                  BIGSERIAL PRIMARY KEY,
      booking_id          BIGINT      NOT NULL REFERENCES bookings(id),
      car_id              BIGINT      NOT NULL REFERENCES cars(id),
      employee_id         BIGINT      NOT NULL REFERENCES employees(id),
      inspection_type     VARCHAR     NOT NULL,
      odometer            INTEGER     NOT NULL,
      exterior_clean      BOOLEAN     DEFAULT TRUE,
      interior_clean      BOOLEAN     DEFAULT TRUE,
      has_new_damages     BOOLEAN     DEFAULT FALSE,
      has_smoke_smell     BOOLEAN     DEFAULT FALSE,
      has_pet_hair        BOOLEAN     DEFAULT FALSE,
      location_type       VARCHAR,
      parking_lot_id      BIGINT      REFERENCES parking_lots(id),
      address             TEXT,
      lat                 NUMERIC(10,7),
      lon                 NUMERIC(10,7),
      photo_urls          TEXT[],
      notes               TEXT,
      client_signature_url TEXT,
      created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    ALTER TABLE car_damages
      ADD CONSTRAINT IF NOT EXISTS car_damages_inspection_report_id_fkey
      FOREIGN KEY (inspection_report_id) REFERENCES inspection_reports(id);

    -- ============================================================
    -- CAR_INSPECTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS car_inspections (
      id              SERIAL PRIMARY KEY,
      car_id          INTEGER REFERENCES cars(id),
      booking_id      INTEGER REFERENCES bookings(id),
      driver_id       INTEGER REFERENCES employees(id),
      inspection_type VARCHAR DEFAULT 'pre_delivery',
      body_ok         BOOLEAN DEFAULT TRUE,
      glass_ok        BOOLEAN DEFAULT TRUE,
      interior_ok     BOOLEAN DEFAULT TRUE,
      tires_ok        BOOLEAN DEFAULT TRUE,
      lights_ok       BOOLEAN DEFAULT TRUE,
      has_new_damage  BOOLEAN DEFAULT FALSE,
      defect_notes    TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );

    -- ============================================================
    -- DELIVERY_ASSIGNMENTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id           SERIAL PRIMARY KEY,
      booking_id   INTEGER    REFERENCES bookings(id),
      driver_id    INTEGER    REFERENCES employees(id),
      status       VARCHAR    DEFAULT 'accepted',
      task_type    VARCHAR    DEFAULT 'delivery',
      created_at   TIMESTAMP  DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    -- ============================================================
    -- RELOCATION_TASKS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS relocation_tasks (
      id                          BIGSERIAL PRIMARY KEY,
      booking_id                  BIGINT      REFERENCES bookings(id),
      car_id                      BIGINT      NOT NULL REFERENCES cars(id),
      task_type                   VARCHAR     NOT NULL,
      source_type                 VARCHAR     NOT NULL,
      source_parking_lot_id       BIGINT      REFERENCES parking_lots(id),
      source_address              TEXT,
      source_lat                  NUMERIC(10,7),
      source_lon                  NUMERIC(10,7),
      destination_type            VARCHAR     NOT NULL,
      destination_parking_lot_id  BIGINT      REFERENCES parking_lots(id),
      destination_address         TEXT,
      destination_lat             NUMERIC(10,7),
      destination_lon             NUMERIC(10,7),
      assigned_to                 BIGINT      REFERENCES employees(id),
      scheduled_start_at          TIMESTAMP,
      scheduled_end_at            TIMESTAMP,
      started_at                  TIMESTAMP,
      completed_at                TIMESTAMP,
      start_odometer              INTEGER,
      end_odometer                INTEGER,
      distance_km                 NUMERIC(8,2),
      status                      VARCHAR     NOT NULL DEFAULT 'pending',
      notes                       TEXT,
      created_at                  TIMESTAMP   NOT NULL DEFAULT NOW(),
      created_by                  BIGINT      REFERENCES employees(id),
      updated_at                  TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- FUEL_LOGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id                  BIGSERIAL PRIMARY KEY,
      car_id              BIGINT        NOT NULL REFERENCES cars(id),
      employee_id         BIGINT        NOT NULL REFERENCES employees(id),
      relocation_task_id  BIGINT        REFERENCES relocation_tasks(id),
      odometer            INTEGER       NOT NULL,
      liters              NUMERIC(6,2)  NOT NULL,
      cost                NUMERIC(10,2) NOT NULL,
      price_per_liter     NUMERIC(6,2),
      fuel_station        VARCHAR,
      fuel_type           VARCHAR       DEFAULT 'petrol',
      photo_receipt_url   TEXT,
      notes               TEXT,
      created_at          TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- INDEXES
    -- ============================================================
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id   ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_car_id    ON bookings(car_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_dates     ON bookings(started_at, ended_at);
    CREATE INDEX IF NOT EXISTS idx_fines_user_id      ON fines(user_id);
    CREATE INDEX IF NOT EXISTS idx_fines_status       ON fines(payment_status);
    CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user  ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_cars_status        ON cars(status);
    CREATE INDEX IF NOT EXISTS idx_cars_parking_lot   ON cars(current_parking_lot_id);
    CREATE INDEX IF NOT EXISTS idx_audit_table        ON audit_log(table_name, changed_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS fuel_logs CASCADE;
    DROP TABLE IF EXISTS relocation_tasks CASCADE;
    DROP TABLE IF EXISTS delivery_assignments CASCADE;
    DROP TABLE IF EXISTS car_inspections CASCADE;
    DROP TABLE IF EXISTS inspection_reports CASCADE;
    DROP TABLE IF EXISTS maintenance CASCADE;
    DROP TABLE IF EXISTS car_damages CASCADE;
    DROP TABLE IF EXISTS booking_services CASCADE;
    DROP TABLE IF EXISTS audit_log CASCADE;
    DROP TABLE IF EXISTS fines CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS bookings CASCADE;
    DROP TABLE IF EXISTS user_payment_methods CASCADE;
    DROP TABLE IF EXISTS user_documents CASCADE;
    DROP TABLE IF EXISTS tariffs CASCADE;
    DROP TABLE IF EXISTS car_class_restrictions CASCADE;
    DROP TABLE IF EXISTS cars CASCADE;
    DROP TABLE IF EXISTS parking_lots CASCADE;
    DROP TABLE IF EXISTS employees CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
};
