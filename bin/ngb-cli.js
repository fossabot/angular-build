'use strict';

process.title = 'angular-build';

const startTime = Date.now();

const fs = require('fs');
const path = require('path');
const supportsColor = require('supports-color');
const SemVer = require('semver').SemVer;

const forceExit = process.argv.indexOf('--force-exit') > -1;

function _colorize(str, key) {
    if (!supportsColor) {
        return str;
    }

    const buf = [];
    buf.push(key);
    buf.push(str);
    buf.push('\u001b[37m');
    buf.push('\u001b[39m\u001b[22m');
    return buf.join('');
}

function _yellow(str) {
    return _colorize(str, '\u001b[1m\u001b[33m');
}

function _exit(code) {
    if (process.platform === 'win32' && process.stdout.bufferSize) {
        process.stdout.once('drain', function () {
            process.exit(code);
        });
        return;
    }
    process.exit(code);
}

function _invokeCli(cli, cliOptions) {
    if ('default' in cli) {
        cli = cli.default;
    }

    cli(cliOptions)
        .then((exitCode) => {
            process.exitCode = typeof exitCode === 'number' ? exitCode : 0;
            if (forceExit) {
                _exit(process.exitCode);
            }
        })
        .catch(err => {
            process.exitCode = -1;
            console.error(`${err.stack || err.message}`);
            _exit(process.exitCode);
        });
}

function _cliGlobal() {
    let cliRootPath = path.resolve(__dirname, '..');
    if (!fs.existsSync(path.resolve(cliRootPath, 'node_modules'))) {
        cliRootPath = path.dirname(cliRootPath);
    }
    const packageJson = require(path.resolve(cliRootPath, './package.json'));
    let cliVersion = packageJson['version'];

    const updateNotifier = require('update-notifier');
    updateNotifier({
        pkg: packageJson
    }).notify({ defer: false });

    let cli;
    if (fs.existsSync(path.resolve(__dirname, '../cli/index.js'))) {
        cli = require('../cli');
    } else {
        cli = require('../dist/cli');
    }

    const cliOptions = {
        args: process.argv.slice(2),
        cliVersion: cliVersion,
        cliIsGlobal: true,
        cliRootPath: cliRootPath,
        startTime: startTime
    };

    _invokeCli(cli, cliOptions);

}

function _cliLocal(projectRoot) {
    const resolve = require('resolve');

    resolve('@bizappframework/angular-build', {
        basedir: projectRoot
    }, (error, projectLocalCli) => {
        if (error) {
            _cliGlobal();
            return;
        }

        let cliIsLink = false;
        const projectLocalCliRealPath = fs.realpathSync(projectLocalCli);
        if (projectLocalCliRealPath !== projectLocalCli) {
            cliIsLink = true;
        }

        // projectLocalCli -> node_modules\@bizappframework\angular-build\index.js for locally installed
        // projectLocalCli -> node_modules\@bizappframework\angular-build\dist\index.js for link
        let cliPath = path.dirname(projectLocalCli);
        let packageJsonPath = path.resolve(cliPath, './package.json');
        if ((!fs.existsSync(packageJsonPath) || !fs.existsSync(path.resolve(cliPath, 'node_modules'))) &&
            fs.existsSync(path.resolve(cliPath, '..', './package.json'))) {
            packageJsonPath = path.resolve(cliPath, '..', './package.json');
        }

        const packageJson = require(packageJsonPath);
        let cliVersion = packageJson['version'];

        let localCliPath = path.resolve(cliPath, './cli');
        const cli = require(localCliPath);

        const cliOptions = {
            args: process.argv.slice(2),
            cliVersion: cliVersion,
            cliIsGlobal: false,
            cliIsLink: cliIsLink,
            cliRootPath: path.dirname(packageJsonPath),
            startTime: startTime
        };

        _invokeCli(cli, cliOptions);
    });
}

// main
const _version = new SemVer(process.version);
if (_version.compare(new SemVer('8.9.0')) < 0) {
    console.warn(_yellow(`You are running version ${_version.version} of Node, which will not be supported by the angular-build cli.\n` +
        'The official Node version that will be supported is 8.9.0 and greater.'));
}

let _projectRoot = process.cwd();
const _args = process.argv.slice(2);
let forceUseLocalCli = false;
if (_args.length >= 2 && _args[0] === 'build') {
    const argv = require('yargs')
        .option('config', {
            alias: 'c',
            type: 'string'
        })
        .option('forceUseLocalCli', {
            type: 'boolean',
            boolean: true
        })
        .argv;

    if (argv.config) {
        let configPath = argv.config;
        configPath = path.isAbsolute(configPath) ? path.resolve(configPath) : path.resolve(_projectRoot, configPath);
        _projectRoot = path.dirname(configPath);
    }

    forceUseLocalCli = argv.forceUseLocalCli;
}

const _localCliPath = path.resolve(forceUseLocalCli ? _projectRoot : process.cwd(), 'node_modules/@bizappframework/angular-build');
const _localCliPathExists = fs.existsSync(_localCliPath);
_localCliPathExists ? _cliLocal(_projectRoot) : _cliGlobal();
