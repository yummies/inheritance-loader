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
            const rawRequireValue = node.arguments[0].value;
            const yummifyChain = new YummifyChain(this.resourcePath);
            const result = yummifyChain.get(rawRequireValue);

            const chainString = result.chain.map(item => {
                return `{ type: '${item.type}', module: require('${item.path}') }`;
            }).toString();

            node.update(`require('${yummiesChainPath}').${result.method}([${chainString}])`);
        }
    });

    return output.toString();
}
