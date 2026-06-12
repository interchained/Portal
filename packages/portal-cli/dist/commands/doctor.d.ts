/**
 * portal doctor [--fix]
 *
 * Checks the project for health issues. With --fix, auto-repairs what it can:
 *   - Route file/directory conflicts (foo.page.tsx + foo/ → foo/index.page.tsx)
 *   - Missing routes/ directory
 *   - Unreplaced contract tokens
 */
export declare function doctorCommand(opts?: {
    fix?: boolean;
}): Promise<void>;
//# sourceMappingURL=doctor.d.ts.map