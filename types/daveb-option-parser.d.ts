export type ValueTable = {[key:string]: any};

type UsagePrefixOfSuffix = string[] | string;

export class TypeInfo {
    constructor(name: string);
    name: string;
    defaultLabel: string;
    parse(value: string, values: ValueTable, argInfo: ArgInfo): any;
    requiresArg(): boolean;
}

type EnumValues = string[] | { [key: string]: string };
export class TypeInfoEnum extends TypeInfo {
    constructor(name: string, values: EnumValues);
    valueDescriptions?: { [key: string]: string; }
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


// These are all converted into instances of TypeInfo.
type PermitArgumentsElement = string | TypeInfo.class | TypeInfo;

// Default is false for the constructor,
// but if permitArguments() is called with no arguments, it is equivalent to true.
type PermitArgumentsOptions = true | false | PermitArgumentsElement | PermitArgumentsElement[];

type ErrorHandler = (errorMessage: string, argInfo: ArgInfo) => void;

export interface OptionParserInitOptions {
  camelCase: boolean;
  permitArguments: PermitArgumentsOptions;
  optionNameToJavascriptName: Function<string, string>;
  programName: string;
  errorHandler: ErrorHandler;
  usagePrefix?: UsagePrefixOfSuffix;
  usageSuffix?: UsagePrefixOfSuffix;
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
  permitArguments: PermitArgumentsOptions;
}

type OptionParserUpdater = (op: OptionParser) => undefined;

// PermitArgumentsOptions gets converted into PermitArguments.
// TODO: maybe 'true' should be typeInfoString and false should be [].
type PermitArguments = true | false | TypeInfo | TypeInfo[];

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
    permitArguments: PermitArguments;
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
    errorHandler: ErrorHandler;
    parse(args?: string[]): {};
    permitArguments(cfg: PermitArgumentsOptions?);
    arguments: any[];
    values: ValueTable;
    addShortAlias(code: string, alias: string): this;
    setExclusive(required: boolean, optionNames: string[]): this;
}
