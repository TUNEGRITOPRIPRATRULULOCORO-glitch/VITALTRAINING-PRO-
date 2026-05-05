const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 4000;

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Sirve el frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ========================
// BASE DE DATOS
// ========================
const DB_PATH = path.join(__dirname, 'database.json');

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
        console.error('❌ Error leyendo database.json:', err.message);
        return { usuarios: [], incidencias: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Error escribiendo database.json:', err.message);
    }
}

// ========================
// AUTH — LOGIN
// ========================
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔐 Login intent: ${email}`);

        if (!email || !password)
            return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });

        const data = readDB();
        const user = data.usuarios.find(u =>
            u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user)
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

        if (user.estado === 'Inactivo')
            return res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });

        // ✅ CORRECCIÓN: se eliminó el bloqueo que impedía entrar a Futbolistas.
        // Ahora cualquier rol puede iniciar sesión. El frontend redirige según rol.

        const { password: _, ...userSafe } = user;
        console.log(`✅ Login exitoso: ${user.nombre} (${user.rol})`);
        res.json({ ok: true, user: userSafe });

    } catch (err) {
        console.error('❌ Error en login:', err.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ========================
// AUTH — REGISTRO
// ========================
app.post('/api/auth/registro', (req, res) => {
    try {
        const { nombre, email, password, peso, altura, fechaNacimiento, posicion, frecuencia, condiciones } = req.body;

        if (!nombre || !email || !password)
            return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos.' });

        const data = readDB();
        const existe = data.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existe)
            return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });

        const newUser = {
            id: Date.now(), nombre, email, password,
            rol: 'Futbolista', estado: 'Activo',
            peso: peso || null, altura: altura || null,
            fechaNacimiento: fechaNacimiento || null,
            posicion: posicion || null,
            frecuencia: frecuencia || null,
            condiciones: condiciones || [],
            fechaRegistro: new Date().toLocaleDateString('es-CO')
        };

        data.usuarios.push(newUser);
        writeDB(data);

        const { password: _, ...userSafe } = newUser;
        console.log(`✅ Registro exitoso: ${nombre}`);
        res.status(201).json({ ok: true, user: userSafe });

    } catch (err) {
        console.error('❌ Error en registro:', err.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ========================
// USUARIOS — GET
// ========================
app.get('/api/usuarios', (req, res) => {
    try {
        const data = readDB();
        const { q, rol, estado } = req.query;

        let usuarios = data.usuarios.map(({ password, ...u }) => u);

        if (q)
            usuarios = usuarios.filter(u =>
                u.nombre.toLowerCase().includes(q.toLowerCase()) ||
                u.email.toLowerCase().includes(q.toLowerCase())
            );

        if (rol && rol !== 'Todos los roles')
            usuarios = usuarios.filter(u => u.rol === rol);

        if (estado && estado !== 'Todos los estados')
            usuarios = usuarios.filter(u => u.estado === estado);

        res.json(usuarios);
    } catch (err) {
        console.error('❌ Error leyendo usuarios:', err.message);
        res.status(500).json({ error: 'Error leyendo usuarios.' });
    }
});

// ========================
// USUARIOS — POST
// ========================
app.post('/api/usuarios', (req, res) => {
    try {
        const data = readDB();
        const newUser = { id: Date.now(), password: req.body.password || '1234', ...req.body };
        data.usuarios.push(newUser);
        writeDB(data);
        const { password, ...safe } = newUser;
        console.log(`✅ Usuario creado: ${newUser.nombre}`);
        res.status(201).json(safe);
    } catch (err) {
        console.error('❌ Error creando usuario:', err.message);
        res.status(500).json({ error: 'Error creando usuario.' });
    }
});

// ========================
// USUARIOS — PUT
// ========================
app.put('/api/usuarios/:id', (req, res) => {
    try {
        const data = readDB();
        const idx = data.usuarios.findIndex(u => u.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const { password, ...body } = req.body;
        data.usuarios[idx] = { ...data.usuarios[idx], ...body };
        writeDB(data);
        const { password: _, ...safe } = data.usuarios[idx];
        res.json(safe);
    } catch (err) {
        console.error('❌ Error actualizando usuario:', err.message);
        res.status(500).json({ error: 'Error actualizando usuario.' });
    }
});

// ========================
// USUARIOS — DELETE
// ========================
app.delete('/api/usuarios/:id', (req, res) => {
    try {
        const data = readDB();
        const idx = data.usuarios.findIndex(u => u.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const nombre = data.usuarios[idx].nombre;
        data.usuarios.splice(idx, 1);
        writeDB(data);
        console.log(`🗑 Usuario eliminado: ${nombre}`);
        res.json({ mensaje: 'Eliminado correctamente.' });
    } catch (err) {
        console.error('❌ Error eliminando usuario:', err.message);
        res.status(500).json({ error: 'Error eliminando usuario.' });
    }
});

// ========================
// INCIDENCIAS — GET
// ========================
app.get('/api/incidencias', (req, res) => {
    try {
        const data = readDB();
        const { estado, prioridad } = req.query;
        let inc = data.incidencias;
        if (estado && estado !== 'Todos') inc = inc.filter(i => i.estado === estado);
        if (prioridad && prioridad !== 'Todas') inc = inc.filter(i => i.prioridad === prioridad);
        res.json(inc);
    } catch (err) {
        console.error('❌ Error leyendo incidencias:', err.message);
        res.status(500).json({ error: 'Error leyendo incidencias.' });
    }
});

// ========================
// INCIDENCIAS — ESTADO
// ========================
app.put('/api/incidencias/:id/estado', (req, res) => {
    try {
        const data = readDB();
        const idx = data.incidencias.findIndex(i => i.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Incidencia no encontrada.' });
        data.incidencias[idx].estado = req.body.estado;
        writeDB(data);
        res.json(data.incidencias[idx]);
    } catch (err) {
        console.error('❌ Error actualizando incidencia:', err.message);
        res.status(500).json({ error: 'Error actualizando incidencia.' });
    }
});

// ========================
// INCIDENCIAS — COMENTARIOS
// ========================
app.post('/api/incidencias/:id/comentarios', (req, res) => {
    try {
        const data = readDB();
        const idx = data.incidencias.findIndex(i => i.id == req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Incidencia no encontrada.' });
        const comentario = {
            autor: 'Admin',
            fecha: new Date().toLocaleDateString('es-CO'),
            texto: req.body.texto
        };
        data.incidencias[idx].comentarios.push(comentario);
        writeDB(data);
        res.json(comentario);
    } catch (err) {
        console.error('❌ Error añadiendo comentario:', err.message);
        res.status(500).json({ error: 'Error añadiendo comentario.' });
    }
});

// ========================
// REPORTES
// ========================
app.get('/api/reportes', (req, res) => {
    try {
        const { usuarios, incidencias } = readDB();
        res.json({
            totalUsuarios: usuarios.length,
            activos: usuarios.filter(u => u.estado === 'Activo').length,
            inactivos: usuarios.filter(u => u.estado === 'Inactivo').length,
            porRol: {
                Futbolista:    usuarios.filter(u => u.rol === 'Futbolista').length,
                Nutricionista: usuarios.filter(u => u.rol === 'Nutricionista').length,
                Administrador: usuarios.filter(u => u.rol === 'Administrador').length
            },
            totalIncidencias: incidencias.length,
            incidenciasAbiertas:  incidencias.filter(i => i.estado === 'abierta').length,
            incidenciasCriticas:  incidencias.filter(i => i.prioridad === 'critica').length,
            incidenciasPorEstado: {
                abierta:       incidencias.filter(i => i.estado === 'abierta').length,
                'en progreso': incidencias.filter(i => i.estado === 'en progreso').length,
                resuelta:      incidencias.filter(i => i.estado === 'resuelta').length
            }
        });
    } catch (err) {
        console.error('❌ Error generando reportes:', err.message);
        res.status(500).json({ error: 'Error generando reportes.' });
    }
});

// ========================
// PANEL FUTBOLISTA — rutas
// ========================
const panelRoutes = require('./routes/panelRoutes');
app.use('/api/panel', panelRoutes);

// ========================
// CATCH-ALL (SPA)
// ========================
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================
// INICIO
// ========================
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Vital Training — Servidor iniciado');
    console.log(`📡 http://localhost:${PORT}`);
    console.log('');
});