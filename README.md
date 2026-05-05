# Vital Training — Panel de Administración

## 🚀 INSTRUCCIONES (leer antes de correr)

### ⚠️ IMPORTANTE: borrar node_modules si ya tienes el proyecto
Si ya intentaste correr el proyecto antes, borra la carpeta `node_modules` antes de continuar.

### Paso a paso en PowerShell:

```powershell
# 1. Habilitar scripts (necesario en Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 2. Instalar dependencias (esto instala Express 4, versión estable)
npm install

# 3. Iniciar servidor
npm start
```

### 4. Abrir en el navegador:
👉 http://localhost:3000

---

Si ves el error "PathError path-to-regexp", es porque tienes Express 5 instalado.
Solución: borra la carpeta `node_modules` y corre `npm install` de nuevo.
