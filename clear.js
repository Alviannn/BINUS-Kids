/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

/**
 * @param {fs.PathLike} dirPath 
 */
function deleteDistributions(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    if (!fs.lstatSync(dirPath).isDirectory())
        return;

    for (const file of fs.readdirSync(dirPath)) {
        const fullPath = path.join(dirPath, file);

        if (fs.lstatSync(fullPath).isDirectory())
            deleteDistributions(fullPath);
        else
            fs.unlinkSync(fullPath);
    }

    fs.rmdirSync(dirPath);
}

deleteDistributions('./dist');