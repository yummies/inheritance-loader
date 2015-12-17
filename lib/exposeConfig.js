import fs from 'fs';
import path from 'path';
import lodashMerge from 'lodash.merge';
import yaml from 'js-yaml';

export default function(rootConfig, query) {
    const config = lodashMerge({}, rootConfig, query, (a, b) => {
        if (Array.isArray(a)) {
            return a.concat(b);
        }
    });

    config.layers = config.layers.map(layerPath => {
        const absolutedLayerPath = path.resolve(layerPath);
        const layerConfigPath = path.join(absolutedLayerPath, '.yummies.yml');
        const layerConfigRaw = fs.readFileSync(layerConfigPath, 'utf-8');
        const layerConfig = yaml.safeLoad(layerConfigRaw);

        return {
            path: absolutedLayerPath,
            main: layerConfig.files.main,
            styles: layerConfig.files.styles
        };
    });

    return config;
}
