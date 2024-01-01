/** @type {import('next').NextConfig} */
const obfuscatorOptions = {
	compact: true,
	controlFlowFlattening: false,
	controlFlowFlatteningThreshold: 0.75,
	deadCodeInjection: false,
	deadCodeInjectionThreshold: 0.4,
	debugProtection: false,
	debugProtectionInterval: 0,
	disableConsoleOutput: false,
	domainLock: [],
	domainLockRedirectUrl: 'about:blank',
	forceTransformStrings: [],
	identifierNamesCache: null,
	identifierNamesGenerator: 'hexadecimal',
	identifiersDictionary: [],
	identifiersPrefix: '',
	ignoreImports: true,//false,
	log: false,
	numbersToExpressions: false,
	optionsPreset: 'high-obfuscation',
	renameGlobals: true,//false,
	renameProperties: false,
	renamePropertiesMode: 'safe',
	reservedNames: [],
	reservedStrings: [],
	seed: 0,
	selfDefending: true,
	simplify: true,
	sourceMap: false,
	splitStrings: false,
	splitStringsChunkLength: 10,
	stringArray: true,
	stringArrayCallsTransform: true,
	stringArrayCallsTransformThreshold: 0.5,
	stringArrayEncoding: [],
	stringArrayIndexesType: ['hexadecimal-number'],
	stringArrayIndexShift: true,
	stringArrayRotate: true,
	stringArrayShuffle: true,
	stringArrayWrappersCount: 1,
	stringArrayWrappersChainedCalls: true,
	stringArrayWrappersParametersMaxCount: 2,
	stringArrayWrappersType: 'variable',
	stringArrayThreshold: 0.75,
	target: 'browser',
	transformObjectKeys: false,
	unicodeEscapeSequence: false,
};
const pluginOptions = {
	enabled: true,//"detect",
	patterns: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		// './components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',

	],
	obfuscateFiles: {
		buildManifest: true,
		ssgManifest: false,
		webpack: true,
		additionalModules: [],
	},
	log: true,
};
const withNextJsObfuscator = require('nextjs-obfuscator')(obfuscatorOptions, pluginOptions);

const nextConfig = withNextJsObfuscator({
	// ... your next.js configuration
	// output: 'export'
});
module.exports = nextConfig;
