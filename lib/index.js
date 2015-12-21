import path from 'path';
import falafel from 'falafel';
import loaderUtils from 'loader-utils';

import getConfig from './getConfig';
import YummifyChain from './YummifyChain';

const yummiesChainPath = '@yummies/yummies/build/chain';

export default function(source) {
    if (this.cacheable) {
        this.cacheable();
    }

    const query = loaderUtils.parseQuery(this.query);
    const layers = getConfig(query);
    const pathsToInclude = layers.map(layer => layer.path).concat(query.include || []);
    const isFileInheritable = pathsToInclude.some(layerPath => {
        return this.resourcePath.indexOf(layerPath) === 0 &&
               this.resourcePath.indexOf(path.resolve(layerPath, 'node_modules/')) !== 0;
    });

    if (!isFileInheritable) {
        return source;
    }

    const output = falafel(source, node => {
        if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'require' &&
            node.arguments[0].value.charAt(0) === '#'
        ) {
            const rawRequireValue = node.arguments[0].value;
            const yummifyChain = new YummifyChain(this.resourcePath, layers);
            const result = yummifyChain.get(rawRequireValue);

            const chainString = result.chain.map(item => {
                return `{ type: '${item.type}', module: require('${item.path}') }`;
            }).toString();

            node.update(`require('${yummiesChainPath}').${result.method}([${chainString}], '${result.key}')`);
        }
    });

    return output.toString();
}
