/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');
const distDir = './dist';

function deleteRecursively(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    if (!fs.lstatSync(filePath).isDirectory()) {
        fs.unlinkSync(filePath);
    } else {
        const files = fs.readdirSync(filePath);

        for (const file of files) {
            const fullPath = path.join(filePath, file);
            deleteRecursively(fullPath);
        }

        fs.rmdirSync(filePath);
    }
}

deleteRecursively(distDir);