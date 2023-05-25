class EthereumManager {
    constructor() {}

    get() {
        return window.ethereum;
    }

    has() {
        return !!window.ethereum;
    }

    // observer(callBack: Function) {
    //     Object.defineProperty(window, 'ethereum', {
    //         set(v: any) {
    //             Object.defineProperty(window, 'ethereum', {
    //                 writable: true,
    //                 configurable: true,
    //                 enumerable: true,
    //                 value: v,
    //             });
    //             callBack(v);
    //             return v;
    //         },
    //     });
    // }
}

export default EthereumManager;
