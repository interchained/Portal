/**
 * Terminal output helpers — consistent Portal CLI style.
 */
export declare const icon: {
    pass: string;
    warn: string;
    fail: string;
    info: string;
    arrow: string;
    dot: string;
    spark: string;
};
export declare function header(text: string): void;
export declare function success(text: string): void;
export declare function warn(text: string): void;
export declare function fail(text: string): void;
export declare function info(text: string): void;
export declare function step(text: string): void;
export declare function blank(): void;
export declare function banner(): void;
export declare function summaryLine(pass: number, warn: number, fail: number): void;
//# sourceMappingURL=print.d.ts.map