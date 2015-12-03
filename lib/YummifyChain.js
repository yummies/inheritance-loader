import fs from 'fs';
import path from 'path';
import loaderUtils from 'loader-utils';

const cache = {};

export default class {
    constructor(sourcePath, config) {
        this.config = config;
        this.sourcePath = path.resolve(sourcePath);
        this.sourceLayerIndex = this.getSourceLayerIndex();
        this.remainingLayers = this.config.layers.slice(0, this.sourceLayerIndex + 1);
    }

    getSourceLayerIndex() {
        for (let i = 0; i < this.config.layers.length; i++) {
            if (this.sourcePath.indexOf(this.config.layers[i].path) === 0) {
                return i;
            }
        }

        return this.config.layers.length - 1;
    }

    parseRequiredString(requiredString) {
        const [ rawComponent, rawOpts ] = requiredString.split('?');
        const component = rawComponent.substr(1);
        const opts = {};
        let mods = {};

        if (rawOpts) {
            const parsedOpts = loaderUtils.parseQuery('?' + rawOpts);

            Object.keys(parsedOpts).forEach(optName => {
                const optVal = parsedOpts[optName];

                // mods
                if (optName.charAt(0) === '_') {
                    mods = {
                        ...mods,
                        [optName]: optVal
                    };
                // rest
                } else {
                    opts[optName] = optVal;
                }
            });
        }

        return {
            component,
            mods,
            opts
        };
    }

    collectPossiblePaths(required) {
        const out = [];
        const layers = required.opts.raw ? this.remainingLayers : this.config.layers;

        layers.forEach(layerConfig => {
            const pathToCheck = path.join(layerConfig.path, required.component);

            // self-require guard
            if (pathToCheck === this.sourcePath) {
                return;
            }

            // main
            if (required.opts.main !== false && 'main' in layerConfig) {
                out.push({
                    type: 'main',
                    path: path.join(pathToCheck, layerConfig.main)
                });
            }

            // styles
            if (required.opts.styles !== false && 'styles' in layerConfig) {
                out.push({
                    type: 'styles',
                    path: path.join(pathToCheck, layerConfig.styles)
                });
            }

            // propTypes
            if (required.opts.propTypes !== false && 'propTypes' in layerConfig) {
                out.push({
                    type: 'propTypes',
                    path: path.join(pathToCheck, layerConfig.propTypes)
                });
            }
        });

        return out;
    }

    filterChain(pathsObj) {
        return pathsObj.filter(pathObj => fs.existsSync(pathObj.path));
    }

    get(requiredString) {
        const uniqueKey = this.sourceLayerIndex + requiredString;

        // get it from cache if possible
        if (uniqueKey in cache) {
            return cache[uniqueKey];
        }

        const parsedRequire = this.parseRequiredString(requiredString);
        const possibleChain = [];

        // collect paths to check
        possibleChain.push(...this.collectPossiblePaths(parsedRequire));

        // also collect main component paths if modifier was required
        if (parsedRequire.mods) {
            Object.keys(parsedRequire.mods).forEach(modName => {
                const modVal = parsedRequire.mods[modName];
                let component = null;

                // shorhand mod
                if (modVal === true) {
                    component = path.join(parsedRequire.component, modName);
                } else {
                    component = path.join(parsedRequire.component, modName, modVal);
                }

                possibleChain.push(...this.collectPossiblePaths({
                    ...parsedRequire,
                    component
                }));
            });
        }

        const filteredChain = this.filterChain(possibleChain);
        const yummifyMethod = parsedRequire.opts.raw ? 'yummifyChainRaw' : 'yummifyChain';
        const out = {
            method: yummifyMethod,
            chain: filteredChain
        };

        // cache it
        cache[uniqueKey] = out;

        return out;
    }
}
