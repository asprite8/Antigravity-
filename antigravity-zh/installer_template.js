const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const readline = require('readline');

// The placeholder below will be replaced with the Base64 of actual Chinese localization engine IIFE code at build-time.
const LOCALIZATION_ENGINE_BASE64 = '__LOCALIZATION_ENGINE_CODE__';
const LOCALIZATION_ENGINE_CODE = Buffer.from(LOCALIZATION_ENGINE_BASE64, 'base64').toString('utf8');


function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

function printBanner() {
    console.log('==================================================');
    console.log('      Antigravity 客户端汉化补丁一键部署工具');
    console.log('==================================================');
    console.log('  本工具将对您的 Antigravity 客户端应用官方中文汉化。');
    console.log('  过程包括：备份原版文件 -> 注入汉化代码 -> 重新打包 -> 重启。');
    console.log('--------------------------------------------------\n');
}

function detectInstallationDir() {
    const searchPaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'antigravity'),
        path.join(process.env.PROGRAMFILES || '', 'antigravity'),
        process.cwd(),
    ];

    for (const p of searchPaths) {
        if (!p) continue;
        const asarPath = path.join(p, 'resources', 'app.asar');
        if (fs.existsSync(asarPath)) {
            return p;
        }
    }
    return null;
}

async function promptForPath() {
    console.log('未能在默认系统路径中自动定位到 Antigravity 安装目录。');
    console.log('请输入您的 Antigravity 安装路径（通常包含 Antigravity.exe，支持拖拽文件夹到此处）:');
    while (true) {
        let inputPath = await askQuestion('> ');
        inputPath = inputPath.trim().replace(/^["']|["']$/g, ''); // 移除可能的引号
        if (!inputPath) continue;
        
        const asarPath = path.join(inputPath, 'resources', 'app.asar');
        if (fs.existsSync(asarPath)) {
            return inputPath;
        }
        
        // 兼容用户直接拖入 resources 目录
        if (path.basename(inputPath).toLowerCase() === 'resources' && fs.existsSync(path.join(inputPath, 'app.asar'))) {
            const parent = path.dirname(inputPath);
            if (fs.existsSync(path.join(parent, 'Antigravity.exe'))) {
                return parent;
            }
        }
        
        // 兼容用户直接拖入 app.asar
        if (path.basename(inputPath).toLowerCase() === 'app.asar' && fs.existsSync(inputPath)) {
            const parentResources = path.dirname(inputPath);
            const parentMain = path.dirname(parentResources);
            if (fs.existsSync(path.join(parentMain, 'Antigravity.exe'))) {
                return parentMain;
            }
        }

        console.log('【错误】未能在该目录下找到 resources/app.asar，请确保路径正确！');
        console.log('请重新输入，或按 Ctrl+C 终止运行。');
    }
}

function killAntigravity() {
    try {
        // 检查进程是否在运行
        child_process.execSync('tasklist | findstr /I Antigravity.exe', { stdio: 'ignore' });
        console.log('[1/4] 检测到 Antigravity 客户端正在运行，正在将其强制关闭...');
        child_process.execSync('taskkill /F /IM Antigravity.exe', { stdio: 'ignore' });
        // 延迟2秒，等待进程完全释放资源
        child_process.execSync('timeout /t 2 /nobreak', { stdio: 'ignore' });
    } catch (e) {
        console.log('[1/4] 未检测到运行中的 Antigravity 进程，跳过关闭。');
    }
}

function patchPreloadBuffer(originalBytes) {
    let content = originalBytes.toString('utf8');
    
    // 移除之前的汉化引擎块（防重复注入）
    const marker = '// Antigravity Client Chinese Localization Engine';
    const markerIdx = content.indexOf(marker);
    if (markerIdx !== -1) {
        console.log('  -> 检测到旧版汉化补丁，已自动将其剥离重置。');
        content = content.substring(0, markerIdx).trim();
    }
    
    // 注入新版汉化引擎
    const patchedContent = content + '\n\n' + LOCALIZATION_ENGINE_CODE;
    return Buffer.from(patchedContent, 'utf8');
}

function modifyAndRepackAsar(asarPath, destAsarPath) {
    console.log('[3/4] 正在读取原始 app.asar 并应用汉化补丁...');
    const fd = fs.openSync(asarPath, 'r');
    
    // 读取头部
    const headerBuf = Buffer.alloc(16);
    fs.readSync(fd, headerBuf, 0, 16, 0);
    
    const pickleSize = headerBuf.readUInt32LE(4);
    const jsonLength = headerBuf.readUInt32LE(12);
    
    const jsonBuf = Buffer.alloc(jsonLength);
    fs.readSync(fd, jsonBuf, 0, jsonLength, 16);
    
    const header = JSON.parse(jsonBuf.toString('utf8'));
    const dataOffset = 8 + pickleSize;
    
    const filesData = [];
    let currentOffset = 0n;
    
    function walk(node, relativePath) {
        const result = {};
        if (node.files) {
            result.files = {};
            for (const name in node.files) {
                const childPath = relativePath ? `${relativePath}/${name}` : name;
                result.files[name] = walk(node.files[name], childPath);
            }
        } else {
            // 处理单个文件
            if (node.unpacked) {
                result.size = node.size;
                result.unpacked = true;
            } else {
                let fileBytes;
                const fileOffset = dataOffset + parseInt(node.offset);
                
                // 读取原始文件数据
                const originalBytes = Buffer.alloc(node.size);
                fs.readSync(fd, originalBytes, 0, node.size, fileOffset);
                
                if (relativePath === 'dist/preload.js') {
                    fileBytes = patchPreloadBuffer(originalBytes);
                } else {
                    fileBytes = originalBytes;
                }
                
                result.size = fileBytes.length;
                result.offset = currentOffset.toString();
                filesData.push(fileBytes);
                currentOffset += BigInt(fileBytes.length);
            }
        }
        return result;
    }
    
    const newHeader = walk(header, '');
    fs.closeSync(fd);
    
    // 序列化新 JSON 头部并计算字节对齐与 Pickle 大小
    const newJsonBuf = Buffer.from(JSON.stringify(newHeader), 'utf8');
    const newJsonLen = newJsonBuf.length;
    
    const padding = (4 - (newJsonLen % 4)) % 4;
    const innerSize = newJsonLen + 4 + padding;
    const newPickleSize = innerSize + 4;

    const outHeaderBuf = Buffer.alloc(16);
    outHeaderBuf.writeUInt32LE(4, 0);
    outHeaderBuf.writeUInt32LE(newPickleSize, 4);
    outHeaderBuf.writeUInt32LE(innerSize, 8);
    outHeaderBuf.writeUInt32LE(newJsonLen, 12);
    
    // 写入重包后的临时文件
    const outFd = fs.openSync(destAsarPath, 'w');
    fs.writeSync(outFd, outHeaderBuf);
    fs.writeSync(outFd, newJsonBuf);
    if (padding > 0) {
        fs.writeSync(outFd, Buffer.alloc(padding));
    }
    for (const buf of filesData) {
        fs.writeSync(outFd, buf);
    }
    fs.closeSync(outFd);
    console.log('  -> 汉化文件重构及内存打包已完成。');
}

function restartAntigravity(installDir) {
    const exePath = path.join(installDir, 'Antigravity.exe');
    if (fs.existsSync(exePath)) {
        console.log('[4/4] 正在重新拉起 Antigravity 客户端...');
        child_process.spawn(exePath, [], {
            detached: true,
            stdio: 'ignore'
        }).unref();
        console.log('  -> 客户端启动指令已发送。');
    } else {
        console.log('[4/4] 未能在安装目录中找到 Antigravity.exe，请稍后手动启动。');
    }
}

async function main() {
    printBanner();
    
    let installDir = detectInstallationDir();
    if (installDir) {
        console.log(`已在系统默认路径中找到 Antigravity 安装目录：\n  -> ${installDir}\n`);
        const confirm = await askQuestion('是否确定对该安装目录应用汉化补丁？(Y/N, 默认Y): ');
        if (confirm.trim().toLowerCase() === 'n') {
            console.log('用户取消了汉化。程序将退出。');
            await askQuestion('\n按回车键退出...');
            process.exit(0);
        }
    } else {
        installDir = await promptForPath();
        console.log(`\n已成功绑定安装目录：\n  -> ${installDir}\n`);
    }

    const asarPath = path.join(installDir, 'resources', 'app.asar');
    const backupAsarPath = path.join(installDir, 'resources', 'app.asar.bak');
    const tempAsarPath = path.join(installDir, 'resources', 'app.asar.temp');

    try {
        // 1. 关闭客户端
        killAntigravity();

        // 2. 备份原文件
        console.log('[2/4] 正在检查并备份原始 app.asar 文件...');
        if (!fs.existsSync(backupAsarPath)) {
            fs.copyFileSync(asarPath, backupAsarPath);
            console.log('  -> 成功创建干净备份：app.asar.bak');
        } else {
            console.log('  -> 检测到已存在干净备份，跳过备份步骤以防止覆盖原始数据。');
        }

        // 3. 打包并汉化
        modifyAndRepackAsar(asarPath, tempAsarPath);

        // 4. 用临时文件覆盖原 app.asar
        fs.unlinkSync(asarPath);
        fs.renameSync(tempAsarPath, asarPath);
        console.log('  -> 已应用最新的 app.asar 本地化数据。');

        // 5. 重新启动
        restartAntigravity(installDir);

        console.log('\n==================================================');
        console.log('      汉化补丁已成功部署！祝您使用愉快！');
        console.log('==================================================');
    } catch (e) {
        console.error('\n【出错啦】部署过程中遇到错误:', e.message);
        if (fs.existsSync(tempAsarPath)) {
            try { fs.unlinkSync(tempAsarPath); } catch(_) {}
        }
        console.log('请尝试以管理员身份运行此工具，或联系开发人员反馈。');
    }

    await askQuestion('\n按回车键退出该程序...');
}

main().catch(err => {
    console.error('全局异常:', err);
});
