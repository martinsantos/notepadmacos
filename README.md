# Notepad for macOS

<p align="center">
  <img src="assets/icon.png" alt="Notepad Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Un editor de texto simple, rápido y ligero para macOS</strong>
</p>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#uso">Uso</a> •
  <a href="#atajos-de-teclado">Atajos</a> •
  <a href="#desarrollo">Desarrollo</a>
</p>

---

## Características

- **Ligero y rápido** - Inicia instantáneamente, sin demoras
- **Múltiples pestañas** - Trabaja con varios archivos a la vez
- **Archivos fijados 📌** - Mantén tus archivos favoritos siempre accesibles
- **Archivos recientes** - Acceso rápido a los últimos 30 documentos
- **Historial de cambios** - Vuelve a cualquier versión anterior de tu documento
- **Auto-guardado** - Nunca pierdas tu trabajo
- **Persistencia de sesión** - Recupera tus pestañas al reiniciar la app
- **Integración con Dock** - Archivos recientes accesibles desde el Dock de macOS
- **Diseño nativo** - Interfaz que se siente como parte de macOS

## Instalación

### Opción 1: Descargar DMG (Recomendado)

1. Ve a [Releases](https://github.com/martinsantos/notepadmacos/releases)
2. Descarga el archivo `.dmg` más reciente
3. Abre el DMG y arrastra Notepad a tu carpeta Aplicaciones
4. ¡Listo!

### Opción 2: Desde el código fuente

```bash
# Clonar el repositorio
git clone https://github.com/martinsantos/notepadmacos.git
cd notepadmacos

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Compilar app nativa
npm run build
```

## Uso

### Menú de archivo

- **Nuevo** (⌘N) - Crea un documento nuevo
- **Nueva pestaña** (⌘T) - Abre una nueva pestaña
- **Abrir** (⌘O) - Abre un archivo existente
- **📌 Fijados** - Accede a tus archivos fijados
- **Recientes** - Accede a archivos abiertos recientemente
- **Guardar** (⌘G) - Guarda el documento actual
- **Guardar como** (⇧⌘G) - Guarda con un nuevo nombre
- **📌 Fijar archivo** - Fija el archivo actual para acceso rápido
- **Mostrar en Finder** - Abre la ubicación del archivo

### Historial

Cada cambio en tu documento se guarda automáticamente en el historial. Puedes:

- Ver el historial completo (⌘Y)
- Restaurar cualquier versión anterior
- Exportar el historial a un archivo
- Limpiar el historial

## Atajos de teclado

| Acción | Atajo |
|--------|-------|
| Nuevo documento | ⌘N |
| Nueva pestaña | ⌘T |
| Abrir archivo | ⌘O |
| Guardar | ⌘G |
| Guardar como | ⇧⌘G |
| Cerrar pestaña | ⌘W |
| Buscar | ⌘F |
| Reemplazar | ⌘H |
| Ver historial | ⌘Y |
| Deshacer | ⌘Z |
| Rehacer | ⇧⌘Z |

## Desarrollo

### Requisitos

- Node.js 18+
- npm 9+
- macOS 10.15+

### Scripts disponibles

```bash
npm start        # Ejecutar en modo desarrollo
npm run dev      # Ejecutar con DevTools abierto
npm run icons    # Regenerar iconos desde SVG
npm run build    # Compilar app (.dmg y .zip)
```

### Estructura del proyecto

```
notepadmacos/
├── main.js          # Proceso principal de Electron
├── preload.js       # Bridge entre main y renderer
├── renderer.html    # Interfaz de usuario
├── renderer.js      # Lógica de la interfaz
├── styles.css       # Estilos
├── assets/
│   ├── icon.svg     # Icono fuente
│   ├── icon.png     # Icono generado
│   └── icon.iconset/# Iconos para macOS
└── package.json     # Configuración del proyecto
```

## Licencia

MIT © [Martín Santos](https://github.com/martinsantos)

---

<p align="center">
  Hecho con ❤️ para macOS
</p>
