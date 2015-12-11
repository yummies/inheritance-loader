import falafel from 'falafel';

import YummifyChain from './YummifyChain';

const yummiesChainPath = '@yummies/yummies/build/chain';

export default function(source) {
    if (this.cacheable) {
        this.cacheable();
    }

    const output = falafel(source, node => {
        if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'require' &&
            node.arguments[0].value.charAt(0) === '#'
        ) {
            let rawRequireValue = node.arguments[0].value;
            const yummifyChain = new YummifyChain(this.resourcePath);
            const result = yummifyChain.get(rawRequireValue);

            const chainString = result.chain.map(item => {
                return `{ type: '${item.type}', module: require('${item.path}') }`;
            }).toString();

            // TODO temp
            if (rawRequireValue.indexOf('?') !== -1) {
                rawRequireValue = rawRequireValue.substr(0, rawRequireValue.indexOf('?'));
            }

            node.update(`require('${yummiesChainPath}').${result.method}([${chainString}], '${rawRequireValue}')`);
        }
    });

    return output.toString();
}
