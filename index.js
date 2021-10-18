const { readdir, stat } = require('fs/promises');
const { homedir, EOL } = require('os');
const { resolve, normalize, sep } = require('path');
const { stdout, argv, exit } = require('process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { vow } = require('batboy.mente');

const DEFAULT_FOLDERS = [
    'development/ActiveTheory',
    'development',
    'websites',
    'apps'
];

async function* generatePaths(search) {
    const paths = await DEFAULT_FOLDERS.reduce(async function reduce(acc, name) {
        acc = await acc;

        let p = resolve(homedir(), name);
        let files = await readdir(p);

        files.forEach(async function each(file) {
            let [_stat] = await vow(stat(resolve(homedir(), name, file)));
            if (file.includes(search) && _stat?.isDirectory()) {
                acc.push(resolve(homedir(), name, file));
            }
        })

        return acc;
    }, []);

    for (let p of paths) {
        yield p;
    }
}

async function* addNewLine(s) {
    for await (const line of s) {
        yield `${line}${EOL}`
    }
}

async function* toAlfred(s) {
    var amount = 0;

    for await (const line of s) {
        let chunk = '';

        if (!amount) {
            chunk = `{ "items": [`
        }

        chunk = `${chunk}{
            "uid": "${line}",
            "type": "file",
            "title": "${line.split(sep).pop()}",
            "arg": "${line}"
        },`;

        if (s._readableState.ended) {
            chunk = `${chunk}]}${EOL}`
        }

        amount++;
        yield chunk;
    }
}

async function main() {
    let stream = Readable.from(generatePaths(argv[2]));
    let [success, error] = await vow(pipeline(stream, toAlfred, stdout));

    if (error) {
        console.error('ERROR', error);
        exit(1);
    } else {
        exit(0);
    }
}

main();
