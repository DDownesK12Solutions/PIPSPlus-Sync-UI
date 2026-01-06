// Removed date-fns import as it is not available and we are using simple ISO fallback

export class ExpressionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionError';
    }
}

class ExpressionContext {
    private record: Record<string, any>;

    constructor(record: Record<string, any>) {
        this.record = record;
    }

    get(path: string): any {
        // Remove brackets if present [field] -> field
        const cleanPath = path.replace(/^\[|\]$/g, '');
        const parts = cleanPath.split('.');
        let value: any = this.record;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return null;
            }
        }
        return value;
    }
}

export class ExpressionEvaluator {
    private functions: Record<string, (...args: any[]) => any>;

    constructor() {
        this.functions = {
            'IIF': this._fn_iif,
            'IsNullOrEmpty': this._fn_isnullorempty,
            'Not': this._fn_not,
            'Coalesce': this._fn_coalesce,
            'ToLower': (val: any) => this._to_str(val).toLowerCase(),
            'ToUpper': (val: any) => this._to_str(val).toUpperCase(),
            'StripSpaces': (val: any) => this._to_str(val).replace(/\s/g, ''),
            'Trim': (val: any) => this._to_str(val).trim(),
            'Split': (val: any, sep: string = ' ') => this._to_str(val).split(this._to_str(sep)),
            'Item': this._fn_item,
            'Len': (val: any) => this._to_str(val).length,
            'Left': (val: any, count: any) => this._to_str(val).substring(0, parseInt(count)),
            'Right': (val: any, count: any) => {
                const s = this._to_str(val);
                const c = parseInt(count);
                return c ? s.slice(-c) : '';
            },
            'Mid': (val: any, start: any, count?: any) => this._fn_mid(this._to_str(val), parseInt(start), count),
            'SubString': (val: any, start: any, count?: any) => this._fn_mid(this._to_str(val), parseInt(start), count),
            'Append': (...args: any[]) => args.map(arg => this._to_str(arg)).join(''),
            'Concat': (...args: any[]) => args.map(arg => this._to_str(arg)).join(''),
            'Replace': (val: any, oldVal: any, newVal: any = '') => this._to_str(val).replaceAll(this._to_str(oldVal), this._to_str(newVal)),
            'RegexReplace': (val: any, pattern: any, repl: any = '') => this._to_str(val).replace(new RegExp(this._to_str(pattern), 'g'), this._to_str(repl)),
            'RegexMatch': (val: any, pattern: any) => new RegExp(this._to_str(pattern)).test(this._to_str(val)),
            'Join': (arr: any, delim: any = ',') => this._fn_join(arr, delim),
            'PadLeft': (val: any, width: any, char: any = ' ') => this._to_str(val).padStart(parseInt(width), (this._to_str(char) || ' ')[0]),
            'PadRight': (val: any, width: any, char: any = ' ') => this._to_str(val).padEnd(parseInt(width), (this._to_str(char) || ' ')[0]),
            'CaseWhen': this._fn_case_when,
            // 'FormatDate': (val: any, fmt: any) => using date-fns or simple fallback? Simplified ISO for now or custom logic if needed.
            // Using a simple ISO format fallback for basic testing if date-fns format tokens differ significantly from Python's strftime.
            // But user might expect Python syntax. Let's try to support basic ISO.
            'FormatDate': (val: any, fmt: any) => this._format_date(val, fmt),
            'Now': () => new Date().toISOString(),
            'RemoveDiacritics': (val: any) => this._to_str(val).normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            'KeepAlphaNumeric': (val: any) => this._to_str(val).replace(/[^0-9a-z]/gi, ''),
            'Equals': (left: any, right: any) => left == right,
            'NotEquals': (left: any, right: any) => left != right,
            'Or': (...args: any[]) => args.some(arg => Boolean(arg)),
            'And': (...args: any[]) => args.every(arg => Boolean(arg)),
        };
    }

    public evaluate(expression: string, record: Record<string, any>): any {
        try {
            return this._eval(expression.trim(), new ExpressionContext(record));
        } catch (e: any) {
            throw new ExpressionError(e.message);
        }
    }

    private _eval(expr: string, ctx: ExpressionContext): any {
        if (!expr) return '';

        // Field reference [field]
        if (expr.startsWith('[') && expr.endsWith(']')) {
            return ctx.get(expr);
        }

        // String literal "value"
        if (expr.startsWith('"') && expr.endsWith('"')) {
            return expr.slice(1, -1);
        }

        // Number literal
        if (!isNaN(Number(expr)) && !isNaN(parseFloat(expr))) {
            return Number(expr);
        }

        // Boolean literal
        if (expr.toLowerCase() === 'true') return true;
        if (expr.toLowerCase() === 'false') return false;

        // Function call FuncName(...)
        if (expr.includes('(') && expr.endsWith(')')) {
            const firstParen = expr.indexOf('(');
            const name = expr.substring(0, firstParen).trim();
            const argsStr = expr.substring(firstParen + 1, expr.length - 1);
            const args = this._split_args(argsStr);

            const fn = this.functions[name];
            if (!fn) {
                throw new ExpressionError(`Unknown function: ${name}`);
            }

            const evalArgs = args.map(arg => this._eval(arg, ctx));
            return fn.apply(this, evalArgs);
        }

        return expr;
    }

    private _split_args(argsStr: string): string[] {
        const args: string[] = [];
        let depth = 0;
        let current: string[] = [];
        let quoted = false;

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];

            if (char === '"' && (i === 0 || argsStr[i - 1] !== '\\')) {
                quoted = !quoted;
            }

            if (char === ',' && depth === 0 && !quoted) {
                args.push(current.join('').trim());
                current = [];
                continue;
            }

            if (char === '(' && !quoted) depth++;
            else if (char === ')' && !quoted) depth--;

            current.push(char);
        }

        if (current.length > 0) {
            args.push(current.join('').trim());
        }

        return args.filter(a => a.length > 0);
    }

    private _to_str(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    private _fn_iif(condition: any, trueValue: any, falseValue: any): any {
        return Boolean(condition) ? trueValue : falseValue;
    }

    private _fn_isnullorempty(value: any): boolean {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        return false;
    }

    private _fn_not(value: any): boolean {
        return !Boolean(value);
    }

    private _fn_coalesce(...values: any[]): any {
        for (const val of values) {
            if (val !== null && val !== undefined && val !== '') return val;
        }
        return null;
    }

    private _fn_item(arr: any, idx: any): any {
        if (!Array.isArray(arr)) return null;
        const index = parseInt(idx);
        if (isNaN(index) || index < 0 || index >= arr.length) return null;
        return arr[index];
    }

    private _fn_mid(value: string, start: number, count?: any): string {
        if (count === null || count === undefined) return value.substring(start);
        return value.substr(start, parseInt(count));
    }

    private _fn_join(value: any, delim: any): string {
        if (!Array.isArray(value)) return '';
        const delimiter = this._to_str(delim);
        return value.map(v => this._to_str(v)).join(delimiter);
    }

    private _fn_case_when(...args: any[]): any {
        if (args.length < 2) throw new ExpressionError("CaseWhen requires condition/value pairs");
        const hasDefault = args.length % 2 === 1;
        const limit = hasDefault ? args.length - 1 : args.length;

        for (let i = 0; i < limit; i += 2) {
            const condition = args[i];
            const value = args[i + 1];
            if (Boolean(condition)) return value;
        }

        return hasDefault ? args[args.length - 1] : null;
    }

    private _format_date(value: any, _fmt: any): string {
        if (!value) return '';
        // Basic implementation - for full python strftime support we'd need a heavier library or mapping
        // Just return ISO string for now if it is a date
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0]; // Simple YYYY-MM-DD fallback
        } catch {
            return '';
        }
    }
}
