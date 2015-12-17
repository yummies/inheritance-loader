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
        const layerComponentsPath = path.resolve(absolutedLayerPath, layerConfig.dir);

        const out = {
            path: layerComponentsPath
        };

        if ('main' in layerConfig.files) {
            out.main = layerConfig.files.main;
        }

        if ('styles' in layerConfig.files) {
            out.styles = layerConfig.files.styles;
        }

        return out;
    });

    return config;
}
