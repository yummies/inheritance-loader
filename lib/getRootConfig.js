import fs from 'fs';
import path from 'path';
import pathExists from 'path-exists';
import yaml from 'js-yaml';

export default function() {
    const configPath = path.join(process.cwd(), '.yummies.yml');

    if (pathExists.sync(configPath)) {
        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.safeLoad(configRaw);

        return config;
    }

    return {};
}
