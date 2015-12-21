import fs from 'fs';
import path from 'path';
import pathExists from 'path-exists';
import yaml from 'js-yaml';

const cache = {};

function readConfig(configDir) {
    if (configDir in cache) {
        return cache[configDir];
    }

    const configPath = path.resolve(configDir, '.yummies.yml');

    if (pathExists.sync(configPath)) {
        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.safeLoad(configRaw);

        cache[configDir] = config;

        return config;
    }

    return {};
}

export default function(options) {
    return options.layers.map(layer => {
        const layerMode = layer.mode || 'default';
        const layerConfig = readConfig(layer.path)[layerMode];
        const layerComponentsPath = path.resolve(layer.path, layerConfig.path);

        const config = {
            path: layer.path,
            components: layerComponentsPath
        };

        if ('main' in layerConfig.files) {
            config.main = layerConfig.files.main;
        }

        if ('styles' in layerConfig.files) {
            config.styles = layerConfig.files.styles;
        }

        return config;
    });
}
