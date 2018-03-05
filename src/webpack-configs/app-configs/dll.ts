import * as path from 'path';
import * as webpack from 'webpack';

import { WriteAssetsToDiskWebpackPlugin } from '../../plugins/write-assets-to-disk-webpack-plugin';
import { WriteStatsJsonWebpackPlugin } from '../../plugins/write-stats-json-webpack-plugin';

import {
    AngularBuildContext,
    AppProjectConfigInternal,
    InternalError,
    InvalidConfigError,
    PreDefinedEnvironment
} from '../../models';
import { getCustomWebpackConfig } from '../../helpers/get-custom-webpack-config';
import { outputHashFormat } from '../../helpers/output-hash-format';

import { getAngularFixPlugins } from './angular';
import { getAppCommonWebpackConfigPartial } from './common';
import { getAppStylesWebpackConfigPartial } from './styles';

const webpackMerge = require('webpack-merge');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 * require('ts-loader')
 */

export function getAppDllWebpackConfig(angularBuildContext: AngularBuildContext, env?: PreDefinedEnvironment): webpack.Configuration {
    const environment = env ? env as PreDefinedEnvironment : AngularBuildContext.environment;
    const projectRoot = AngularBuildContext.projectRoot;
    const appConfig = angularBuildContext.projectConfig as AppProjectConfigInternal;
    let customWebpackConfig: webpack.Configuration = {};

    if (!environment.dll || angularBuildContext.projectConfig._projectType !== 'app') {
        return {};
    }

    if (appConfig.webpackConfig) {
        customWebpackConfig =
            getCustomWebpackConfig(path.resolve(projectRoot, appConfig.webpackConfig), angularBuildContext, env) || {};
    }

    const configs: webpack.Configuration[] = [
        getAppCommonWebpackConfigPartial(angularBuildContext, env),
        getAppStylesWebpackConfigPartial(angularBuildContext, env),
        getAppDllWebpackConfigPartial(angularBuildContext, env),
        customWebpackConfig
    ];

    const mergedConfig = webpackMerge(configs) as webpack.Configuration;
    if (!mergedConfig.entry || (typeof mergedConfig.entry === 'object' && !Object.keys(mergedConfig.entry).length)) {
        mergedConfig.entry = (() => ({})) as any;
    }

    return mergedConfig;
}

function getAppDllWebpackConfigPartial(angularBuildContext: AngularBuildContext, env?: PreDefinedEnvironment):
    webpack.Configuration {
    const environment = env ? env as PreDefinedEnvironment : AngularBuildContext.environment;
    const appConfig = angularBuildContext.projectConfig as AppProjectConfigInternal;

    if (!environment.dll) {
        return {};
    }

    if (!appConfig.outDir) {
        throw new InvalidConfigError(
            `The 'apps[${angularBuildContext.projectConfig._index
            }].outDir' value is required.`);
    }

    const projectRoot = AngularBuildContext.projectRoot;

    const outDir = path.resolve(projectRoot, appConfig.outDir);

    const libHashFormat = (!appConfig.platformTarget || appConfig.platformTarget === 'web') &&
        appConfig.bundlesHash
        ? outputHashFormat.bundle
        : '';

    const libraryName = `[name]_${libHashFormat || 'lib'}`;
    const vendorChunkName = appConfig.vendorChunkName || 'vendor';

    const entryPoints: { [key: string]: string[] } = {};
    const tsEntries: any[] = [];
    const entries: string[] = [];

    // dll
    if (appConfig.dlls) {
        if (!appConfig._dllParsedResult) {
            throw new InternalError("The 'appConfig._dllParsedResult' is not set");
        }
        const dllResult = appConfig._dllParsedResult;
        dllResult.tsEntries.forEach(tsEntry => {
            if (!tsEntries.includes(tsEntry)) {
                tsEntries.push(tsEntry);
            }
            if (!entries.includes(tsEntry)) {
                entries.push(tsEntry);
            }
        });
        dllResult.scriptEntries.forEach(scriptEntry => {
            if (!entries.includes(scriptEntry)) {
                entries.push(scriptEntry);
            }
        });
        dllResult.styleEntries.forEach(styleEntry => {
            if (!entries.includes(styleEntry)) {
                entries.push(styleEntry);
            }
        });
    }

    if (!entries.length) {
        throw new InvalidConfigError(
            `No entry available in 'apps[${angularBuildContext.projectConfig._index
            }].dll'.`);
    }

    entryPoints[vendorChunkName] = entries;

    const rules: webpack.Rule[] = [];

    // plugins
    const plugins: webpack.Plugin[] = [
        new webpack.DllPlugin({
            context: projectRoot,
            path: path.resolve(outDir, `${vendorChunkName}-manifest.json`),
            name: libraryName
        }),
        new WriteStatsJsonWebpackPlugin({
            outputPath: outDir,
            path: path.resolve(outDir, `${vendorChunkName}-assets.json`),
            forceWriteToDisk: true,
            loggerOptions: {
                logLevel: AngularBuildContext.angularBuildConfig.logLevel
            }
        }),
        new WriteAssetsToDiskWebpackPlugin({
            outputPath: outDir,
            emittedPaths: [path.resolve(outDir, `${vendorChunkName}-manifest.json`)],
            exclude: [`${vendorChunkName}-assets.json`],
            loggerOptions: {
                logLevel: AngularBuildContext.angularBuildConfig.logLevel
            }
        })
    ];

    if (tsEntries.length > 0) {
        const tsConfigPath = appConfig._tsConfigPath;
        const tsLoaderOptions: { [key: string]: any } = {
            instance: `at-${appConfig.name || 'apps[' + appConfig._index + ']'}-loader`,
            transpileOnly: appConfig.tsconfig ? false : true,
            onlyCompileBundledFiles: appConfig.tsconfig ? false : true,
            silent: AngularBuildContext.angularBuildConfig.logLevel !== 'debug'
        };

        if (appConfig.tsconfig && tsConfigPath) {
            tsLoaderOptions.configFile = tsConfigPath;
        }
        if (AngularBuildContext.angularBuildConfig.logLevel) {
            tsLoaderOptions.logLevel = AngularBuildContext.angularBuildConfig.logLevel;
        }

        rules.push({
            test: /\.ts$/,
            use: [
                {
                    loader: 'ts-loader',
                    options: tsLoaderOptions
                }
            ],
            include: tsEntries
        });
    }

    // es6-promise
    // workaround for https://github.com/stefanpenner/es6-promise/issues/100
    plugins.push(new webpack.IgnorePlugin(/^vertx$/));

    // workaround for https://github.com/andris9/encoding/issues/16
    // commonPlugins.push(new webpack.NormalModuleReplacementPlugin(/\/iconv-loader$/, require.resolve('node-noop'))));

    // angular fix plugins
    plugins.push(...getAngularFixPlugins(angularBuildContext));

    // webpack config
    const webpackDllConfig: webpack.Configuration = {
        entry: entryPoints,
        resolve: {
            extensions: tsEntries.length > 0 ? ['.ts', '.js'] : ['.js'],
        },
        output: {
            publicPath: appConfig.publicPath || '/',
            library: libraryName
        },
        module: {
            rules: rules
        },
        plugins: plugins
    };

    return webpackDllConfig;
}