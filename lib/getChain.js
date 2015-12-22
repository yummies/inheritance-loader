import path from 'path';
import pathExists from 'path-exists';
import loaderUtils from 'loader-utils';

const cache = {};

function parseRequiredString(requiredString) {
    const matched = requiredString.match(/^#(.+?)(\?.+)?$/);
    const component = matched[1];
    const query = loaderUtils.parseQuery(matched[2]);
    const required = {
        component,
        mods: {},
        opts: {}
    };

    return Object.keys(query)
        .reduce((obj, prop) => {
            if (prop.charAt(0) === '_') {
                obj.mods = {
                    ...obj.mods,
                    [prop]: query[prop]
                };
            } else {
                obj.opts = {
                    ...obj.opts,
                    [prop]: query[prop]
                };
            }

            return obj;
        }, required);
}

function generateUniqueKey(required) {
    return Object.keys(required.mods).reduce((str, mod) => {
        return `${str}/${mod}/${required.mods[mod]}`;
    }, required.component);
}

function collectPossiblePaths(requiredPath, layers) {
    return layers.reduce((arr, layer) => {
        const pathToCheck = path.join(layer.components, requiredPath);

        if ('main' in layer) {
            arr.push({
                type: 'main',
                path: path.join(pathToCheck, layer.main)
            });
        }

        if ('styles' in layer) {
            arr.push({
                type: 'styles',
                path: path.join(pathToCheck, layer.styles)
            });
        }

        return arr;
    }, []);
}

function filterPaths(paths) {
    const out = [];

    const promise = paths.reduce((sequence, item) => {
        return sequence.then(() => {
            return pathExists(item.path);
        }).then(exists => {
            if (exists) {
                out.push(item);
            }
        });
    }, Promise.resolve());

    return promise.then(() => out);
}

export default function(requiredString, layers) {
    const required = parseRequiredString(requiredString);
    const uniqueKey = generateUniqueKey(required);

    if (requiredString in cache) {
        return Promise.resolve(cache[requiredString]);
    }

    const possiblePaths = [
        // collect possible component paths
        ...collectPossiblePaths(required.component, layers),
        // collect possible mods paths
        ...Object.keys(required.mods).reduce((arr, modName) => {
            const modVal = required.mods[modName];
            let requiredPath = '';

            // shorhand mod
            if (modVal === true) {
                requiredPath = path.join(required.component, modName);
            } else {
                requiredPath = path.join(required.component, modName, modVal);
            }

            return arr.concat(collectPossiblePaths(requiredPath, layers));
        }, [])
    ];

    return filterPaths(possiblePaths).then(paths => {
        let yummifyMethod = 'yummifyChain';

        if (required.component.charAt(0) === '@') {
            yummifyMethod = 'yummifyChainRaw';
        } else if (required.opts.class) {
            yummifyMethod = 'yummifyChainClass';
        }

        cache[requiredString] = {
            method: yummifyMethod,
            chain: paths,
            key: uniqueKey
        };

        return cache[requiredString];
    });
}
