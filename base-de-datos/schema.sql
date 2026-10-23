CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  rol           VARCHAR(50)  NOT NULL DEFAULT 'Atleta',
  estado        VARCHAR(50)  NOT NULL DEFAULT 'Activo',
  deporte_principal VARCHAR(50) NOT NULL DEFAULT 'Fútbol',
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
  user_id    BIGINT UNIQUE,
  nombre     VARCHAR(255),
  edad       INTEGER,
  peso       NUMERIC,
  altura     NUMERIC,
  posicion   VARCHAR(100),
  sexo       VARCHAR(20),
  dia_partido VARCHAR(12),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfiles_medicos (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT UNIQUE,
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
  user_id      BIGINT,
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
  user_id    BIGINT,
  tipo       VARCHAR(100),
  mensaje    TEXT,
  leida      BOOLEAN DEFAULT FALSE,
  fecha      VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comidas (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT,
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
  user_id          BIGINT,
  nombre           VARCHAR(255) NOT NULL,
  tipo             VARCHAR(100) DEFAULT 'entrenamiento',
  duracion_minutos INTEGER DEFAULT 60,
  intensidad       VARCHAR(50) DEFAULT 'media',
  descripcion      TEXT DEFAULT '',
  fecha            DATE,
  rpe              INTEGER,
  registrado_por   VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidencias (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT,
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
  user_id    BIGINT,
  fecha      DATE NOT NULL,
  dia_semana VARCHAR(50) DEFAULT '',
  tipo       VARCHAR(100) DEFAULT '',
  notas      TEXT DEFAULT '',
  estado     VARCHAR(20) DEFAULT 'completo',
  rpe        INTEGER,
  duracion_minutos INTEGER,
  creado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fecha, dia_semana)
);

CREATE TABLE IF NOT EXISTS notas_nutricionista (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT,
  nutricionista_id     BIGINT,
  nutricionista_nombre VARCHAR(255),
  texto                TEXT,
  fecha                VARCHAR(50),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fotos_perfil (
  user_id     BIGINT PRIMARY KEY,
  mime        VARCHAR(20) NOT NULL,
  datos       TEXT NOT NULL,
  actualizado TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluaciones (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL,
  prueba         VARCHAR(40) NOT NULL,
  valor          NUMERIC NOT NULL,
  fecha          DATE NOT NULL,
  notas          TEXT DEFAULT '',
  registrado_por VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restablecimientos (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expira     TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id              BIGSERIAL PRIMARY KEY,
  remitente_id    BIGINT NOT NULL,
  destinatario_id BIGINT NOT NULL,
  texto           TEXT NOT NULL,
  leido           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ADD CONSTRAINT perfiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE perfiles_medicos ADD CONSTRAINT perfiles_medicos_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE salud ADD CONSTRAINT salud_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE alertas ADD CONSTRAINT alertas_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE comidas ADD CONSTRAINT comidas_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE rutinas ADD CONSTRAINT rutinas_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE incidencias ADD CONSTRAINT incidencias_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE cumplimiento ADD CONSTRAINT cumplimiento_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE notas_nutricionista ADD CONSTRAINT notas_nutricionista_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE mensajes ADD CONSTRAINT mensajes_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE mensajes ADD CONSTRAINT mensajes_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE fotos_perfil ADD CONSTRAINT fotos_perfil_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE restablecimientos ADD CONSTRAINT restablecimientos_user_id_fkey FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
