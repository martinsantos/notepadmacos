#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, 'assets');
const SVG_PATH = path.join(ASSETS_DIR, 'icon.svg');
const PNG_PATH = path.join(ASSETS_DIR, 'icon.png');
const ICONSET_DIR = path.join(ASSETS_DIR, 'icon.iconset');
const ICNS_PATH = path.join(ASSETS_DIR, 'icon.icns');

async function generateIcon() {
    console.log('🎨 Generando íconos para Notepad...\n');

    // Check SVG exists
    if (!fs.existsSync(SVG_PATH)) {
        console.error('❌ No se encontró assets/icon.svg');
        process.exit(1);
    }

    // Read SVG
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate 1024x1024 PNG
    console.log('📸 Creando PNG base (1024x1024)...');
    await sharp(svgBuffer)
        .resize(1024, 1024)
        .png()
        .toFile(PNG_PATH);
    console.log('   ✅ assets/icon.png creado');

    // Create iconset directory
    if (!fs.existsSync(ICONSET_DIR)) {
        fs.mkdirSync(ICONSET_DIR, { recursive: true });
    }

    // Generate all required sizes for macOS iconset
    const sizes = [
        { size: 16, suffix: '16x16' },
        { size: 32, suffix: '16x16@2x' },
        { size: 32, suffix: '32x32' },
        { size: 64, suffix: '32x32@2x' },
        { size: 128, suffix: '128x128' },
        { size: 256, suffix: '128x128@2x' },
        { size: 256, suffix: '256x256' },
        { size: 512, suffix: '256x256@2x' },
        { size: 512, suffix: '512x512' },
        { size: 1024, suffix: '512x512@2x' }
    ];

    console.log('\n📐 Creando iconset con múltiples tamaños...');
    for (const { size, suffix } of sizes) {
        const outputPath = path.join(ICONSET_DIR, `icon_${suffix}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`   ✅ icon_${suffix}.png (${size}x${size})`);
    }

    // Try to generate .icns on macOS
    if (process.platform === 'darwin') {
        console.log('\n🍎 Generando icon.icns para macOS...');
        try {
            execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${ICNS_PATH}"`);
            console.log('   ✅ assets/icon.icns creado');
        } catch (e) {
            console.log('   ⚠️  No se pudo crear .icns automáticamente');
            console.log('   Ejecuta manualmente: iconutil -c icns assets/icon.iconset -o assets/icon.icns');
        }
    } else {
        console.log('\n⚠️  Para generar icon.icns en macOS, ejecuta:');
        console.log('   iconutil -c icns assets/icon.iconset -o assets/icon.icns');
    }

    console.log('\n✅ ¡Generación de íconos completada!');
}

generateIcon().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
