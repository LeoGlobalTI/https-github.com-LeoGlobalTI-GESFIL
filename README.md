# GESFIL - Sistema de Gestión de Fila

Este proyecto está listo para ser desplegado en **Vercel**.

## Pasos para el Despliegue

1. **Conectar con GitHub**: Sube este código a un repositorio de GitHub.
2. **Importar en Vercel**: Ve a [vercel.com](https://vercel.com) e importa el repositorio.
3. **Configurar Variables de Entorno**:
   Durante el proceso de importación, añade las siguientes variables en la sección "Environment Variables":
   - `VITE_SUPABASE_URL`: Tu URL de proyecto de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Tu llave anónima de Supabase.
4. **Build & Install**: Vercel detectará automáticamente que es un proyecto Vite y usará los comandos correctos (`npm run build`).

## Configuración de Supabase

Asegúrate de haber ejecutado el script `supabase_schema.sql` en el SQL Editor de tu proyecto de Supabase para crear las tablas y funciones necesarias.

---
Powered by Global TI © 2026
