import * as webpack from 'webpack';

import { Logger } from '../utils/logger';

export function runWebpack(wpConfig: webpack.Configuration | webpack.Configuration[],
    watch: boolean,
    logger: Logger): Promise<any> {
    const firstConfig = Array.isArray(wpConfig) ? wpConfig[0] : wpConfig;
    const statsOptions = firstConfig.stats;
    const watchOptions = firstConfig.watchOptions;
    if (Array.isArray(wpConfig) &&
        wpConfig.length > 1 &&
        statsOptions &&
        typeof statsOptions === 'object' &&
        !(statsOptions as any).children) {
        (statsOptions as any).children = true; // wpConfig.map((o: webpack.Configuration) => o.stats) as any;
    }

    const webpackCompiler = webpack(wpConfig as any);

    return new Promise((resolve, reject) => {
        const callback: webpack.Compiler.Handler = (err: Error, stats: webpack.Stats) => {
            if (!watch || err) {
                // Do not keep cache anymore
                (webpackCompiler as any).purgeInputFileSystem();
            }

            if (err) {
                return reject(err);
            }

            if (watch) {
                return;
            }

            if (stats.hasErrors()) {
                logger.error(stats.toString('errors-only'));
                return reject();
            } else {
                if (statsOptions) {
                    const result = stats.toString(statsOptions);
                    if (result && result.trim()) {
                        logger.info(result);
                    }
                }
                resolve();
            }
        };

        if (watch) {
            webpackCompiler.watch(watchOptions as webpack.Options.WatchOptions, callback);
            logger.info('\nWebpack is watching the files…\n');
        } else {
            webpackCompiler.run(callback);
        }
    });
}
