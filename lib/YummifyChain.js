import fs from 'fs';
import path from 'path';
import loaderUtils from 'loader-utils';

const cache = {};

export default class {
    constructor(sourcePath, layers) {
        this.layers = layers;
        this.sourcePath = path.resolve(sourcePath);
    }

    parseRequiredString(requiredString) {
        const [ rawComponent, rawOpts ] = requiredString.split('?');
        const component = rawComponent.substr(1);
        const parsedRequire = {
            component
        };

        if (rawOpts) {
            const parsedOpts = loaderUtils.parseQuery('?' + rawOpts);

            return Object.keys(parsedOpts).reduce((obj, prop) => {
                if (prop.charAt(0) === '_') {
                    obj.mods = {
                        ...obj.mods,
                        [prop]: parsedOpts[prop]
                    };
                } else {
                    obj.opts = {
                        ...obj.opts,
                        [prop]: parsedOpts[prop]
                    };
                }

                return obj;
            }, parsedRequire);
        }

        return parsedRequire;
    }

    collectPossiblePaths(required) {
        const out = [];

        this.layers.forEach(layerConfig => {
            const pathToCheck = path.join(layerConfig.components, required.component);

            // self-require guard
            if (pathToCheck === this.sourcePath) {
                return;
            }

            // main
            if ('main' in layerConfig) {
                out.push({
                    type: 'main',
                    path: path.join(pathToCheck, layerConfig.main)
                });
            }

            // styles
            if ('styles' in layerConfig) {
                out.push({
                    type: 'styles',
                    path: path.join(pathToCheck, layerConfig.styles)
                });
            }
        });

        return out;
    }

    filterChain(pathsObj) {
        return pathsObj.filter(pathObj => fs.existsSync(pathObj.path));
    }

    generateUniqueKey(parsedRequire) {
        let out = parsedRequire.component;

        if ('mods' in parsedRequire) {
            const mods = parsedRequire.mods;

            out += '?';
            out += Object.keys(mods).map(mod => `${mod}=${mods[mod]}`).join('&');
        }

        return out;
    }

    get(requiredString) {
        const parsedRequire = this.parseRequiredString(requiredString);
        const uniqueKey = this.generateUniqueKey(parsedRequire);

        // get it from cache if possible
        if (requiredString in cache) {
            return cache[requiredString];
        }

        const possibleChain = this.collectPossiblePaths(parsedRequire);

        // collect paths to check
        possibleChain.push(...this.collectPossiblePaths(parsedRequire));

        // also collect main component paths if modifier was required
        if ('mods' in parsedRequire) {
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
        let yummifyMethod = 'yummifyChain';

        if (parsedRequire.component.charAt(0) === '@') {
            yummifyMethod = 'yummifyChainRaw';
        } else if ('opts' in parsedRequire && parsedRequire.opts.class) {
            yummifyMethod = 'yummifyChainClass';
        }

        const out = {
            method: yummifyMethod,
            chain: filteredChain,
            key: uniqueKey
        };

        // cache it
        cache[requiredString] = out;

        return out;
    }
}
