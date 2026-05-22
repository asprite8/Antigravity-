const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Antigravity Chinese localization installer builder ===');

const translationsPath = path.join(__dirname, 'translations_patch.json');
const engineTemplatePath = path.join(__dirname, 'localization_engine_template.js');
const installerTemplatePath = path.join(__dirname, 'installer_template.js');
const outputInstallerJsPath = path.join(__dirname, 'installer.js');

try {
    // 1. Read translations patch
    console.log('Reading translations patch dictionary...');
    if (!fs.existsSync(translationsPath)) {
        throw new Error(`Translations file not found: ${translationsPath}`);
    }
    const translationsJson = fs.readFileSync(translationsPath, 'utf8');
    // Parse to ensure it is valid JSON
    JSON.parse(translationsJson);

    // 2. Read engine template and replace placeholder
    console.log('Reading engine template...');
    if (!fs.existsSync(engineTemplatePath)) {
        throw new Error(`Engine template file not found: ${engineTemplatePath}`);
    }
    let engineCode = fs.readFileSync(engineTemplatePath, 'utf8');
    
    // Inject translations JSON directly into the engine template safely (using a callback to prevent regex character bugs)
    engineCode = engineCode.replace('__TRANSLATIONS_PLACEHOLDER__', () => translationsJson);
    console.log('Injected translations patch into engine code.');

    // 3. Read installer template and replace localization engine placeholder
    console.log('Reading installer template...');
    if (!fs.existsSync(installerTemplatePath)) {
        throw new Error(`Installer template file not found: ${installerTemplatePath}`);
    }
    let installerCode = fs.readFileSync(installerTemplatePath, 'utf8');
    
    // Inject the final engine code into installer template via Base64 to prevent escape/whitespace evaluation bugs
    const placeholder = "'__LOCALIZATION_ENGINE_CODE__'";
    const placeholderIndex = installerCode.indexOf(placeholder);
    if (placeholderIndex === -1) {
        throw new Error(`Placeholder ${placeholder} not found in installer_template.js`);
    }
    
    const engineCodeBase64 = Buffer.from(engineCode, 'utf8').toString('base64');
    installerCode = installerCode.substring(0, placeholderIndex) + 
                    "'" + engineCodeBase64 + "'" + 
                    installerCode.substring(placeholderIndex + placeholder.length);
                    
    console.log('Injected Base64 engine code into installer.');

    // 4. Write generated installer.js
    console.log(`Writing generated installer to ${outputInstallerJsPath}...`);
    fs.writeFileSync(outputInstallerJsPath, installerCode, 'utf8');
    console.log('installer.js created successfully.');

    // 5. Run pkg compilation
    console.log('Compiling installer to standalone .exe via pkg...');
    // We'll execute pkg using npx
    // pkg targets node18-win-x64
    const compileCmd = 'npx --registry=https://registry.npmjs.org/ pkg installer.js --targets node18-win-x64 --output antigravity-zh.exe';
    console.log(`Running: ${compileCmd}`);
    execSync(compileCmd, { stdio: 'inherit', cwd: __dirname });
    console.log('\n==================================================');
    console.log('  Success: Compiled to antigravity-zh.exe successfully!');
    console.log('==================================================');
} catch (e) {
    console.error('Error occurred during build process:', e);
    process.exit(1);
}
