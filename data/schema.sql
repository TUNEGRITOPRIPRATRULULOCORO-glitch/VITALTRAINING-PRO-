CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  rol           VARCHAR(50)  NOT NULL DEFAULT 'Futbolista',
  estado        VARCHAR(50)  NOT NULL DEFAULT 'Activo',
  peso          NUMERIC,
  altura        NUMERIC,
  fecha_nacimiento DATE,
  posicion      VARCHAR(100),
  frecuencia    VARCHAR(100),
  pie           VARCHAR(50),
  objetivo      TEXT,
  fecha_registro VARCHAR(50),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfiles (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre     VARCHAR(255),
  edad       INTEGER,
  peso       NUMERIC,
  altura     NUMERIC,
  posicion   VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfiles_medicos (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  condiciones      JSONB    DEFAULT '[]',
  alergias         JSONB    DEFAULT '[]',
  preferencias     VARCHAR(255) DEFAULT 'Sin restricciones',
  completado       BOOLEAN  DEFAULT FALSE,
  plan_alimenticio JSONB,
  rutina_semanal   JSONB,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salud (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  fatiga       INTEGER NOT NULL DEFAULT 5,
  sueno        INTEGER NOT NULL DEFAULT 7,
  recuperacion INTEGER NOT NULL DEFAULT 5,
  notas        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fecha)
);

CREATE TABLE IF NOT EXISTS alertas (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       VARCHAR(100),
  mensaje    TEXT,
  leida      BOOLEAN DEFAULT FALSE,
  fecha      VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comidas (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre         VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) DEFAULT 'almuerzo',
  calorias       INTEGER DEFAULT 0,
  proteina       NUMERIC,
  notas          TEXT DEFAULT '',
  fecha          DATE,
  hora           VARCHAR(10),
  registrado_por VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rutinas (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre           VARCHAR(255) NOT NULL,
  tipo             VARCHAR(100) DEFAULT 'entrenamiento',
  duracion_minutos INTEGER DEFAULT 60,
  intensidad       VARCHAR(50) DEFAULT 'media',
  descripcion      TEXT DEFAULT '',
  fecha            DATE,
  registrado_por   VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidencias (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo      VARCHAR(255) NOT NULL,
  usuario     VARCHAR(255),
  categoria   VARCHAR(100) DEFAULT 'Soporte',
  prioridad   VARCHAR(50)  DEFAULT 'media',
  estado      VARCHAR(50)  DEFAULT 'abierta',
  fecha       VARCHAR(50),
  descripcion TEXT DEFAULT '',
  comentarios JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cumplimiento (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  dia_semana VARCHAR(50) DEFAULT '',
  tipo       VARCHAR(100) DEFAULT '',
  notas      TEXT DEFAULT '',
  creado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fecha, dia_semana)
);

CREATE TABLE IF NOT EXISTS notas_nutricionista (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  nutricionista_id     BIGINT,
  nutricionista_nombre VARCHAR(255),
  texto                TEXT,
  fecha                VARCHAR(50),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);