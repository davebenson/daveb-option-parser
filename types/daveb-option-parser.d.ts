export type ValueTable = {[key:string]: any};

export class TypeInfo {
    constructor(name: string);
    name: string;
    defaultLabel: string;
    parse(value: string, values: ValueTable, argInfo: ArgInfo): any;
    requiresArg(): boolean;
}

export class TypeInfoEnum extends TypeInfo {
    constructor(name: string, values: string[]);
}

// Should throw exception if not satisfied.
export type ConstraintFunc = (value: any, argInfo: ArgInfo, typeInfo: TypeInfo) => undefined;

export class ArgInfo {
    constructor(name: string, type: TypeInfo, description: string, optionParser: any);
    name: string;
    type: TypeInfo;
    description: string;
    mandatory: boolean;
    repeated: boolean;
    tolerateRepeated: boolean;
    hidden: boolean;
    defaultValue: any;
    label: string;
    constraints: ConstraintFunc[];
    _shortCodes: string[];      // characters
    _exclusiveIndices: number[];
    _requiresArg: any;
    _optionParser: OptionParser;
    setMandatory(isM: boolean): this;
    setRepeated(isR: boolean): this;
    setHidden(isH: boolean): this;
    setTolerateRepeated(isR: boolean): this;
    setDefaultValue(v: boolean): this;
    setLabel(label: string): this;
    addConstraint(testFunc: ConstraintFunc): this;
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

export interface ModeInfo {
  name: string;
  parser: OptionParser;
}

export interface ExclusiveInfo {
  required: boolean;
  optionNames: string;
  argInfos: ArgInfo[];
}

interface ModeOptions extends OptionParserInitOptions {
  modeJavascriptName: string;
}

type OptionParserUpdater = (op: OptionParser) => undefined;

export class OptionParser {
    constructor(opts: OptionParserInitOptions)
    jnameToArgInfo: {[key: string]: ArgInfo};
    order: string[];
    types: {[key: string]: TypeInfo};
    modes: {[key: string]: ModeInfo};
    modeOrder: string[];
    shortDescription: string;
    description: string;
    shortCodes: {[key: string]: string};
    isWrapper: boolean;
    exclusives: ExclusiveInfo[];
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
    addMode(mode: string, modeOptions: ModeOptions, updater: OptionParserUpdater): void;
    setWrapper(isW: boolean): this;
    getUsage(options?: {}): string;
    errorHandler: (errorMessage: string, argInfo: ArgInfo) => void;
    parse(args?: string[]): {};
    arguments: any[];
    values: ValueTable;
    addShortAlias(code: string, alias: string): this;
    setExclusive(required: boolean, optionNames: string[]): this;
}
