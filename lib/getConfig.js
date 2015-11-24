import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export default function() {
    const rootConfigPath = path.join(process.cwd(), '.yummies.yml');
    const rootConfigRaw = fs.readFileSync(rootConfigPath, 'utf-8');
    const rootConfig = yaml.safeLoad(rootConfigRaw);

    return rootConfig.layers.map(layerPath => {
        const absolutedLayerPath = path.resolve(layerPath);
        const layerConfigPath = path.join(absolutedLayerPath, '.yummies.yml');
        const layerConfigRaw = fs.readFileSync(layerConfigPath, 'utf-8');
        const layerConfig = yaml.safeLoad(layerConfigRaw);

        return {
            path: absolutedLayerPath,
            main: layerConfig.files.main,
            styles: layerConfig.files.styles,
            propTypes: layerConfig.files.propTypes
        };
    });
}
