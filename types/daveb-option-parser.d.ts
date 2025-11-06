export class TypeInfo {
    constructor(name: string);
    name: string;
    _defaultLabel: string;
    parse(value: string, values: any, argInfo: ArgInfo): any;
    requiresArg(): boolean;
}
export class ArgInfo {
    constructor(name: string, type: TypeInfo, description: string, optionParser: any);
    name: string;
    type: TypeInfo;
    description: string;
    _mandatory: boolean;
    _repeated: boolean;
    _tolerateRepeated: boolean;
    _hidden: boolean;
    _defaultValue: any;
    _label: string;
    _constraints: any[];
    _shortCodes: string[];
    _exclusiveIndices: any[];
    _requiresArg: any;
    _optionParser: OptionParser;
    setMandatory(isM: boolean): this;
    setRepeated(isR: boolean): this;
    setHidden(isH: boolean): this;
    setTolerateRepeated(isR: boolean): this;
    setDefaultValue(v: boolean): this;
    setLabel(label: string): this;
    _argPrototypeLabel: string;
    addConstraint(testFunc: any): this;
    setMinimum(minimumValue: number): this;
    setStrictMinimum(minimumValue: number): this;
    setMaximum(maximumValue: number): this;
    setStrictMaximum(maximumValue: number): this;
    setInterval(a: number, b: number): this;
    addShortCode(code: string): void;
}

export interface UsageOptions {
  width: number;
  optionMaxSize: number;
  optionDescriptionSep: number;
  showHidden: boolean;
  showNonhidden: boolean;
}

export interface OptionParserInitOptions {
  camelCase: boolean;
  permitArguments: boolean;
  optionNameToJavascriptName: Function<string, string>;
}

export class OptionParser {
    constructor(options?: {});
    jnameToArgInfo: {[key: string]: ArgInfo};
    order: any[];
    types: {};
    modes: {};
    modeOrder: string[];
    shortDescription: string;
    description: string;
    shortCodes: {};
    isWrapper: boolean;
    exclusives: any[];
    camelCase: boolean;
    permitArguments: boolean;
    optionNameToJavascriptName: Function<string, string>;
    addGeneric(name: string, type: any, description: string): ArgInfo;
    addString(name: string, description: string): ArgInfo;
    addInt(name: string, description: string): ArgInfo;
    addFlag(name: string, description: string): ArgInfo;
    addFloat(name: string, description: string): ArgInfo;
    addArgCallback(name: string, label: any, description: string, fct: any): ArgInfo;
    addNoArgCallback(name: string, description: string, fct: any): ArgInfo;
    addPreset(name: string, description: string, settings: any): ArgInfo;
    registerType(typeInfo: TypeInfo): any;
    addMode(mode: string, subOptionParser: OptionParser): void;
    setWrapper(isW: boolean): this;
    getUsage(options?: {}): string;
    errorHandler: (errorMessage: string, argInfo: ArgInfo) => void;
    parse(args?: any): {};
    arguments: any[];
    values: {};
    addShortAlias(code: string, alias: string): this;
    setExclusive(required: boolean, optionNames: string[]): this;
}
